import Link from "next/link";
import { getPosts, getWorks } from "@/lib/api";

export default async function HomePage() {
  const [works, posts] = await Promise.all([getWorks(), getPosts()]);

  const featuredWorks = works.slice(0, 3);
  const recentPosts = posts.slice(0, 3);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      {/* ヒーロー */}
      <section className="mb-16 text-center">
        <h1 className="text-4xl font-bold">村田つぐみ</h1>
        <p className="mt-3 text-gray-500">CS student · Game dev · Full-stack</p>
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {["Next.js", "Ruby on Rails", "C", "Pyxel", "Arduino"].map((tech) => (
            <li
              key={tech}
              className="rounded-full border border-gray-300 px-4 py-1 text-sm text-gray-600"
            >
              {tech}
            </li>
          ))}
        </ul>
      </section>

      {/* Featured works */}
      <section className="mb-16">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Featured works</h2>
          <Link href="/works" className="text-sm text-blue-600 hover:underline">
            すべて見る →
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {featuredWorks.map((work) => (
            <article
              key={work.id}
              className="rounded-lg border border-gray-200 p-5"
            >
              <h3 className="font-semibold">{work.title}</h3>
              <p className="mt-1 text-xs text-gray-500">
                {work.tech_stack.join(" · ")}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Recent posts */}
      <section>
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Recent posts</h2>
          <Link href="/posts" className="text-sm text-blue-600 hover:underline">
            すべて見る →
          </Link>
        </div>

        <ul className="space-y-3">
          {recentPosts.map((post) => (
            <li key={post.id}>
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-gray-200 p-4 transition hover:border-gray-400"
              >
                <h3 className="font-semibold">{post.title}</h3>
                <time className="mt-1 block text-xs text-gray-400">
                  {new Date(post.published_at).toLocaleDateString("ja-JP")}
                </time>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}