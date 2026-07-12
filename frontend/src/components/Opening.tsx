"use client";

import { useEffect, useState } from "react";

export default function Opening() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 1400);
    return () => clearTimeout(timer);
  }, []);

  if (done) return null;

  return (
    <div className="curtain curtain-open fixed inset-0 z-[100]" aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}