"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-lg font-semibold">Something went wrong</p>
      <p className="mt-2 text-sm text-ink-muted">This admin page couldn&apos;t be loaded. Try again in a moment.</p>
      <button type="button" className="btn mt-5 bg-[#5B4CF5] text-white" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
