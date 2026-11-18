'use client';
import Link from 'next/link';
import { Crumb, Icon, ProductImg, StockTag } from '@/components/ui';
import { useStore } from '@/components/store';
import { byId, type Product } from '@/lib/data';
import { money, productUrl } from '@/lib/format';

const canBuy = (p: Product) => p.stock === 'in' || p.stock === 'preorder';

export default function WishlistClient() {
  const { ready, wish, addToCart, removeWish, toast } = useStore();
  const list = wish.map(byId).filter((p): p is Product => !!p);

  const move = (id: string) => { addToCart(id, 1); removeWish(id); toast('Moved to cart', 'cart'); };
  const moveAll = () => {
    const ids = list.filter(canBuy).map(p => p.id);
    ids.forEach(id => { addToCart(id, 1); removeWish(id); });
    toast(ids.length + ' products moved to cart', 'cart');
  };

  return (
    <>
      <Crumb items={[['Account', '/account'], ['Wish List']]} />
      <div className="wrap">
        <div className="row-between"><h1 className="page-h1">My Wish List</h1><button className="btn btn-brand btn-sm" onClick={moveAll}><Icon name="cart" size={15} />Move All to Cart</button></div>
        <div className="box" style={{ padding: 0 }}>
          {!ready ? <div style={{ minHeight: 240 }} /> : !list.length ? (
            <div className="oops"><div className="oops-art"><div className="inner"><Icon name="heart" size={64} /></div></div><h3>Oops!</h3><p>Your wish list is empty!</p><Link className="btn btn-brand" href="/">Continue</Link></div>
          ) : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Image</th><th>Product Name</th><th>Model</th><th>Stock</th><th>Unit Price</th><th>Action</th></tr></thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id}>
                    <td><Link href={productUrl(p.id)} style={{ display: 'flex', width: 70, height: 70, alignItems: 'center', justifyContent: 'center' }}><ProductImg p={p} size={64} /></Link></td>
                    <td><Link href={productUrl(p.id)} style={{ color: 'var(--ink)', fontWeight: 500 }}>{p.name}</Link></td>
                    <td className="muted">{p.model}</td>
                    <td><StockTag p={p} /></td>
                    <td><b style={{ color: 'var(--price)' }}>{money(p.price)}</b>{p.old && <><br /><s className="faint sm">{money(p.old)}</s></>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {canBuy(p)
                        ? <button className="btn btn-brand btn-sm" onClick={() => move(p.id)}><Icon name="cart" size={15} />Add to Cart</button>
                        : <button className="btn btn-line btn-sm" onClick={() => toast('We will SMS you when it is available', 'bell')}>Notify Me</button>}{' '}
                      <button className="btn btn-line btn-sm" aria-label="Remove" style={{ color: 'var(--red)' }} onClick={() => { removeWish(p.id); toast('Removed from wish list', 'heart'); }}><Icon name="trash" size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    </>
  );
}
