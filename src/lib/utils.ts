/**
 * Shared formatting utilities used across components.
 */

export function formatRepoName(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDateRange(created: string, pushed: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  const start = fmt(created);
  const end = fmt(pushed);
  return start === end ? start : `${start} - ${end}`;
}
