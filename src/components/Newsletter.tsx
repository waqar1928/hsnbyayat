"use client";

import { useState } from "react";
import { useToastStore } from "@/lib/uiStore";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const show = useToastStore((s) => s.show);

  async function subscribe() {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      show("Enter a valid email");
      return;
    }
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setEmail("");
      show("Subscribed — welcome to the list!");
    } catch {
      show("Something went wrong, try again");
    }
  }

  return (
    <section className="newsletter">
      <h3>Keep me updated</h3>
      <p>New drops, restocks and sale alerts. No spam, ever.</p>
      <div className="news-form">
        <input
          type="email"
          placeholder="YOUR@EMAIL.COM"
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && subscribe()}
        />
        <button onClick={subscribe}>Subscribe</button>
      </div>
    </section>
  );
}
