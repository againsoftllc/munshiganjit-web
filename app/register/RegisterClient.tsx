'use client';
import Link from 'next/link';
import { afterAuth } from '@/lib/next-url';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Crumb, Icon } from '@/components/ui';
import { useStore } from '@/components/store';
import { ApiError, register } from '@/lib/api';

const MOBILE_RE = /^01[3-9]\d{8}$/;
const HINTS = ['Use 8+ characters with a number', 'Weak', 'Fair', 'Good', 'Strong password'];

const strength = (v: string) => {
  let s = 0;
  if (v.length >= 8) s++;
  if (/\d/.test(v)) s++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return v ? Math.max(1, s) : 0;
};

export default function RegisterClient() {
  const { toast, signIn } = useStore();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const s = strength(pw);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!MOBILE_RE.test(phone.trim())) { toast('Enter a valid phone number', 'alert'); return; }
    const el = e.currentTarget.elements, v = (id: string) => ((el.namedItem(id) as HTMLInputElement | null)?.value || '').trim();
    const name = [v('fn'), v('ln')].filter(Boolean).join(' ');
    setBusy(true);
    try {
      signIn(await register(name, phone.trim(), v('em') || null, pw));
      toast('Account created! Welcome to Munshiganj IT.', 'checkCircle');
      setTimeout(() => router.push(afterAuth()), 900);
    } catch (er) {
      toast(er instanceof ApiError ? er.message : 'Could not create the account. Please try again.', 'alert');
    } finally { setBusy(false); }
  };

  return (
    <>
      <Crumb items={[['Account', '/account'], ['Register']]} />
      <div className="wrap">
        <div className="auth" style={{ maxWidth: 480 }}>
          <h1>Register Account</h1>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="field"><label htmlFor="fn">First Name <span className="req">*</span></label><input className="input" id="fn" required placeholder="First Name" /></div>
              <div className="field"><label htmlFor="ln">Last Name</label><input className="input" id="ln" placeholder="Last Name" /></div>
            </div>
            <div className="field"><label htmlFor="ph">Phone <span className="req">*</span></label><input className="input" id="ph" required inputMode="tel" placeholder="01XXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} /><span className="hint">An OTP will be sent to verify this number</span></div>
            <div className="field"><label htmlFor="em">E-Mail</label><input className="input" id="em" type="email" placeholder="E-Mail" /></div>
            <div className="field"><label htmlFor="pw">Password <span className="req">*</span></label>
              <div className="ig"><input className="input" id="pw" type={showPw ? 'text' : 'password'} required minLength={8} placeholder="Password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /><button type="button" className="eye" aria-label="Show" onClick={() => setShowPw(v => !v)}><Icon name="eye" size={17} /></button></div>
              <div className="pw-meter" data-s={s}><i /><i /><i /><i /></div>
              <span className="hint">{HINTS[s]}</span>
            </div>
            <label className="check" style={{ alignItems: 'flex-start' }}><input type="checkbox" required /><span className="sm">I have read and agree to the <Link href="/policy#privacy">Privacy Policy</Link> and <Link href="/policy#terms">Terms &amp; Conditions</Link></span></label>
            <button className="btn btn-brand btn-block" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Continue'}</button>
          </form>
          <div className="or">Already have an account?</div>
          <Link className="btn btn-line-brand btn-block" href="/login">Login</Link>
        </div>
      </div>
    </>
  );
}
