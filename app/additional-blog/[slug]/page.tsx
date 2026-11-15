import { notFound } from 'next/navigation';
import { CustomMDX } from '@/app/components/mdx';
import { TableOfContents } from '@/app/components/table-of-contents';
import { Tags } from '@/app/components/tags';
import { getToc } from '@/app/blog/toc';
import { formatDate, getAdditionalBlogPost, getAdditionalBlogSlugs } from '@/app/blog/utils';

export async function generateStaticParams() {
  return getAdditionalBlogSlugs().map((slug) => ({ slug }));
}

export default async function AdditionalBlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getAdditionalBlogPost(slug);

  if (!post) {
    notFound();
  }

  const headings = getToc(post.content);

  return (
    <section className="m-5">
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
          {post.metadata.publishedAt || post.metadata.tags?.length ? (
            <div className="mt-2 mb-8 flex flex-wrap items-center gap-2 text-sm">
              {post.metadata.publishedAt ? (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {formatDate(post.metadata.publishedAt, false)}
                </p>
              ) : null}
              {post.metadata.publishedAt && post.metadata.tags?.length ? (
                <span className="text-neutral-400">|</span>
              ) : null}
              {post.metadata.tags?.length ? <Tags tags={post.metadata.tags} /> : null}
            </div>
          ) : null}
          <article className="prose">
            <CustomMDX source={post.content} />
          </article>
        </div>
      </div>
    </section>
  );
}
