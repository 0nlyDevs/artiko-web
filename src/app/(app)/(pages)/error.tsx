"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="font-heading text-6xl">This page could not load its works</h1>
      <p className="max-w-xl text-xl">The Artiko service did not answer. Check your connection, then try again.</p>
      <button type="button" onClick={reset} className="bg-ink px-5 py-3 font-bold text-paper">
        Try again
      </button>
    </div>
  );
}
