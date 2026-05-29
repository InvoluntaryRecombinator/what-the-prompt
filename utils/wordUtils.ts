export type WordMatch = {
  word: string;
  matched: boolean;
};

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "");
}

export function splitWords(text: string): string[] {
  return normalizeText(text).trim().split(/\s+/).filter(Boolean);
}

export function countWords(text: string): number {
  return splitWords(text).length;
}
