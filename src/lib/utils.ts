/**
 * Shared formatting utilities used across components.
 */

export function formatRepoName(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDateRange(created: string, _pushed: string): string {
  return new Date(created).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function formatTopic(topic: string): string {
  return topic.replace(/[-_]/g, " ");
}
