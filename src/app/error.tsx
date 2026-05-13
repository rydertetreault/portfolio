"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground px-6">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-text-muted text-sm leading-relaxed">
          {error.message || "An unexpected error occurred while loading the page."}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 border border-border-theme hover:border-accent bg-surface-alt hover:bg-accent-subtle px-5 py-2.5 rounded-xl text-sm transition-all duration-300"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
