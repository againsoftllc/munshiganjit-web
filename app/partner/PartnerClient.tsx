'use client';
/* /partner — the partner side of the customer account: sign in with the customer account, then see the application status
   and (once approved) the partner prices. There is no separate partner login. */
import { useState } from 'react';
import Link from 'next/link';
import { Crumb, Icon } from '@/components/ui';
import { usePartner } from '@/components/partner';
import { TIER_LABEL, b2bList } from '@/lib/b2b';
import { site } from '@/lib/data';
import { useStore } from '@/components/store';

const STATUS = { pending: ['clock', 'Pending approval'], approved: ['checkCircle', 'Approved'], rejected: ['xCircle', 'Not approved'] } as const;

export default function PartnerClient() {
  const { ready, me, signedIn, account, refresh, switchTo } = usePartner();
  const { toast } = useStore();
  const [busy, setBusy] = useState(false);
  const ask = async (tier: 'reseller' | 'corporate' | null) => {
    setBusy(true);
    const err = await switchTo(tier);
    setBusy(false);
    if (err) toast(err, 'alert'); else toast(tier ? 'Switch request sent. Our team will review it.' : 'Switch request cancelled', 'checkCircle');
  };
  if (!ready) return null;
  const count = Object.keys(b2bList).length;

  return (
    <>
      <Crumb items={[['Partner Account']]} />
      <div className="wrap pt-wrap">
        {!signedIn ? (
          <section className="box pt-login">
            <h1><Icon name="briefcase" size={22} />Reseller &amp; Corporate Account</h1>
            <p className="muted">Partner prices are part of your customer account. Sign in with your account — or register first, then apply to become a reseller or corporate buyer.</p>
            <div className="pt-apply">
              <Link className="btn btn-brand" href="/login?next=/partner">Sign in</Link>
              <Link className="btn btn-line-brand" href="/register?next=/partner">Create an account</Link>
            </div>
          </section>
        ) : !me ? (
          <section className="box pt-login">
            <h1><Icon name="briefcase" size={22} />Apply for a partner account</h1>
            <p className="muted">You are signed in as <b>{account?.name}</b>. You have not applied yet — choose the account you need.</p>
            <div className="pt-apply">
              <Link className="btn btn-accent" href="/reseller">Become a Reseller</Link>
              <Link className="btn btn-line-brand" href="/corporate">Apply as Corporate Buyer</Link>
            </div>
          </section>
        ) : (
          <section className="box pt-account">
            <div className="pt-top">
              <div>
                <span className="tag">{TIER_LABEL[me.type]} Account</span>
                <h1>{me.business}</h1>
                <p className="muted">{me.person} · {me.phone} · {me.district}</p>
                <p className="muted sm">Signed in as {account?.name}{account?.email ? ' · ' + account.email : ''}</p>
              </div>
              <span className={'pp-status ' + me.status}><Icon name={STATUS[me.status][0]} size={18} />{STATUS[me.status][1]}</span>
            </div>
            {me.status === 'approved' && !count && <p>Your account is approved. Your {TIER_LABEL[me.type].toLowerCase()} price list is being prepared — our team will contact you shortly.</p>}
            {me.status === 'approved' && count > 0 && <>
              <p>You can now see partner prices on {count} products — with and without warranty, by colour and by quantity. Order while signed in to this account.</p>
              <Link className="btn btn-accent" href="/partner/products"><Icon name="tag" size={16} />See My {TIER_LABEL[me.type]} Prices</Link>
            </>}
            {me.status === 'pending' && <>
              <p>Your application is being reviewed. Our team will call you within 1 working day. Partner prices unlock after approval.</p>
              <button className="btn btn-line btn-sm" onClick={() => void refresh()}><Icon name="clock" size={15} />Check status</button>
            </>}
            {me.status === 'approved' && (() => {
              const other = me.type === 'reseller' ? 'corporate' : 'reseller';
              return me.requestedTier ? (
                <p className="muted" style={{ marginTop: 14 }}>
                  <Icon name="clock" size={15} /> You asked to switch to a <b>{TIER_LABEL[me.requestedTier]}</b> account — waiting for approval. Your {TIER_LABEL[me.type]} prices stay until then.{' '}
                  <button className="btn btn-line btn-sm" disabled={busy} onClick={() => void ask(null)}>Cancel request</button>
                </p>
              ) : (
                <p className="muted" style={{ marginTop: 14 }}>
                  One account holds one partner type. Need a {TIER_LABEL[other]} account instead?{' '}
                  <button className="btn btn-line btn-sm" disabled={busy} onClick={() => void ask(other)}>Request switch to {TIER_LABEL[other]}</button>
                </p>
              );
            })()}
            {me.status === 'rejected' && <p>Your application was not approved. Please call {site.hotline} for details.</p>}
          </section>
        )}
      </div>
    </>
  );
}
