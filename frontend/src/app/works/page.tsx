import { getWorks } from "@/lib/api";

export const metadata = {
  title: "Works | Portfolio",
};

export default async function WorksPage() {
  const works = await getWorks();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold">Works</h1>

      {works.length === 0 ? (
        <p className="text-gray-500">制作物はまだありません。</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {works.map((work) => (
            <article
              key={work.id}
              className="rounded-lg border border-gray-200 p-5"
            >
              <h2 className="text-lg font-semibold">{work.title}</h2>

              {work.description && (
                <p className="mt-2 text-sm text-gray-600">{work.description}</p>
              )}

              {work.tech_stack.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {work.tech_stack.map((tech) => (
                    <li
                      key={tech}
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex gap-4 text-sm">
                {work.github_url && (
                  <a
                    href={work.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    GitHub
                  </a>
                )}
                {work.demo_url && (
                  <a
                    href={work.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Demo
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}