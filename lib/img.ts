/* Photos through Next's image optimizer (/_next/image): resized to the size they are drawn at and sent as WebP/AVIF, so a 500x500
   PNG that is shown 44px wide is no longer downloaded whole. Pure functions: the <img> tags stay as they are, only src / srcSet change.
   Only the shop's own files (/img/...) and the API's uploads are sent through it; SVG, GIF and anything else are left alone. */
const API = (process.env.NEXT_PUBLIC_AGAINERP_API || '').replace(/\/$/, '');

/** the widths /_next/image accepts (Next's defaults: imageSizes + deviceSizes) */
const SIZES = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const fit = (w: number) => SIZES.find(s => s >= w) ?? SIZES[SIZES.length - 1];

export function canOptimize(src: string | null | undefined): src is string {
  if (!src || !/\.(png|jpe?g|webp|avif)(\?.*)?$/i.test(src)) return false;
  return (src.startsWith('/') && !src.startsWith('//')) || (!!API && src.startsWith(API + '/'));
}

const url = (src: string, w: number) => `/_next/image?url=${encodeURIComponent(src)}&w=${fit(w)}&q=75`;

/** src + 1x/2x srcSet for a picture drawn `w` CSS pixels wide; nothing to change when it cannot be optimized */
export function fixedImg(src: string, w: number): { src: string; srcSet?: string } {
  if (!canOptimize(src)) return { src };
  return { src: url(src, w), srcSet: `${url(src, w)} 1x, ${url(src, w * 2)} 2x` };
}

/** src + width-based srcSet for a picture that fills `sizes` of the screen */
export function fluidImg(src: string, sizes: string, widths: number[] = [640, 750, 828, 1080, 1200]): { src: string; srcSet?: string; sizes?: string } {
  if (!canOptimize(src)) return { src };
  return { src: url(src, widths[widths.length - 1]), srcSet: widths.map(w => `${url(src, w)} ${fit(w)}w`).join(', '), sizes };
}
