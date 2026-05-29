import { normalizeText, splitWords, type WordMatch } from "@/utils/wordUtils";

export type ScoreResult = {
  score: number;
  matchedWords: WordMatch[];
  promptWords: WordMatch[];
};

export function scoreGuess(promptText: string, rawGuess: string): ScoreResult {
  const normalizedPromptText = normalizeText(promptText);
  const normalizedRawGuess = normalizeText(rawGuess);
  const unmatchedPromptWords = splitWords(normalizedPromptText);
  const guessWords = splitWords(normalizedRawGuess);

  const matchedWords = guessWords.map((word) => {
    const promptIndex = unmatchedPromptWords.indexOf(word);

    if (promptIndex === -1) {
      return { word, matched: false };
    }

    unmatchedPromptWords.splice(promptIndex, 1);
    return { word, matched: true };
  });

  return {
    score: matchedWords.filter((word) => word.matched).length,
    matchedWords,
    promptWords: buildPromptMatches(normalizedPromptText, normalizedRawGuess),
  };
}

function buildPromptMatches(promptText: string, rawGuess: string): WordMatch[] {
  const unmatchedGuessWords = splitWords(rawGuess);

  return splitWords(promptText).map((word) => {
    const guessIndex = unmatchedGuessWords.indexOf(word);

    if (guessIndex === -1) {
      return { word, matched: false };
    }

    unmatchedGuessWords.splice(guessIndex, 1);
    return { word, matched: true };
  });
}
