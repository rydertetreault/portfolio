export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-text-faint text-sm">
        <span
          className="inline-block h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin"
          aria-hidden
        />
        Loading…
      </div>
    </main>
  );
}
