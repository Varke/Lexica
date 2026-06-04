/** Строка таблицы decks. */
export type DeckRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

/** Строка таблицы cards (слово/перевод + состояние FSRS). */
export type CardRow = {
  id: string;
  deck_id: string;
  user_id: string;
  front: string;
  back: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  learning_steps: number;
  state: number;
  last_review: string | null;
  created_at: string;
  // Контекст слова (лениво подтягивается из словаря).
  // null — не запрашивали; '' — запрашивали, данных нет.
  phonetic: string | null;
  example: string | null;
};

/** Строка таблицы review_logs. */
export type ReviewLogRow = {
  id: string;
  card_id: string;
  user_id: string;
  rating: number;
  state: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  last_elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  review: string;
};

/** Колода со счётчиками для списка. */
export type DeckWithCounts = DeckRow & {
  total: number;
  due: number;
};
