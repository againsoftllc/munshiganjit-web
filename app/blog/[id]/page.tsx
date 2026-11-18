import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { blog, byId, site } from '@/lib/data';
import ArticleClient from './ArticleClient';
import { loadFresh } from '@/lib/live';
import { getPost, prepareArticle } from '@/lib/blog';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await loadFresh();
  const { id } = await params;
  const b = blog.find(x => x.id === id);
  if (!b) return { title: 'Article not found' };
  const post = await getPost(id);
  const title = (post?.seoTitle || b.title) + ' | Munshiganj IT Blog';
  const description = post?.seoDescription || b.excerpt;
  /* what Facebook / WhatsApp show when the link is shared: the cover set in the admin, else the product's photo */
  const image = b.cover || (b.product ? byId(b.product)?.image : '') || '';
  return { title: { absolute: title }, description, openGraph: { type: 'article', title, description, ...(image ? { images: [image] } : {}) } };
}

export default async function BlogDetailsPage({ params }: Props) {
  await loadFresh();
  const { id } = await params;
  const b = blog.find(x => x.id === id);
  if (!b) notFound();
  /* the body and the product boxes are written in the admin (Website > Blog); no body yet = the article's short text */
  const post = await getPost(id);
  const article = prepareArticle(post?.content?.trim() ? post.content : `<p>${b.excerpt.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`);
  /* an article with no author shows the Blog > Settings default author, else the website's name */
  const dflt = post?.defaultAuthor && post.defaultAuthor.toLowerCase() !== 'admin' ? post.defaultAuthor : '';
  const author = b.author?.trim() || dflt || site.name || 'Munshiganj IT';
  return <ArticleClient id={b.id} article={article} products={post?.showProducts === false ? [] : post?.products ?? []} author={author} share={post?.share ?? { facebook: true, whatsapp: true, copy: true }} />;
}
