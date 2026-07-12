import { getPosts } from "@/lib/api";

export const metadata = {
  title: "Blog | Portfolio",
};

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold">Blog</h1>

      {posts.length === 0 ? (
        <p className="text-gray-500">記事はまだありません。</p>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id}>
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-gray-200 p-5 transition hover:border-gray-400"
              >
                <h2 className="text-lg font-semibold">{post.title}</h2>
                {post.description && (
                  <p className="mt-1 text-sm text-gray-500">{post.description}</p>
                )}
                <time className="mt-2 block text-xs text-gray-400">
                  {new Date(post.published_at).toLocaleDateString("ja-JP")}
                </time>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}