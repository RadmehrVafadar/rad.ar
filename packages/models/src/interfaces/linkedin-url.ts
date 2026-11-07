/** LinkedIn listing URLs are discovery references, not employer requisition IDs. */
export function isLinkedInListingUrl(
  value: string | null | undefined,
): boolean {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "linkedin.com" || host.endsWith(".linkedin.com");
  } catch {
    return false;
  }
}
