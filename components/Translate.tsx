'use client';
/* বাংলা toggle: Google Website Translator. The choice lives in the `googtrans` cookie,
   so it survives page loads; the script is only loaded while Bangla is selected. */
import { useEffect } from 'react';

const isBn = () => /(?:^|;\s*)googtrans=\/en\/bn/.test(document.cookie);

export function setSiteLang(l: 'en' | 'bn') {
  const host = location.hostname;
  const v = l === 'bn' ? '/en/bn' : '';
  const exp = l === 'bn' ? '' : '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = `googtrans=${v}; path=/${exp}`;
  if (host.includes('.')) document.cookie = `googtrans=${v}; path=/; domain=.${host}${exp}`;
  location.reload();
}

export default function Translate() {
  useEffect(() => {
    if (!isBn() || document.getElementById('gt-script')) return;
    // Google Translate rewrites text nodes; keep React's later DOM updates from throwing on them.
    const rm = Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
      return child.parentNode === this ? (rm.call(this, child) as T) : child;
    };
    const ins = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
      return ins.call(this, node, ref && ref.parentNode === this ? ref : null) as T;
    };
    (window as unknown as { gtInit: () => void }).gtInit = () => {
      const g = (window as unknown as { google: { translate: { TranslateElement: new (o: object, id: string) => unknown } } }).google;
      new g.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: 'bn,en', autoDisplay: false }, 'gt-el');
      // the widget does not always pick the cookie up by itself, so select Bangla in its combo
      let tries = 0;
      const t = setInterval(() => {
        const c = document.querySelector<HTMLSelectElement>('.goog-te-combo');
        if (c && c.options.length > 1) { c.value = 'bn'; c.dispatchEvent(new Event('change')); clearInterval(t); }
        else if (++tries > 40) clearInterval(t);
      }, 250);
    };
    const s = document.createElement('script');
    s.id = 'gt-script';
    s.src = 'https://translate.google.com/translate_a/element.js?cb=gtInit';
    document.body.appendChild(s);
  }, []);
  return <div id="gt-el" style={{ display: 'none' }} />;
}

export const siteLangIsBn = () => typeof document !== 'undefined' && isBn();
