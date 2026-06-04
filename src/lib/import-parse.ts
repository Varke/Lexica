export type ParsedCard = { front: string; back: string };

export type ParseResult = {
  cards: ParsedCard[];
  duplicates: number;
  skipped: number;
};

/** Разделители по убыванию приоритета. Табы и | надёжнее, чем тире. */
const SEPARATORS = ["\t", " — ", " – ", " - ", ";", "|", ","];

/** Подбирает разделитель для строки: первый из списка, что в ней встречается. */
function detectSeparator(line: string): string | null {
  for (const sep of SEPARATORS) {
    if (line.includes(sep)) return sep;
  }
  return null;
}

/**
 * Парсит вставленный текст в пары «слово — перевод».
 * Каждая строка = одна карточка. Разделитель определяется построчно.
 * Пустые строки и строки без разделителя пропускаются; дубли (по front) убираются.
 */
export function parseImport(text: string): ParseResult {
  const seen = new Set<string>();
  const cards: ParsedCard[] = [];
  let duplicates = 0;
  let skipped = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const sep = detectSeparator(line);
    if (!sep) {
      skipped++;
      continue;
    }

    const idx = line.indexOf(sep);
    const front = line.slice(0, idx).trim();
    const back = line.slice(idx + sep.length).trim();

    if (!front || !back) {
      skipped++;
      continue;
    }

    const key = front.toLowerCase();
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    cards.push({ front, back });
  }

  return { cards, duplicates, skipped };
}
