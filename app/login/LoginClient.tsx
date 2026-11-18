'use client';
import Link from 'next/link';
import { afterAuth } from '@/lib/next-url';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Crumb, Icon } from '@/components/ui';
import { useStore } from '@/components/store';
import { ApiError, login, requestOtp, verifyOtp } from '@/lib/api';

const MOBILE_RE = /^01[3-9]\d{8}$/;

export default function LoginClient() {
  const { toast, signIn } = useStore();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const [mode, setMode] = useState<'pw' | 'otp'>('pw');
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [secs, setSecs] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  // resend countdown
  useEffect(() => {
    if (!sent || secs <= 0) return;
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sent, secs]);

  // keep the page the visitor came from when they go to Create Your Account
  const [nextQ, setNextQ] = useState('');
  useEffect(() => { const n = new URLSearchParams(location.search).get('next'); if (n) setNextQ('?next=' + encodeURIComponent(n)); }, []);
  const done = () => { toast('Login successful', 'checkCircle'); setTimeout(() => router.push(afterAuth()), 700); };

  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.', 'alert');

  const sendOtp = async () => {
    const ph = phone.trim();
    if (!MOBILE_RE.test(ph)) { toast('Enter a valid 11-digit number', 'alert'); return; }
    try {
      const r = await requestOtp(ph);
      setSent(true); setOtp(['', '', '', '', '', '']); setSecs(60);
      if (r.development_otp) toast('Test mode — your OTP is ' + r.development_otp, 'info');
      setTimeout(() => boxes.current[0]?.focus(), 0);
    } catch (e) { fail(e); }
  };

  const onOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!sent) return sendOtp();
    const code = otp.join('');
    if (code.length !== 6 && code.length !== 4) return toast('Enter the OTP', 'alert');
    try { signIn(await verifyOtp(phone.trim(), code)); done(); } catch (er) { fail(er); }
  };

  const onPwSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const el = e.currentTarget.elements;
    const id = (el.namedItem('u') as HTMLInputElement).value.trim(), pw = (el.namedItem('pw') as HTMLInputElement).value;
    setBusy(true);
    try { signIn(await login(id, pw)); done(); } catch (er) { fail(er); } finally { setBusy(false); }
  };

  const onDigit = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, '').slice(-1);
    setOtp(o => o.map((x, k) => (k === i ? v : x)));
    if (v && i < 5) boxes.current[i + 1]?.focus();
  };
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) boxes.current[i - 1]?.focus();
  };

  return (
    <>
      <Crumb items={[['Account', '/account'], ['Login']]} />
      <div className="wrap">
        <div className="auth">
          <h1>Account Login</h1>
          <div className="auth-switch" style={{ marginBottom: 18 }}>
            <button className={mode === 'pw' ? 'on' : ''} onClick={() => setMode('pw')}>Password Login</button>
            <button className={mode === 'otp' ? 'on' : ''} onClick={() => setMode('otp')}>Login with OTP</button>
          </div>

          <form hidden={mode !== 'pw'} onSubmit={onPwSubmit}>
            <div className="field"><label htmlFor="u">Phone / E-Mail</label><input className="input" id="u" required placeholder="Phone or E-Mail" autoComplete="username" /></div>
            <div className="field">
              <div className="lbl-row"><label htmlFor="pw" className="label">Password</label><a href="#" onClick={e => { e.preventDefault(); setMode('otp'); toast('Login with OTP, then set a new password', 'info'); }}>Forgotten Password?</a></div>
              <div className="ig"><input className="input" id="pw" type={showPw ? 'text' : 'password'} required placeholder="Password" autoComplete="current-password" /><button type="button" className="eye" aria-label="Show password" onClick={() => setShowPw(s => !s)}><Icon name="eye" size={17} /></button></div>
            </div>
            <label className="check"><input type="checkbox" defaultChecked />Remember me</label>
            <button className="btn btn-brand btn-block" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Login'}</button>
          </form>

          <form hidden={mode !== 'otp'} onSubmit={onOtpSubmit}>
            <div hidden={sent} className="field"><label htmlFor="op">Phone Number</label><input className="input" id="op" inputMode="tel" placeholder="01XXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} /><span className="hint">We will send a 6-digit OTP to this number</span></div>
            <div hidden={!sent} className="field">
              <div className="lbl-row"><span className="label">Enter OTP</span><span className="sm muted">Sent to <b>{phone.trim()}</b></span></div>
              <div className="otp">
                {otp.map((v, i) => (
                  <input key={i} ref={el => { boxes.current[i] = el; }} maxLength={1} inputMode="numeric" aria-label="OTP digit" value={v}
                    onChange={e => onDigit(i, e.target.value)} onKeyDown={e => onKey(i, e)} />
                ))}
              </div>
              <div className="lbl-row sm" style={{ marginTop: 6 }}>
                <span className="muted">{secs > 0 ? 'Resend OTP in ' + secs + 's' : sent ? <a href="#" onClick={e => { e.preventDefault(); sendOtp(); }}>Resend OTP</a> : null}</span>
                <a href="#" onClick={e => { e.preventDefault(); setSent(false); setSecs(0); }}>Change number</a>
              </div>
            </div>
            <button className="btn btn-brand btn-block" type="submit">{sent ? 'Verify & Login' : 'Send OTP'}</button>
          </form>

          <div className="or">Don’t have an account?</div>
          <Link className="btn btn-line-brand btn-block" href={'/register' + nextQ}>Create Your Account</Link>
        </div>
      </div>
    </>
  );
}
