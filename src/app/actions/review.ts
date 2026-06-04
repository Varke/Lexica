"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Grade } from "ts-fsrs";
import { createClient } from "@/lib/supabase/server";
import { review } from "@/lib/fsrs";
import type { CardRow } from "@/lib/types";

/**
 * Применяет оценку к карточке: пересчитывает расписание FSRS,
 * обновляет cards и пишет строку в review_logs.
 * Возвращает обновлённую карточку (для возможного повтора в текущей сессии).
 */
export async function submitReview(cardId: string, grade: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row, error: fetchError } = await supabase
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .single<CardRow>();

  if (fetchError || !row) return { error: "Карточка не найдена" };

  const { card, log } = review(row, grade as Grade);

  const { error: updateError } = await supabase
    .from("cards")
    .update(card)
    .eq("id", cardId);
  if (updateError) return { error: updateError.message };

  await supabase.from("review_logs").insert({
    card_id: cardId,
    user_id: user.id,
    ...log,
  });

  revalidatePath("/dashboard");
  revalidatePath("/decks");

  return { card: { ...row, ...card } as CardRow };
}
