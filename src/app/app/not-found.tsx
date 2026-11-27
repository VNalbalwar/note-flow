import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid flex-1 place-items-center px-6 py-24 text-center">
      <div>
        <h1 className="display-tight text-3xl">That page isn&apos;t available</h1>
        <p className="mt-2 max-w-[44ch] text-ink-2">It may have been deleted, or you haven&apos;t been invited to it.</p>
        <Link href="/app" className="btn btn-solid mt-6">
          Back to your pages
        </Link>
      </div>
    </div>
  );
}
