'use client';
/* Live chat (replaces the WhatsApp bubble). Every agent is listed at the top of the window with an Online / Offline dot and the
   customer picks who to talk to. The agents, their hours, the greeting, the automatic answers and the quick questions all come from
   the admin (Website > Chat); the messages are real: they reach the admin's Inbox and the admin's replies come back here.
   A visitor needs no account: the first time they give a name and a phone number, the server answers with a secret key that this
   browser keeps, and every later call carries it. An offline agent (or no agent) is answered by the automatic assistant.
   Every agent has a chat box of their own: switching agent shows that agent's conversation (the other agents never see it).
   Besides text: pictures / files, a voice message, a product from the shop, emoji reactions, replying to a message and read ticks. */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { visibleProducts } from '@/lib/data';
import { money } from '@/lib/format';
import { API } from '@/lib/api';
import { Icon } from './ui';
import { fixedImg } from '@/lib/img';

type Agent = { id: string; name: string; role: string; photo: string; online: boolean };
type Cfg = { enabled: boolean; agents: Agent[]; hotline: string; greeting_online: string; greeting_offline: string; greeting_none: string; quick_replies: string[] };
type Snap = { name: string; image: string; priceNew: number; priceOld: number; discountPct: number; href?: string | null };
type Msg = {
  id: string; sender: 'customer' | 'admin'; type: string; text: string; time: string; read: boolean; reaction?: string | null; by?: string | null;
  product_snapshot?: Snap | null; file_name?: string | null; file_url?: string | null; file_mime?: string | null; file_size?: number | null; file_kind?: string | null;
  reply_to?: { id: string; sender: string; type: string; text: string; file_kind?: string | null } | null;
};

const KEY = 'nt2_chat_key', PICK = 'nt2_chat_agent', WHO = 'nt2_chat_who';
const MAX_FILE = 1.5 * 1024 * 1024;
const EMOJI = ['👍', '❤️', '😂', '😮', '🙏'];
const BASE = '/api/v1/storefront/chat';

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* private mode */ } },
};

/* a picture an admin uploaded lives on the API; the old fixed photos live on this site */
const src = (u: string) => (u && u.startsWith('/uploads') ? API + u : u);
const clock = (iso: string) => { const d = new Date(/Z|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z'); return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' }); };
const fill = (t: string, agent?: string) => t.replace('{agent}', agent || '');
const preview = (m: { type: string; text: string; file_kind?: string | null }) => m.type === 'product' ? 'Product: ' + m.text : m.type === 'file' ? (m.file_kind === 'audio' ? 'Voice message' : m.file_kind === 'image' ? 'Photo' : 'File') : m.text;
const fileKind = (mime: string) => mime.startsWith('image/') ? 'image' : mime.startsWith('audio/') ? 'audio' : mime.startsWith('video/') ? 'video' : 'document';
const toData = (blob: Blob) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsDataURL(blob); });

