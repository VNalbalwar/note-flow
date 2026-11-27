"use client";

export default function ErrorScreen({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-svh place-items-center px-6 text-center">
      <div>
        <h1 className="display-tight text-3xl">Something went wrong</h1>
        <p className="mt-2 max-w-[44ch] text-ink-2">Try again. If it keeps happening, check that the database and sync server are running.</p>
        <button type="button" className="btn btn-solid mt-6" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
