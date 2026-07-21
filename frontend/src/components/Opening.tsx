"use client";

import { useEffect, useState } from "react";

export default function Opening() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => document.body.classList.add("loaded"), 60);
    const t2 = setTimeout(() => setDone(true), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (done) return null;

  return (
    <div className="curtain curtain--opening" aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}