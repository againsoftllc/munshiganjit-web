'use client';
/* Header, Footer and floating widgets around every page, except standalone pages
   (the live-edit canvas). The /complain page now has the normal header and footer too. */
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import Floating from './Floating';
import Translate from './Translate';
import EditPageButton from './live-edit/EditPageButton';

const STANDALONE = ['/live-edit'];

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  if (STANDALONE.includes(usePathname())) return <><main>{children}</main><Translate /></>;
  return (
    <>
      <Header />
      <main className="main">{children}</main>
      <Footer />
      <Floating />
      <EditPageButton />
      <Translate />
    </>
  );
}
