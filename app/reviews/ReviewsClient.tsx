'use client';
/* /reviews — all customer reviews, newest at the top, older ones further down */
import { useState } from 'react';
import { reviews, REVIEW_TOPICS } from '@/lib/data';
import { Crumb, Stars } from '@/components/ui';
import { ReviewCard } from '../HomeClient';

export default function ReviewsClient() {
  const [topic, setTopic] = useState('');
  const list = reviews.slice().sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).filter(r => !topic || r.topic === topic);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return (
    <>
      <Crumb items={[['Customer Reviews']]} />
      <div className="wrap" style={{ paddingTop: 22, paddingBottom: 30 }}>
        <div className="rv-head">
          <div><h1>Customer Reviews</h1><p className="muted">Latest reviews first</p></div>
          <div className="score"><b>{avg.toFixed(1)}</b><div><Stars rating={avg} size={16} /><div className="sm muted">{reviews.length} reviews</div></div></div>
        </div>
        <div className="brand-pills" style={{ margin: '14px 0 18px' }}>
          <button className={'pill' + (topic ? '' : ' on')} onClick={() => setTopic('')}>All</button>
          {REVIEW_TOPICS.map(([e, t]) => <button key={t} className={'pill' + (topic === t ? ' on' : '')} onClick={() => setTopic(t)}>{e} {t}</button>)}
        </div>
        <div className="rv-grid">{list.map((r, i) => <ReviewCard key={i} r={r} />)}</div>
        {!list.length && <p className="muted">No reviews on this topic yet.</p>}
      </div>
    </>
  );
}
