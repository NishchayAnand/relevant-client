import { BlogPosts } from "@/app/components/posts";

export default function Home() {
  return (
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
        What, Why & How?
      </h1>
      <p className="mb-4">
        In a world overflowing with tutorials and quick fixes, we often lose sight of the fundamentals. 
        This blog is an attempt to cut through the noise and understand software engineering from first principles.
      </p>
      <p>
        By breaking down complex concepts into their simplest parts, we can develop a deeper, 
        more intuitive understanding that transcends any specific technology or framework.
      </p>
      <div className="my-8">
        <BlogPosts />
      </div>
    </section>
  );
}
