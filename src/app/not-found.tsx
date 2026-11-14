import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="text-5xl" aria-hidden>💅</div>
      <h1 className="h-display mt-4 text-3xl">Page not found</h1>
      <p className="mt-2 text-muted">That page doesn&apos;t exist or has moved.</p>
      <Link href="/" className="btn-primary mt-6">Back to home</Link>
    </div>
  );
}
