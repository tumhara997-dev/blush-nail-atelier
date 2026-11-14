import { SectionTitle } from "./ornaments";

/** Kept for existing pages; renders the new editorial section title. */
export function SectionHead({ eyebrow, title, children, as = "h2" }: { eyebrow: string; title: string; children?: React.ReactNode; as?: "h1" | "h2" }) {
  return (
    <SectionTitle eyebrow={eyebrow} title={title} as={as}>
      {children}
    </SectionTitle>
  );
}
