'use client';
/* /complain — Complain & Feedback page, laid out like StarTech's complaint form, inside the normal site header and footer. A complaint is sent to the shop (admin: Website > Messages, subject "Complaint: …"). */
import { useState, type FormEvent } from 'react';
import { ApiError, sendContact } from '@/lib/api';
import { site } from '@/lib/data';

export default function ComplainClient() {
  const [ref, setRef] = useState<string | null>(null);   // set once the complaint is received
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget, d = new FormData(form), v = (k: string) => String(d.get(k) || '').trim();
    setBusy(true); setErr(''); setRef(null);
    try {
      const r = await sendContact({
        name: v('name'), phone: v('phone'), email: v('email'),
        subject: 'Complaint: ' + v('title'), message: v('description'),
        website: v('website'), // hidden trap field: a person leaves it empty, a bot fills it
      });
      setRef(r.data.id ? r.data.id.slice(0, 8).toUpperCase() : 'RECEIVED');
      form.reset();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : 'Could not send your complaint. Please try again, or call us on ' + site.hotline + '.');
    } finally { setBusy(false); }
  };
  return (
    <section className="complain-form">
      <form className="form-complain" onSubmit={submit}>
        <div className="cf-full cf-center">
          <div className="complain-header"><h1>Complain &amp; Feedback</h1></div>
          <div className="complain-blurb"><p>Please fill out the following form with details <br />We will review your request and follow up with you as soon as possible.</p></div>
          <hr />
        </div>
        <div className="form-group">
          <label htmlFor="input-name">Full Name<small>*</small></label>
          <input id="input-name" name="name" className="form-control" maxLength={100} required placeholder="Type Your Full Name." />
        </div>
        <div className="form-group">
          <label htmlFor="input-phone">Phone No.<small>*</small></label>
          <input id="input-phone" name="phone" className="form-control" maxLength={100} required inputMode="tel" pattern="[0-9+\-\s]{6,}" placeholder="Type Your Mobile No." />
        </div>
        <div className="form-group cf-full">
          <label htmlFor="input-email">Email Address</label>
          <input id="input-email" name="email" type="email" className="form-control" maxLength={100} placeholder="Type Your Email Address." />
        </div>
        <div className="form-group cf-full">
          <label htmlFor="input-title">Subject<small>*</small></label>
          <input id="input-title" name="title" className="form-control" maxLength={150} required placeholder="Type Your Problem Subject" />
        </div>
        <div className="form-group cf-full">
          <label htmlFor="input-description">Details<small>*</small></label>
          <textarea id="input-description" name="description" className="form-control" maxLength={500} required placeholder="Write Your Problem In Details." />
        </div>
        <div className="form-group cf-full">
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
          {ref && <p className="complain-ok" role="status">Thank you! Your complaint has been received{ref !== 'RECEIVED' ? <> (reference <b>#{ref}</b>)</> : null}. We will follow up with you as soon as possible.</p>}
          {err && <p role="alert" style={{ color: '#dc2626', margin: '0 0 10px' }}>{err}</p>}
          <input type="submit" className="btn-complain" value={busy ? 'Sending…' : 'Submit Your Request'} disabled={busy} />
        </div>
</form>
    </section>
  );
}
