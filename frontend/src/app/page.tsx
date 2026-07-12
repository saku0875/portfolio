import { getPosts, getWorks } from "@/lib/api";
import SplitText from "@/components/SplitText";
import Reveal from "@/components/Reveal";
import CatDialog from "@/components/CatDialog";
import VideoSlider from "@/components/VideoSlider";

const TECH = ["Next.js", "Ruby on Rails", "C", "Pyxel", "Arduino"];

export default async function HomePage() {
  const [works, posts] = await Promise.all([getWorks(), getPosts()]);

  return (
    <main>
      {/* ===== Hero ===== */}
      <section id="hero" className="px-6 py-24 text-center">
        <h1 className="disp text-4xl sm:text-5xl">
          <SplitText text="村田つぐみ" anim="anim-pop" base="1.2s" />
        </h1>
        <Reveal className="reveal mt-4">
          <p className="text-[var(--ink-soft)]">CS student · Game dev · Full-stack</p>
        </Reveal>
      </section>

      {/* ===== 猫の会話 ===== */}
      <section id="cat" className="px-6 pb-24">
        <CatDialog />
      </section>

      {/* ===== Videos ===== */}
      <section id="videos" className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="disp mb-8 text-3xl text-center">
          <SplitText text="Videos" anim="anim-pop" />
        </h2>
        <VideoSlider works={works} />
      </section>

      {/* ===== About ===== */}
      <section id="about" className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="disp mb-8 text-3xl">
          <SplitText text="About" anim="anim-dup" />
        </h2>

        <Reveal className="reveal">
          <div className="card p-8">
            <p className="leading-relaxed">
              CSを学ぶ学生です。ゲーム開発とWebアプリケーション開発に取り組んでいます。
              このサイトもNext.jsとRails APIで自作しました。
            </p>

            <ul className="mt-6 flex flex-wrap gap-2">
              {TECH.map((tech) => (
                <li key={tech} className="tag">{tech}</li>
              ))}
            </ul>

            <div className="mt-8 flex gap-3">
              <a
                href="https://github.com/saku0875"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--mini"
              >
                GitHub
              </a>
              <a
                href="https://x.com/kin0875"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--mini"
              >
                X
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== Works ===== */}
      <section id="works" className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="disp mb-8 text-3xl">
          <span className="wipe play" style={{ "--band": "var(--akane)" } as React.CSSProperties}>
            <span>Works</span>
          </span>
        </h2>

<div className="grid gap-6 sm:grid-cols-2">
          {works.map((work) => (
            <Reveal key={work.id} className="reveal">
              <article id={`work-${work.id}`} className="card h-full p-6">
                <h3 className="disp text-lg">{work.title}</h3>
                
                {work.description && (
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">{work.description}</p>
                )}

                {work.tech_stack.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {work.tech_stack.map((tech) => (
                      <li key={tech} className="tag">{tech}</li>
                    ))}
                  </ul>
                )}

                <div className="mt-5 flex gap-3">
                  {work.github_url && (
                    <a href={work.github_url} target="_blank" rel="noopener noreferrer" className="btn btn--mini">
                      GitHub
                    </a>
                  )}
                  {work.demo_url && (
                    <a href={work.demo_url} target="_blank" rel="noopener noreferrer" className="btn btn--mini">
                      Demo
                    </a>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Blog ===== */}
      <section id="blog" className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="disp mb-8 text-3xl">
          <SplitText text="Blog" anim="anim-slide" />
        </h2>

        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id}>
              <Reveal className="reveal">
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card block p-6"
                >
                  <h3 className="disp text-base">{post.title}</h3>
                  {post.description && (
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">{post.description}</p>
                  )}
                  <time className="mt-3 block font-[family-name:var(--mono)] text-xs text-[var(--ink-soft)]">
                    {new Date(post.published_at).toLocaleDateString("ja-JP")}
                  </time>
                </a>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}