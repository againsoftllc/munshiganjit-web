import Link from 'next/link';
import { Icon, Art, PImg } from '@/components/ui';
import { HUES } from '@/lib/svg';
import { blogUrl } from '@/lib/format';
import type { BlogPost } from '@/lib/data';

/** The picture of an article: the cover set in the admin, else the picture of its product, else the drawn art. */
export function BlogPic({ b, size, artSize, eager }: { b: BlogPost; size: number; artSize: number; eager?: boolean }) {
  if (b.cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="art-svg pimg" src={b.cover} alt={b.title} width={size} height={size} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
  }
  return b.product ? <PImg id={b.product} size={size} eager={eager} /> : <Art kind={b.art} hue={b.hue} size={artSize} />;
}

/* Port of NT.postCard (ui/assets/js/app.js) */
export default function PostCard({ b }: { b: BlogPost }) {
  return (
    <Link className="post" href={blogUrl(b.id)}>
      <span className="pi" style={{ background: 'linear-gradient(135deg,' + HUES[b.hue].s + ',#fff)' }}>
        <BlogPic b={b} size={170} artSize={140} />
        <span className="ptag">{b.cat}</span>
      </span>
      <span className="pb">
        <span className="pmeta"><span><Icon name="calendar" size={15} />{b.date}</span><span><Icon name="clock" size={15} />{b.read} Min. Read</span></span>
        <h3>{b.title}</h3>
        <p>{b.excerpt}</p>
        <span className="rm">Read More <Icon name="arrow" size={15} /></span>
      </span>
    </Link>
  );
}
