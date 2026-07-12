"use client";

import { useRef, useState } from "react";
import type { Work } from "@/lib/api";

type Props = { works: Work[] };

export default function VideoSlider({ works }: Props) {
  const [current, setCurrent] = useState(0);
  const [wiping, setWiping] = useState(false);
  const animatingRef = useRef(false);

  if (works.length === 0) return null;

  const goTo = (next: number) => {
    if (animatingRef.current || next === current) return;
    animatingRef.current = true;

    // 幕アニメーションを再始動
    setWiping(false);
    requestAnimationFrame(() => setWiping(true));

    // 幕が覆いきる瞬間に中身を差し替える
    setTimeout(() => setCurrent(next), 450);
    setTimeout(() => {
      animatingRef.current = false;
      setWiping(false);
    }, 900);
  };

  const prev = () => goTo((current - 1 + works.length) % works.length);
  const next = () => goTo((current + 1) % works.length);

  return (
    <div>
      <div className={`slider ${wiping ? "is-wiping" : ""}`}>
        <div className="slides">
          {works.map((work, i) => (
            <a
              key={work.id}
              href={`#work-${work.id}`}
              className={`slide ${i === current ? "is-active" : ""}`}
              aria-hidden={i !== current}
              tabIndex={i === current ? 0 : -1}
            >
              <div className="slide__media">
                {work.video_url ? (
                  <video
                    src={work.video_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : work.thumbnail_url ? (
                  <img src={work.thumbnail_url} alt={work.title} />
                ) : (
                  <span className="slide__placeholder">NO VIDEO YET</span>
                )}
              </div>

              <div className="slide__title">
                <span>{work.title}</span>
                <span className="slide__hint">クリックで詳細へ ↓</span>
              </div>
            </a>
          ))}
        </div>

        <button
          type="button"
          className="slider__nav slider__nav--prev"
          onClick={prev}
          aria-label="前の作品"
        >
          ◁
        </button>
        <button
          type="button"
          className="slider__nav slider__nav--next"
          onClick={next}
          aria-label="次の作品"
        >
          ▷
        </button>

        <div className="slider__curtain" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>

      <div className="slider__dots">
        {works.map((work, i) => (
          <button
            key={work.id}
            type="button"
            className={`slider__dot ${i === current ? "is-active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`${i + 1}番目の作品へ`}
            aria-current={i === current}
          />
        ))}
      </div>
    </div>
  );
}