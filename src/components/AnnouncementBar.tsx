"use client";

import { useEffect, useRef, useState } from "react";

export default function AnnouncementBar({ messages }: { messages: string[] }) {
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  function restart() {
    clearInterval(timer.current);
    timer.current = setInterval(() => setIdx((i) => (i + 1) % messages.length), 5000);
  }

  useEffect(() => {
    restart();
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  function shift(d: number) {
    setIdx((i) => (i + d + messages.length) % messages.length);
    restart();
  }

  if (!messages.length) return null;

  return (
    <div className="announce">
      <button className="prev" onClick={() => shift(-1)} aria-label="Previous announcement">
        ‹
      </button>
      <span>{messages[idx]}</span>
      <button className="next" onClick={() => shift(1)} aria-label="Next announcement">
        ›
      </button>
    </div>
  );
}
