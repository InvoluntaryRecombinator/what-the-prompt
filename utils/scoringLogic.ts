import { normalizeText, splitWords, type WordMatch } from "@/utils/wordUtils";

export type ScoreResult = {
  score: number;
  guessWords: WordMatch[];
  matchedWords: WordMatch[];
  promptWords: WordMatch[];
};

export function scoreGuess(promptText: string, rawGuess: string): ScoreResult {
  const normalizedPromptText = normalizeText(promptText);
  const normalizedRawGuess = normalizeText(rawGuess);
  const unmatchedPromptWords = splitWords(normalizedPromptText);
  const guessWords = splitWords(normalizedRawGuess);

  const mappedGuessWords = guessWords.map((word) => {
    const promptIndex = unmatchedPromptWords.indexOf(word);

    if (promptIndex === -1) {
      return { word, matched: false };
    }

    unmatchedPromptWords.splice(promptIndex, 1);
    return { word, matched: true };
  });

  return {
    score: mappedGuessWords.filter((word) => word.matched).length,
    guessWords: mappedGuessWords,
    matchedWords: mappedGuessWords,
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
