import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center px-6 text-center">
      <div>
        <h1 className="display text-7xl">Nobody here</h1>
        <p className="mt-3 text-ink-2">That address doesn&apos;t lead anywhere.</p>
        <Link href="/" className="btn btn-solid mt-6">
          Go home
        </Link>
      </div>
    </main>
  );
}
