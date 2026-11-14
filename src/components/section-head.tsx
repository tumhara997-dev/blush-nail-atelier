export function SectionHead({ eyebrow, title, children, as: Tag = "h2" }: { eyebrow: string; title: string; children?: React.ReactNode; as?: "h1" | "h2" }) {
  return (
    <div className="mb-8 text-center">
      <div className="eyebrow">{eyebrow}</div>
      <Tag className="h-display mt-2 text-3xl sm:text-[38px]">{title}</Tag>
      {children && <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{children}</p>}
    </div>
  );
}
