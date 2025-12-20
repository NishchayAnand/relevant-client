import { notFound } from 'next/navigation';
import { CustomMDX } from '@/app/components/mdx';
import { formatDate, getBlogPosts } from '@/app/blog/utils';

export async function generateStaticParams() {
  let posts = getBlogPosts()

  return posts.map((post) => ({
    slug: post.slug,
  }))
}

// export function generateMetadata({ params }: { params: { slug: string } }) {
//   let posts = getBlogPosts();
//   let post = posts.find((post) => post.slug === params.slug)
//   if (!post) {
//     return
//   }

//   let {
//     title,
//     publishedAt: publishedTime,
//     summary: description,
//   } = post.metadata;

//   return {
//     title,
//     description,
//     openGraph: {
//       title,
//       description,
//       type: 'article',
//       publishedTime,
//     },

//     twitter: {
//       card: 'summary_large_image',
//       title,
//       description,
//     },
//   }
// }

export default async function Blog({ params }: { params: { slug: string } }) {

  const { slug } = await params;
  let posts = getBlogPosts();
  let post = posts.find((post) => post.slug === slug)

  if (!post) {
    notFound()
  }

  return (
    <section>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.metadata.title,
            datePublished: post.metadata.publishedAt,
            dateModified: post.metadata.publishedAt,
            description: post.metadata.summary,
            author: {
              '@type': 'Person',
              name: 'My Portfolio',
            },
          }),
        }}
      />
      <h1 className="title font-semibold text-2xl tracking-tighter">
        {post.metadata.title}
      </h1>
      <div className="flex justify-between items-center mt-2 mb-8 text-sm">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(post.metadata.publishedAt, false)}
        </p>
      </div>
      <article className="prose">
        <CustomMDX source={post.content} />
      </article>
    </section>
  )
}