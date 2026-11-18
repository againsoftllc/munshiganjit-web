'use client';
/* The delivery charge inside a client component (the checkout): the shop's old values until the admin's current ones arrive. */
import { useEffect, useState } from 'react';
import { DELIVERY_FALLBACK, fetchDelivery, type Delivery } from './delivery';

let cached: Delivery | null = null;

export function useDelivery(): Delivery {
  const [d, setD] = useState<Delivery>(cached ?? DELIVERY_FALLBACK);
  useEffect(() => {
    let live = true;
    fetchDelivery().then(x => { cached = x; if (live) setD(x); });
    return () => { live = false; };
  }, []);
  return d;
}
