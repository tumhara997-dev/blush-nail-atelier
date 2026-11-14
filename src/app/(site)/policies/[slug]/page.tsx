import { notFound } from "next/navigation";
import { getSettings } from "@/server/settings";

const TITLES = { privacy: "Privacy Policy", cancellation: "Cancellation Policy" } as const;

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in TITLES)) notFound();
  const key = slug as keyof typeof TITLES;
  const { policies } = await getSettings("policies");
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="h-display text-4xl">{TITLES[key]}</h1>
      <p className="mt-1 text-xs text-muted">Version {policies.version}</p>
      <div className="mt-6 whitespace-pre-line leading-7 text-[#5b4651]">{policies[key]}</div>
    </article>
  );
}
