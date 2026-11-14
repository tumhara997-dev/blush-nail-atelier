/** Fine-line hand-drawn bow — the one "cute" motif, used sparingly. */
export function Bow({ className = "h-5 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M32 18c-6-8-18-14-24-9-5 4-1 13 7 13 6 0 12-2 17-4" />
      <path d="M32 18c6-8 18-14 24-9 5 4 1 13-7 13-6 0-12-2-17-4" />
      <path d="M29.5 17.5c0-2 1-3.2 2.5-3.2s2.5 1.2 2.5 3.2-1 3.4-2.5 3.4-2.5-1.4-2.5-3.4z" />
      <path d="M30 21c-2 5-5 10-9 15" />
      <path d="M34 21c2 5 5 10 9 15" />
    </svg>
  );
}

/** Thin gold rule with a small diamond — section divider. */
export function GoldRule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-gold ${className}`} aria-hidden>
      <span className="h-px w-12 bg-gold/50" />
      <span className="h-1.5 w-1.5 rotate-45 border border-gold" />
      <span className="h-px w-12 bg-gold/50" />
    </div>
  );
}

export function SectionTitle({ eyebrow, title, children, align = "center", as: Tag = "h2" }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode; align?: "center" | "left"; as?: "h1" | "h2" }) {
  return (
    <div className={`mb-10 ${align === "center" ? "text-center" : ""}`}>
      <div className="eyebrow">{eyebrow}</div>
      <Tag className="h-display mt-3 text-[40px] leading-[1.05] sm:text-[52px]">{title}</Tag>
      {children && <p className={`mt-4 max-w-xl text-[15px] leading-7 text-muted ${align === "center" ? "mx-auto" : ""}`}>{children}</p>}
    </div>
  );
}
