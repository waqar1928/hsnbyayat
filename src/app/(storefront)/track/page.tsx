import type { Metadata } from "next";
import TrackOrderForm from "@/components/TrackOrderForm";

export const metadata: Metadata = { title: "Track your order" };

export default function TrackPage() {
  return (
    <section className="page-section" style={{ maxWidth: 640 }}>
      <TrackOrderForm />
    </section>
  );
}
