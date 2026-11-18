'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Icon, ProductImg, BuyButton, Crumb } from '@/components/ui';
import { useStore } from '@/components/store';
import { blog, byId, catBySlug, type Product } from '@/lib/data';
import { HUES } from '@/lib/svg';
import { money, initials, productUrl, blogUrl } from '@/lib/format';
import { ApiError, blogComments, postBlogComment, type BlogComment } from '@/lib/api';
import type { Article, Share } from '@/lib/blog';
import { BlogPic } from '../PostCard';

function InlineProd({ id }: { id: string }) {
  const p = byId(id);
  if (!p) return null;
  return (
    <div className="inline-prod">
      <Link className="ipi" href={productUrl(p.id)}><ProductImg p={p} size={76} /></Link>
      <div className="ipn"><Link href={productUrl(p.id)}>{p.name}</Link><div className="pc-price"><b>{money(p.price)}</b>{p.old && <s>{money(p.old)}</s>}</div></div>
      <BuyButton p={p} />
    </div>
  );
}

/** "2 days ago" from the API's UTC time */
function ago(iso: string): string {
  const t = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z');
  if (!t) return '';
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
  const h = Math.round(m / 60);
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const d = Math.round(h / 24);
  if (d < 31) return d + (d === 1 ? ' day ago' : ' days ago');
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

/* Comments: visitors write them here, the admin approves them in Website > Blog > Comments (a comment the admin answered shows under it). */
function Comments({ slug }: { slug: string }) {
  const { toast } = useStore();
  const [list, setList] = useState<BlogComment[]>([]);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { blogComments(slug).then(r => { setList(r.data); setOpen(r.meta.comments_enabled); }).catch(() => { /* keep what is shown */ }); }, [slug]);
  useEffect(() => { load(); }, [load]);

  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget, d = new FormData(form), v = (k: string) => String(d.get(k) || '').trim();
    setBusy(true);
    try {
      const r = await postBlogComment(slug, { author_name: v('name'), author_email: v('email'), body: v('msg'), website: v('website') });
      toast(r.meta.awaiting_moderation ? 'Comment submitted for review' : 'Comment posted', 'chat');
      form.reset();
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not send your comment. Please try again.', 'alert');
    } finally { setBusy(false); }
  };

  if (!open) return null;
  const top = list.filter(c => !c.parent_id);
  const row = (c: BlogComment, child: boolean) => (
    <div key={c.id} className={'comment' + (child ? ' child' : '')}>
      <span className="av" style={c.staff ? { background: 'var(--brand)', color: '#fff' } : undefined}>{initials(c.author_name)}</span>
      <div><b>{c.author_name}</b>{c.staff && <> <span className="tag">Author</span></>}<span className="d">{ago(c.created_at)}</span><p>{c.body}</p></div>
    </div>
  );
  return (
    <section className="box" style={{ marginTop: 18 }}><h3>Comments ({list.length})</h3>
      {top.map(c => [row(c, false), ...list.filter(x => x.parent_id === c.id).map(x => row(x, true))])}
      <form className="form-grid" id="cf" style={{ marginTop: 18 }} onSubmit={send}>
        <div className="field"><label htmlFor="cf-name">Name</label><input id="cf-name" name="name" className="input" required /></div>
        <div className="field"><label htmlFor="cf-email">Email</label><input id="cf-email" name="email" className="input" type="email" required /></div>
        <div className="field full"><label htmlFor="cf-msg">Comment</label><textarea id="cf-msg" name="msg" className="textarea" required /></div>
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
        <div className="full"><button className="btn btn-brand" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Post Comment'}</button></div>
      </form>
    </section>
  );
}

