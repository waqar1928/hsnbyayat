export default function Marquee({ text }: { text: string }) {
  const line = ` ${text} `;
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-inner">{line.repeat(5)}</div>
    </div>
  );
}
