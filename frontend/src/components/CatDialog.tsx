"use client";

import { useEffect, useRef, useState } from "react";

const LINES = [
  "にゃ。ようこそ、ポートフォリオへ！",
  "下で作品を紹介しているよ！",
  "記事も書いてるから、よかったら読んでいってね。",
  "GitHubとXのリンクはAboutにあるにゃ。",
];

export default function CatDialog() {
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState("");
  const [typing, setTyping] = useState(false);
  const [pop, setPop] = useState(false);
  const [jump, setJump] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const type = (text: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTyping(true);
    setShown("");
    let i = 0;
    timerRef.current = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTyping(false);
      }
    }, 42);
  };

  useEffect(() => {
    type(LINES[0]);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const advance = () => {
    if (typing) {
      if (timerRef.current) clearInterval(timerRef.current);
      setShown(LINES[idx]);
      setTyping(false);
      return;
    }
    const next = (idx + 1) % LINES.length;
    setIdx(next);
    setPop(false);
    setJump(false);
    requestAnimationFrame(() => {
      setPop(true);
      setJump(true);
    });
    type(LINES[next]);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="猫をタップしてセリフを進める"
      onClick={advance}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          advance();
        }
      }}
      className="mx-auto flex max-w-md cursor-pointer flex-col items-center gap-2"
    >
      <div className={`bubble ${pop ? "pop" : ""}`}>
        <span>{shown}</span>
        <span className={`cue ${!typing ? "on" : ""}`}>▼</span>
      </div>

      <svg className={`cat ${jump ? "jump" : ""}`} viewBox="0 0 200 170" aria-hidden="true">
        <path className="tail" d="M150 128 q34 -4 30 -36" fill="none" stroke="var(--ink)" strokeWidth="9" strokeLinecap="round" />
        <ellipse cx="100" cy="130" rx="52" ry="32" fill="#fff" stroke="var(--ink)" strokeWidth="5" />
        <path d="M62 48 L70 16 L92 38 Z" fill="#fff" stroke="var(--ink)" strokeWidth="5" strokeLinejoin="round" />
        <path d="M138 48 L130 16 L108 38 Z" fill="#fff" stroke="var(--ink)" strokeWidth="5" strokeLinejoin="round" />
        <path d="M70 40 L73 27 L83 36 Z" fill="var(--akane-lt)" />
        <path d="M130 40 L127 27 L117 36 Z" fill="var(--akane-lt)" />
        <circle cx="100" cy="72" r="44" fill="#fff" stroke="var(--ink)" strokeWidth="5" />
        <circle cx="72" cy="82" r="7" fill="var(--akane-lt)" opacity=".7" />
        <circle cx="128" cy="82" r="7" fill="var(--akane-lt)" opacity=".7" />
        <g className="eyes">
          <circle cx="84" cy="68" r="5.5" fill="var(--ink)" />
          <circle cx="116" cy="68" r="5.5" fill="var(--ink)" />
        </g>
        <path d="M92 80 q4 6 8 0 q4 6 8 0" fill="none" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
        <path d="M48 66 h16 M48 76 h16 M136 66 h16 M136 76 h16" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
      </svg>

      <p className="disp text-xs text-[var(--ink-soft)]">▲ 猫をクリック</p>
    </div>
  );
}