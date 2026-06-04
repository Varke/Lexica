/**
 * Проверка введённого ответа в режиме ввода.
 * Перевод может содержать несколько вариантов через «/», «,», «;» или «|»
 * и уточнения в скобках — учитываем всё это при сравнении.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\([^)]*\)/g, " ") // убираем уточнения в скобках
    .replace(/[.,!?;:"'«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Допустимые варианты правильного ответа. */
export function expectedVariants(expected: string): string[] {
  return expected
    .split(/[/,;|]| — | - /)
    .map(normalize)
    .filter(Boolean);
}

export function isAnswerCorrect(typed: string, expected: string): boolean {
  const t = normalize(typed);
  if (!t) return false;
  return expectedVariants(expected).includes(t);
}
