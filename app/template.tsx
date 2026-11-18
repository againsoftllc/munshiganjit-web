/* A template is rendered anew on every navigation (a layout is not), so each page change brings the
   current data patch along. */
import DataSync from '@/components/DataSync';
import { loadFresh } from '@/lib/live';

export default async function Template({ children }: { children: React.ReactNode }) {
  const { patch, key } = await loadFresh();
  return <><DataSync patch={patch} k={key} />{children}</>;
}
