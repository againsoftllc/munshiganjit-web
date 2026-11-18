'use client';
/* Applies the server's data patch (what the admin changed since the last build) to this module's data
   BEFORE the components below it render, on the server render and in the browser alike, so both draw
   the same page. It must stay ahead of every component that reads lib/data. Renders nothing. */
import { applyPatch } from '@/lib/data';
import type { Patch } from '@/lib/patch';

export default function DataSync({ patch, k }: { patch: Patch | null; k: string }) {
  applyPatch(patch, k);
  return null;
}
