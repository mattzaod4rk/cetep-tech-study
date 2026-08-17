/**
 * Text summarizer utility — local implementation without external AI.
 * Uses term frequency to extract the most relevant sentences.
 */

const STOP_WORDS_PT = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'sob', 'sobre',
  'e', 'ou', 'mas', 'se', 'que', 'é', 'são', 'foi', 'ser', 'ter', 'tem', 'tinha',
  'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
  'isso', 'isto', 'aquilo', 'ele', 'ela', 'eles', 'elas', 'eu', 'tu', 'nós', 'vós',
  'me', 'te', 'se', 'nos', 'lhe', 'lhes', 'já', 'não', 'mais', 'também', 'muito',
  'ao', 'à', 'pelo', 'pela', 'pelos', 'pelas', 'num', 'numa', 'nuns', 'numas',
]);

/**
 * Summarizes a text in Portuguese by extracting the N most relevant sentences.
 * @param {string} text
 * @param {number} maxSentences
 * @returns {{ sentences: string[], keywords: string[] }}
 */
export function summarizeText(text, maxSentences = 5) {
  if (!text || text.trim().length < 50) {
    return { sentences: [], keywords: [] };
  }

  // Split into sentences
  const rawSentences = text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  if (rawSentences.length <= maxSentences) {
    return {
      sentences: rawSentences,
      keywords: extractKeywords(text, 8),
    };
  }

  // Term frequency map
  const words = tokenize(text);
  const freq = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  // Score each sentence
  const scored = rawSentences.map(sentence => {
    const sentWords = tokenize(sentence);
    const score = sentWords.reduce((acc, w) => acc + (freq[w] || 0), 0) / (sentWords.length || 1);
    return { sentence, score };
  });

  const topSentences = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    // Restore original order
    .sort((a, b) => rawSentences.indexOf(a.sentence) - rawSentences.indexOf(b.sentence))
    .map(s => s.sentence);

  return {
    sentences: topSentences,
    keywords: extractKeywords(text, 8),
  };
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-záàâãéêíóôõúüçñ\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS_PT.has(w));
}

function extractKeywords(text, n) {
  const words = tokenize(text);
  const freq = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word]) => word);
}
