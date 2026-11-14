import Link from "next/link";
import { Bow } from "@/components/ornaments";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-28 text-center">
      <Bow className="mx-auto h-8 w-12 text-gold" />
      <h1 className="h-display mt-6 text-[44px] leading-none">Page <em className="font-normal text-rose">not found</em></h1>
      <p className="mt-4 text-muted">That page doesn&apos;t exist or has moved.</p>
      <Link href="/" className="btn-primary mt-8">Back to home</Link>
    </div>
  );
}
