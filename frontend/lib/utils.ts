/**
 * Split a passage of text around a single highlighted substring.
 * Returns a list of segments — each either plain or `mark: true`.
 */
export function splitWithHighlight(
  text: string,
  highlight: string,
): Array<{ text: string; mark?: boolean }> {
  if (!highlight) return [{ text }];
  const idx = text.indexOf(highlight);
  if (idx === -1) return [{ text }];
  return [
    { text: text.slice(0, idx) },
    { text: text.slice(idx, idx + highlight.length), mark: true },
    { text: text.slice(idx + highlight.length) },
  ];
}

export function formatTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