async function call(path: string, init: { method?: string; body?: unknown; key?: string | null } = {}) {
  const res = await fetch(API + BASE + path, {
    method: init.method || 'GET', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(init.key ? { 'X-Chat-Key': init.key } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error((data && (typeof data.detail === 'string' ? data.detail : '')) || 'Something went wrong — please try again.'), { status: res.status });
  return data;
}

export default function LiveChat() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [pickId, setPickId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [who, setWho] = useState({ name: '', phone: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [act, setAct] = useState<string | null>(null);
  const [shop, setShop] = useState(false);
  const [q, setQ] = useState('');
  const [rec, setRec] = useState<{ secs: number } | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const recorder = useRef<{ mr: MediaRecorder; chunks: Blob[]; timer: number; cancel: boolean } | null>(null);

  const agents = cfg?.agents ?? [];
  const agent = agents.find(a => a.id === pickId) ?? agents.find(a => a.online) ?? agents[0];
  const live = !!agent?.online;
  const aq = agent ? '?agent_id=' + agent.id : ''; // every call names the agent whose chat box this is
  const [unreadBy, setUnreadBy] = useState<Record<string, number>>({});

  /* what was kept in this browser */
  useEffect(() => {
    setKey(store.get(KEY)); setPickId(store.get(PICK));
    try { const w = JSON.parse(store.get(WHO) || 'null'); if (w) setWho({ name: w.name || '', phone: w.phone || '' }); } catch { /* ignore */ }
  }, []);

  /* the agents, their Online / Offline dots and the texts: from the admin, refreshed every minute */
  useEffect(() => {
    let stop = false;
    const load = () => call('/config').then(d => { if (!stop) setCfg(d.data); }).catch(() => undefined);
    load(); const t = setInterval(load, 60000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  /* the conversation: asked often while the window is open, now and then while it is closed (for the unread dot) */
  const agentId = agent?.id;
  const pull = useCallback(async () => {
    if (!key) return;
    try {
      const d = await call('' + (agentId ? '?agent_id=' + agentId : ''), { key });
      setMsgs(d.data ? d.data.messages : []);
      setUnreadBy((await call('/unread', { key })).data);
    } catch (e) { if ((e as { status?: number }).status === 401) { store.del(KEY); setKey(null); setMsgs([]); setUnreadBy({}); } }
  }, [key, agentId]);
  useEffect(() => { setMsgs([]); setReplyTo(null); setAct(null); }, [agentId]); // another agent: that agent's chat box
  useEffect(() => {
    if (!key) return;
    pull(); const t = setInterval(pull, open ? 4000 : 25000);
    return () => clearInterval(t);
  }, [key, open, pull]);

  const unread = Object.values(unreadBy).reduce((a, b) => a + b, 0);
  const unreadHere = msgs.filter(m => m.sender === 'admin' && !m.read).length;
  useEffect(() => {
    if (open && key && unreadHere) call('/read' + (agentId ? '?agent_id=' + agentId : ''), { method: 'POST', key }).then(d => { if (d.data) setMsgs(d.data.messages); }).catch(() => undefined);
  }, [open, key, unreadHere, agentId]);
  const recording = rec !== null;
  useEffect(() => { body.current?.scrollTo({ top: body.current.scrollHeight }); }, [msgs.length, open, shop, recording]);

  const take = (d: { data: { messages: Msg[] } | null }) => setMsgs(d.data ? d.data.messages : []);
  const fail = (e: unknown) => setErr(e instanceof Error ? e.message : 'Something went wrong.');

  const choose = (id: string) => {
    if (agent && id === agent.id) return;
    setPickId(id); store.set(PICK, id);
  };

  const start = async (e: FormEvent) => {
    e.preventDefault(); setErr('');
    if (!who.name.trim() || who.phone.replace(/\D/g, '').length < 6) { setErr('Please enter your name and phone number.'); return; }
    setBusy(true);
    try {
      const d = await call('/start', { method: 'POST', body: { name: who.name.trim(), phone: who.phone.trim(), agent_id: agent?.id } });
      store.set(KEY, d.key); store.set(WHO, JSON.stringify(who)); setKey(d.key); take(d);
    } catch (x) { fail(x); } finally { setBusy(false); }
  };

  const post = async (payload: Record<string, unknown>) => {
    if (!key) return;
    setErr(''); setBusy(true);
    try {
      take(await call('/messages' + aq, { method: 'POST', key, body: { ...payload, ...(replyTo ? { reply_to_id: replyTo.id } : {}) } }));
      setReplyTo(null);
    } catch (x) {
      if ((x as { status?: number }).status === 401) { store.del(KEY); setKey(null); setMsgs([]); }
      fail(x);
    } finally { setBusy(false); }
  };

  const send = (e: FormEvent) => { e.preventDefault(); const t = text.trim(); if (!t || busy) return; setText(''); void post({ text: t }); };

  const attach = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE) { setErr('That file is too big — 1.5 MB at most.'); return; }
    const mime = f.type || 'application/octet-stream';
    void post({ type: 'file', text: f.name, file_name: f.name, file_url: await toData(f), file_mime: mime, file_size: f.size, file_kind: fileKind(mime) });
  };

  const shareProduct = (p: (typeof visibleProducts)[number]) => {
    setShop(false); setQ('');
    const off = p.old && p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0;
    void post({ type: 'product', text: p.name, product_id: p.uid, product_snapshot: { name: p.name, image: p.image || '', priceNew: p.price, priceOld: p.old && p.old > p.price ? p.old : p.price, discountPct: off, href: '/product/' + p.id } });
  };
  const found = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n.length < 2 ? [] : visibleProducts.filter(p => (p.name + ' ' + p.brand + ' ' + p.model).toLowerCase().includes(n)).slice(0, 6);
  }, [q]);

  /* a voice message: recorded here, sent as a small audio file */
  const record = async () => {
    setErr('');
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) { setErr('Voice messages are not supported on this browser.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { audioBitsPerSecond: 24000 });
      const state = { mr, chunks: [] as Blob[], timer: 0, cancel: false };
      mr.ondataavailable = ev => { if (ev.data.size) state.chunks.push(ev.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); clearInterval(state.timer); setRec(null); recorder.current = null;
        if (state.cancel || !state.chunks.length) return;
        const blob = new Blob(state.chunks, { type: mr.mimeType || 'audio/webm' });
        if (blob.size > MAX_FILE) { setErr('That voice message is too long — keep it under a minute.'); return; }
        void post({ type: 'file', text: 'Voice message', file_name: 'voice-message.webm', file_url: await toData(blob), file_mime: blob.type, file_size: blob.size, file_kind: 'audio' });
      };
      mr.start(); recorder.current = state; setRec({ secs: 0 });
      state.timer = window.setInterval(() => setRec(r => { if (r && r.secs >= 59) mr.stop(); return r ? { secs: r.secs + 1 } : r; }), 1000);
    } catch { setErr('Please allow the microphone to send a voice message.'); }
  };
  const stopRec = (cancel: boolean) => { const r = recorder.current; if (!r) return; r.cancel = cancel; r.mr.stop(); };
  useEffect(() => () => { const r = recorder.current; if (r) { r.cancel = true; try { r.mr.stop(); } catch { /* already stopped */ } } }, []);

  const react = (m: Msg, emoji: string) => {
    if (!key) return;
    setAct(null);
    call('/messages/' + m.id + '/reaction' + aq, { method: 'PUT', key, body: { emoji: m.reaction === emoji ? null : emoji } }).then(take).catch(fail);
  };

  // nothing is shown until the admin's settings have arrived: no built-in agents, texts or numbers
  if (!cfg || !cfg.enabled) return null;

  const hotline = cfg.hotline;
  const greet = live ? fill(cfg.greeting_online, agent?.name)
    : agent ? fill(cfg.greeting_offline, agent.name) : cfg.greeting_none;

  const bubble = (m: Msg) => {
    const mine = m.sender === 'customer';
    return (
      <div key={m.id} className={'lc-row ' + (mine ? 'me' : 'agent') + (act === m.id ? ' act' : '')}>
        <div className={'lc-msg ' + (mine ? 'me' : m.by === 'bot' ? 'bot' : 'agent')} onClick={() => setAct(a => (a === m.id ? null : m.id))}>
          {m.by === 'bot' && <em className="lc-by">Assistant</em>}
          {m.reply_to && <div className="lc-quote"><b>{m.reply_to.sender === 'customer' ? 'You' : 'Agent'}</b>{preview(m.reply_to)}</div>}
          {m.type === 'product' && m.product_snapshot ? (
            <Link className="lc-prod" href={m.product_snapshot.href || '#'} onClick={e => e.stopPropagation()}>
              {m.product_snapshot.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={src(m.product_snapshot.image)} alt="" width={52} height={52} />}
              <span><b>{m.product_snapshot.name}</b><i>{money(m.product_snapshot.priceNew)}{m.product_snapshot.discountPct > 0 && <s>{money(m.product_snapshot.priceOld)}</s>}</i></span>
            </Link>
          ) : m.type === 'file' && m.file_url ? (
            m.file_kind === 'image' ? /* eslint-disable-next-line @next/next/no-img-element */ <a href={m.file_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}><img className="lc-pic" src={m.file_url} alt={m.file_name || 'Photo'} /></a>
            : m.file_kind === 'audio' ? <audio className="lc-audio" controls src={m.file_url} onClick={e => e.stopPropagation()} />
            : <a className="lc-file" href={m.file_url} download={m.file_name || 'file'} onClick={e => e.stopPropagation()}><Icon name="invoice" size={18} /><span>{m.file_name || 'File'}</span></a>
          ) : m.text}
          <small>{clock(m.time)}{mine && <span className={'lc-tick' + (m.read ? ' read' : '')} title={m.read ? 'Seen' : 'Sent'}>{m.read ? '✓✓' : '✓'}</span>}</small>
          {m.reaction && <span className="lc-react">{m.reaction}</span>}
        </div>
        {act === m.id && (
          <div className="lc-acts">
            {EMOJI.map(em => <button key={em} type="button" onClick={() => react(m, em)} aria-label={'React ' + em}>{em}</button>)}
            <button type="button" className="rep" onClick={() => { setReplyTo(m); setAct(null); }}>Reply</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={'lc' + (open ? ' open' : '')}>
      <div className="lc-panel" role="dialog" aria-label="Live chat">
        <div className="lc-head">
          {agent
            // eslint-disable-next-line @next/next/no-img-element
            ? <img className="lc-av" {...fixedImg(src(agent.photo), 44)} alt={agent.name} width={44} height={44} />
            : <span className="lc-av bot"><Icon name="support" size={22} /></span>}
          <div><b>{agent ? agent.name : 'Munshiganj IT Assistant'}</b><span><i className={live ? 'on' : ''} />{agent ? agent.role + (live ? ' · Online' : ' · Offline, automated replies') : 'Automated replies'}</span></div>
          <button onClick={() => setOpen(false)} aria-label="Close chat"><Icon name="close" size={18} /></button>
        </div>
        {agents.length > 1 && (
          <div className="lc-agents" role="group" aria-label="Choose who to chat with">
            <small>Chat with</small>
            {agents.map(a => (
              <button key={a.id} type="button" className={'lc-ag' + (agent && a.id === agent.id ? ' on' : '')} onClick={() => choose(a.id)} aria-pressed={!!agent && a.id === agent.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src(a.photo)} alt="" width={30} height={30} />
                <span><b>{a.name}</b><em className={a.online ? 'on' : ''}>{a.online ? 'Online' : 'Offline'}</em></span>
                {!!unreadBy[a.id] && (!agent || a.id !== agent.id) && <i className="lc-ag-dot">{unreadBy[a.id]}</i>}
              </button>
            ))}
          </div>
        )}
        <div className="lc-body" ref={body}>
          {greet && <div className="lc-msg agent">{greet}</div>}
          {!key && <div className="lc-msg sys">Tell us who you are, then write your message.</div>}
          {key && msgs.length === 0 && cfg.quick_replies.length > 0 && (
            <div className="lc-quick">{cfg.quick_replies.map(t => <button key={t} type="button" disabled={busy} onClick={() => void post({ text: t })}>{t}</button>)}</div>
          )}
          {msgs.map(bubble)}
        </div>
        {err && <div className="lc-err" role="alert">{err}</div>}
        {!key ? (
          <form className="lc-who" onSubmit={start}>
            <input value={who.name} onChange={e => setWho({ ...who, name: e.target.value })} placeholder="Your name" aria-label="Your name" autoComplete="name" maxLength={80} />
            <input value={who.phone} onChange={e => setWho({ ...who, phone: e.target.value })} placeholder="Phone number (e.g. 01XXXXXXXXX)" aria-label="Phone number" autoComplete="tel" inputMode="tel" maxLength={20} />
            <button type="submit" className="btn btn-brand" disabled={busy}>{busy ? 'Starting…' : 'Start chat'}</button>
            {hotline && <small>Or call {hotline}</small>}
          </form>
        ) : (
          <>
            {replyTo && <div className="lc-replying"><div><b>Replying to {replyTo.sender === 'customer' ? 'yourself' : 'agent'}</b>{preview(replyTo)}</div><button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><Icon name="close" size={14} /></button></div>}
            {shop && (
              <div className="lc-shop">
                <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search a product to share…" aria-label="Search a product" />
                {found.map(p => (
                  <button key={p.id} type="button" onClick={() => shareProduct(p)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image ? <img src={p.image} alt="" width={34} height={34} /> : <i />}<span>{p.name}</span><b>{money(p.price)}</b>
                  </button>
                ))}
                {q.trim().length >= 2 && !found.length && <p>No product found.</p>}
              </div>
            )}
            {rec ? (
              <div className="lc-rec"><i /><span>Recording… {Math.floor(rec.secs / 60)}:{String(rec.secs % 60).padStart(2, '0')}</span>
                <button type="button" onClick={() => stopRec(true)}>Cancel</button><button type="button" className="go" onClick={() => stopRec(false)} aria-label="Send voice message"><Icon name="arrow" size={18} /></button></div>
            ) : (
              <form className="lc-form" onSubmit={send}>
                <button type="button" className="lc-tool" onClick={() => file.current?.click()} aria-label="Send a photo or file" title="Photo / file"><Icon name="upload" size={18} /></button>
                <button type="button" className={'lc-tool' + (shop ? ' on' : '')} onClick={() => setShop(s => !s)} aria-label="Share a product" title="Share a product"><Icon name="box" size={18} /></button>
                <input value={text} onChange={e => setText(e.target.value)} placeholder="Type your message…" aria-label="Message" maxLength={2000} />
                {text.trim() ? <button type="submit" aria-label="Send" disabled={busy}><Icon name="arrow" size={18} /></button>
                  : <button type="button" onClick={record} aria-label="Record a voice message" title="Voice message"><Icon name="mic" size={18} /></button>}
                <input ref={file} type="file" hidden accept="image/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={e => { void attach(e.target.files?.[0]); e.target.value = ''; }} />
              </form>
            )}
          </>
        )}
      </div>
      <button className="lc-btn" aria-label={agent ? 'Chat with ' + agent.name : 'Chat with us'} onClick={() => setOpen(o => !o)}>
        {agent
          // eslint-disable-next-line @next/next/no-img-element
          ? <img {...fixedImg(src(agent.photo), 56)} alt="" width={56} height={56} />
          : <Icon name="chat" size={26} />}
        {live && <i className="lc-dot" aria-hidden="true" />}
        {!open && unread > 0 && <span className="lc-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
    </div>
  );
}
