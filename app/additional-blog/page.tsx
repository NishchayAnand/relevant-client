import Link from 'next/link';
import { formatDate, getAdditionalBlogPosts } from '@/app/blog/utils';

export default function AdditionalBlogPage() {
  const posts = getAdditionalBlogPosts().sort((a, b) => {
    if (a.metadata.publishedAt && b.metadata.publishedAt) {
      return a.metadata.publishedAt < b.metadata.publishedAt ? 1 : -1;
    }
    if (a.metadata.publishedAt) return -1;
    if (b.metadata.publishedAt) return 1;
    return a.metadata.title.localeCompare(b.metadata.title);
  });

  return (
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">Additional posts</h1>
      <div>
        {posts.map((post) => (
          <Link
            key={post.slug}
            className="mb-4 flex flex-col space-y-1"
            href={`/additional-blog/${post.slug}`}
          >
            <div className="flex w-full flex-col space-x-0 md:flex-row md:space-x-2">
              {post.metadata.publishedAt ? (
                <p className="tabular-nums text-neutral-600 dark:text-neutral-400">
                  {formatDate(post.metadata.publishedAt, false)}
                </p>
              ) : null}
              <p className="tracking-tight text-neutral-900 dark:text-neutral-100">
                {post.metadata.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
