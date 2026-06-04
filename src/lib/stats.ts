import type { CardRow, ReviewLogRow } from "./types";

/** Порог «зрелости» карточки в днях (как в Anki — 21 день). */
const MATURE_DAYS = 21;
const MEDIUM_DAYS = 7;
const STRUGGLE_LAPSES = 4;

export type BucketKey = "new" | "learning" | "poor" | "medium" | "good";

export const BUCKET_META: Record<
  BucketKey,
  { label: string; color: string }
> = {
  good: { label: "Выучено", color: "var(--color-good)" },
  medium: { label: "Средне", color: "var(--color-medium)" },
  poor: { label: "Плохо", color: "var(--color-poor)" },
  learning: { label: "Изучается", color: "var(--color-learning)" },
  new: { label: "Новые", color: "var(--color-new)" },
};

/** Относит карточку к корзине по состоянию FSRS и стабильности памяти. */
export function bucketOf(card: CardRow): BucketKey {
  // 0 New, 1 Learning, 2 Review, 3 Relearning
  if (card.state === 0) return "new";
  if (card.state === 1 || card.state === 3) return "learning";
  // state === 2 (Review)
  if (card.stability < MEDIUM_DAYS || card.lapses >= STRUGGLE_LAPSES)
    return "poor";
  if (card.stability < MATURE_DAYS) return "medium";
  return "good";
}

export type Stats = {
  total: number;
  buckets: Record<BucketKey, number>;
  dueToday: number;
  reviewedToday: number;
  reviewsByDay: { date: string; count: number }[];
};

const DAY_MS = 86_400_000;

/** Собирает сводную статистику по карточкам и журналу повторений. */
export function computeStats(
  cards: CardRow[],
  logs: ReviewLogRow[],
  now = new Date(),
): Stats {
  const buckets: Record<BucketKey, number> = {
    new: 0,
    learning: 0,
    poor: 0,
    medium: 0,
    good: 0,
  };

  let dueToday = 0;
  const nowMs = now.getTime();
  for (const card of cards) {
    buckets[bucketOf(card)]++;
    if (new Date(card.due).getTime() <= nowMs) dueToday++;
  }

  // Повторения по дням за последние 7 дней (включая сегодня).
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const counts = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfToday.getTime() - i * DAY_MS);
    counts.set(dayKey(d), 0);
  }

  let reviewedToday = 0;
  for (const log of logs) {
    const key = dayKey(new Date(log.review));
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    if (new Date(log.review).getTime() >= startOfToday.getTime())
      reviewedToday++;
  }

  const reviewsByDay = [...counts.entries()].map(([date, count]) => ({
    date,
    count,
  }));

  return { total: cards.length, buckets, dueToday, reviewedToday, reviewsByDay };
}

function dayKey(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}
