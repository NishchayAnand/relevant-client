export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const { default: Post } = await import(`@/app/blog/posts/${slug}.mdx`);
 
  return <Post />;
}
 
// Tells Next.js: “These are the only valid values for slug”.
// Next.js will pre-build "/welcome" and "/about" at build time, not runtime.
// Enables Static Site Generation (SSG). No server needed at runtime
export function generateStaticParams() {
  return [{ slug: 'welcome' }, { slug: 'about' }];
}
 
// ❌ No new slugs allowed at runtime. Guarantees no unexpected pages.
export const dynamicParams = false;