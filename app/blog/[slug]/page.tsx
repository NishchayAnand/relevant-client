import { notFound } from 'next/navigation';
import { CustomMDX } from '@/app/components/mdx';
import { TableOfContents } from '@/app/components/table-of-contents';
import { Tags } from '@/app/components/tags';
import { getToc } from '@/app/blog/toc';
import { formatDate, getBlogPosts } from '@/app/blog/utils';

export async function generateStaticParams() {
  let posts = getBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function Blog({ params }: { params: Promise<{ slug: string }> }) {

  const { slug } = await params;

  let posts = getBlogPosts();
  let post = posts.find((post) => post.slug === slug);

  if (!post) {
    notFound();
  }

  const headings = getToc(post.content);

  return (
    <section className='m-5'>
      <div
        className={
          headings.length > 0
            ? 'min-[1360px]:grid min-[1360px]:grid-cols-[11rem_minmax(0,1fr)] min-[1360px]:gap-14 min-[1360px]:-ml-[14.5rem]'
            : undefined
        }
      >
        <TableOfContents headings={headings} />
        <div className="min-w-0">
          <h1 className="title font-semibold text-2xl tracking-tighter">
            {post.metadata.title}
          </h1>
          <div className="mt-2 mb-8 flex flex-wrap items-center gap-2 text-sm">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {formatDate(post.metadata.publishedAt, false)}
            </p>
            {post.metadata.tags?.length ? (
              <>
                <span className="text-neutral-400">|</span>
                <Tags tags={post.metadata.tags} />
              </>
            ) : null}
          </div>
          <article className="prose">
            <CustomMDX source={post.content} />
          </article>
        </div>
      </div>
    </section>
  )
}