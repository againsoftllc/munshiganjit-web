/** Structured data for search engines. Renders nothing for an empty list; "<" is escaped so data can never close the script tag.
 *  One script per item: validators read each one on its own. */
export default function JsonLd({ data }: { data: object | (object | undefined | null)[] | null | undefined }) {
  const list = (Array.isArray(data) ? data : data ? [data] : []).filter((x): x is object => Boolean(x));
  if (list.length === 0) return null;
  return (
    <>
      {list.map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, '\\u003c') }} />
      ))}
    </>
  );
}
