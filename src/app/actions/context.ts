"use server";

import { createClient } from "@/lib/supabase/server";

export type WordContext = { phonetic: string; example: string };

// Минимальная форма ответа dictionaryapi.dev.
type DictPhonetic = { text?: string };
type DictDefinition = { example?: string };
type DictMeaning = { definitions?: DictDefinition[] };
type DictEntry = {
  phonetic?: string;
  phonetics?: DictPhonetic[];
  meanings?: DictMeaning[];
};

const EMPTY: WordContext = { phonetic: "", example: "" };

/** Достаёт транскрипцию и пример из бесплатного словаря (без ключа). */
async function fetchFromDictionary(word: string): Promise<WordContext> {
  const term = word.trim();
  // Фразы из нескольких слов словарь не знает — не дёргаем зря.
  if (!term || /\s/.test(term)) return EMPTY;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`,
      { signal: controller.signal },
    );
    clearTimeout(timer);
    if (!res.ok) return EMPTY;

    const data = (await res.json()) as DictEntry[] | unknown;
    if (!Array.isArray(data) || data.length === 0) return EMPTY;
    const entry = data[0] as DictEntry;

    let phonetic = entry.phonetic ?? "";
    if (!phonetic) {
      phonetic = entry.phonetics?.find((p) => p.text)?.text ?? "";
    }

    let example = "";
    for (const meaning of entry.meanings ?? []) {
      for (const def of meaning.definitions ?? []) {
        if (def.example) {
          example = def.example;
          break;
        }
      }
      if (example) break;
    }

    return { phonetic, example };
  } catch {
    return EMPTY;
  }
}

/**
 * Возвращает контекст слова, кэшируя его в карточке.
 * Пустой результат тоже кэшируется (''), чтобы не запрашивать повторно.
 */
export async function getWordContext(
  cardId: string,
): Promise<WordContext | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизовано" };

  const { data: card } = await supabase
    .from("cards")
    .select("id, front, phonetic, example")
    .eq("id", cardId)
    .single<{
      id: string;
      front: string;
      phonetic: string | null;
      example: string | null;
    }>();

  if (!card) return { error: "Карточка не найдена" };

  // Уже запрашивали раньше — отдаём из кэша.
  if (card.phonetic !== null) {
    return { phonetic: card.phonetic ?? "", example: card.example ?? "" };
  }

  const ctx = await fetchFromDictionary(card.front);
  // Ошибку апдейта намеренно игнорируем — контекст не критичен.
  await supabase.from("cards").update(ctx).eq("id", cardId);

  return ctx;
}
