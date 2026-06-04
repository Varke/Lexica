import {
  fsrs,
  generatorParameters,
  Rating,
  type Card as FsrsCard,
  type Grade,
} from "ts-fsrs";
import type { CardRow } from "./types";

/** Единый экземпляр планировщика FSRS (с лёгким «дрожанием» интервалов). */
const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

/** Оценки, которые показываем пользователю (Manual=0 не используем). */
export const GRADES = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;

export const GRADE_META: Record<
  Grade,
  { label: string; key: string; className: string }
> = {
  [Rating.Again]: { label: "Снова", key: "1", className: "bg-rose-600 hover:bg-rose-600/90" },
  [Rating.Hard]: { label: "Трудно", key: "2", className: "bg-amber-600 hover:bg-amber-600/90" },
  [Rating.Good]: { label: "Хорошо", key: "3", className: "bg-emerald-600 hover:bg-emerald-600/90" },
  [Rating.Easy]: { label: "Легко", key: "4", className: "bg-sky-600 hover:bg-sky-600/90" },
};

/** Поля FSRS из строки БД → объект Card библиотеки ts-fsrs. */
export function rowToCard(row: CardRow): FsrsCard {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    learning_steps: row.learning_steps,
    state: row.state,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

/** Поля Card ts-fsrs → объект для записи в таблицу cards. */
export function cardToRow(card: FsrsCard) {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: card.learning_steps,
    state: card.state,
    last_review: card.last_review
      ? new Date(card.last_review).toISOString()
      : null,
  };
}

/**
 * Применяет оценку к карточке.
 * Возвращает обновлённые поля карточки и запись в журнал для review_logs.
 */
export function review(row: CardRow, grade: Grade, now = new Date()) {
  const { card, log } = scheduler.next(rowToCard(row), now, grade);
  return {
    card: cardToRow(card),
    log: {
      rating: log.rating,
      state: log.state,
      due: new Date(log.due).toISOString(),
      stability: log.stability,
      difficulty: log.difficulty,
      elapsed_days: log.elapsed_days,
      last_elapsed_days: log.last_elapsed_days,
      scheduled_days: log.scheduled_days,
      learning_steps: log.learning_steps,
      review: new Date(log.review).toISOString(),
    },
  };
}

/**
 * Для каждой оценки считает дату следующего показа — для подписей на кнопках.
 */
export function previewIntervals(
  row: CardRow,
  now = new Date(),
): Record<Grade, Date> {
  const rec = scheduler.repeat(rowToCard(row), now);
  return {
    [Rating.Again]: rec[Rating.Again].card.due,
    [Rating.Hard]: rec[Rating.Hard].card.due,
    [Rating.Good]: rec[Rating.Good].card.due,
    [Rating.Easy]: rec[Rating.Easy].card.due,
  } as Record<Grade, Date>;
}

/** Человекочитаемый интервал до даты: «<1 мин», «10 мин», «3 ч», «4 дн». */
export function humanizeInterval(from: Date, to: Date): string {
  const ms = to.getTime() - from.getTime();
  const min = ms / 60000;
  if (min < 1) return "<1 мин";
  if (min < 60) return `${Math.round(min)} мин`;
  const hours = min / 60;
  if (hours < 24) return `${Math.round(hours)} ч`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)} дн`;
  const months = days / 30;
  if (months < 12) return `${Math.round(months)} мес`;
  return `${(days / 365).toFixed(1)} г`;
}

export { Rating };