/* The article: its body, the product boxes in it and the "products in this article" list are written in the admin (Website > Blog). */
export default function ArticleClient({ id, article, products, author, share }: { id: string; article: Article; products: string[]; author: string; share: Share }) {
  const { toast } = useStore();
  const b = blog.find(x => x.id === id) || blog[0];
  const [activeH, setActiveH] = useState<string | null>(null);
  /* the article's own address, for the share buttons (known only in the browser) */
  const [url, setUrl] = useState('');
  useEffect(() => { setUrl(location.origin + location.pathname); }, []);
  const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
  const waUrl = 'https://wa.me/?text=' + encodeURIComponent(b.title + ' ' + url);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActiveH(e.target.id); }), { rootMargin: '-30% 0px -60% 0px' });
    article.toc.forEach(([hid]) => { const el = document.getElementById(hid); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [article]);

  const prods = products.map(byId).filter((p): p is Product => !!p);

  return (
    <>
      <Crumb items={[['Blog', '/blog'], [b.cat, '/blog'], [b.title.split(' ').slice(0, 5).join(' ') + '…']]} />
      <div className="wrap art-wrap" style={{ marginTop: 20 }}>
        <div>
          <article className="article">
            <div className="cover" id="cover" style={{ background: 'linear-gradient(135deg,' + HUES[b.hue].s + ',#fff)' }}><BlogPic b={b} size={300} artSize={240} eager /></div>
            <div className="ab">
              <span className="tag" id="cat">{b.cat}</span>
              <h1 id="title">{b.title}</h1>
              <div className="row-between" style={{ paddingBottom: 16, borderBottom: '1px solid var(--line-2)', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="av" id="av">{initials(author)}</span><div><b style={{ color: 'var(--ink)' }} id="author">{author}</b><div className="sm muted" id="meta">{b.date} · {b.read} Min. Read</div></div></div>
                {(share.facebook || share.whatsapp || share.copy) && <div className="social" style={{ gap: 6 }}>
                  {share.facebook && <a href={url ? fbUrl : '#'} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" title="Share on Facebook"><Icon name="facebook" size={15} /></a>}
                  {share.whatsapp && <a href={url ? waUrl : '#'} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" title="Share on WhatsApp"><Icon name="whatsapp" size={15} /></a>}
                  {share.copy && <a href="#" id="cp" aria-label="Copy link" title="Copy link" onClick={e => { e.preventDefault(); try { void navigator.clipboard.writeText(url || location.href); } catch { /* ignore */ } toast('Link copied', 'copy'); }}><Icon name="copy" size={15} /></a>}
                </div>}
              </div>
              <div className="prose" id="body">
                {article.parts.map((p, i) => 'html' in p ? <div key={i} dangerouslySetInnerHTML={{ __html: p.html }} /> : <InlineProd key={i} id={p.product} />)}
              </div>
            </div>
          </article>
          <Comments slug={b.id} />
        </div>
        <aside>
          {article.toc.length > 0 && <div className="side-w toc"><h4>Table of Contents</h4><nav id="toc">{article.toc.map(([hid, t]) => <a key={hid} href={'#' + hid} className={activeH === hid ? 'on' : undefined}>{t}</a>)}</nav></div>}
          {prods.length > 0 && <div className="side-w"><h4>Products in this Article</h4><div id="prods">
            {prods.map(p => (
              <div className="sim" key={p.id}>
                <Link className="si" href={productUrl(p.id)}><ProductImg p={p} size={56} /></Link>
                <div><span className="pc-brand">{catBySlug(p.cat)?.name}</span><Link className="n" href={productUrl(p.id)}>{p.name.split(' ').slice(0, 6).join(' ')}</Link><b>{money(p.price)}</b></div>
              </div>
            ))}
          </div></div>}
          <div className="side-w"><h4>Related Articles</h4><div id="rel">
            {blog.filter(x => x.id !== b.id).slice(0, 4).map(x => (
              <Link key={x.id} className="sim" href={blogUrl(x.id)} style={{ color: 'var(--ink)' }}>
                <span className="si" style={{ background: HUES[x.hue].s, borderRadius: 8 }}><BlogPic b={x} size={56} artSize={50} /></span>
                <span><span className="n" style={{ display: 'block', fontSize: 13.5, lineHeight: 1.4 }}>{x.title}</span><span className="sm muted">{x.date}</span></span>
              </Link>
            ))}
          </div></div>
        </aside>
      </div>
    </>
  );
}
