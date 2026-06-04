"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createEmptyCard } from "ts-fsrs";
import { createClient } from "@/lib/supabase/server";
import { cardToRow } from "@/lib/fsrs";
import type { ParsedCard } from "@/lib/import-parse";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Создаёт пустую (новую) карточку с дефолтными полями FSRS. */
function buildCard(
  deckId: string,
  userId: string,
  front: string,
  back: string,
) {
  return {
    deck_id: deckId,
    user_id: userId,
    front,
    back,
    ...cardToRow(createEmptyCard()),
  };
}

export async function addCards(deckId: string, cards: ParsedCard[]) {
  if (cards.length === 0) return { error: "Нет карточек для добавления" };

  const { supabase, user } = await requireUser();

  // Не дублируем слова, которые уже есть в колоде.
  const { data: existing } = await supabase
    .from("cards")
    .select("front")
    .eq("deck_id", deckId);

  const have = new Set(
    (existing ?? []).map((r) => (r.front as string).toLowerCase()),
  );

  const rows = cards
    .filter((c) => !have.has(c.front.toLowerCase()))
    .map((c) => buildCard(deckId, user.id, c.front, c.back));

  if (rows.length === 0)
    return { added: 0, skipped: cards.length };

  const { error } = await supabase.from("cards").insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/decks");
  revalidatePath("/dashboard");
  return { added: rows.length, skipped: cards.length - rows.length };
}

export async function addSingleCard(
  deckId: string,
  front: string,
  back: string,
) {
  const f = front.trim();
  const b = back.trim();
  if (!f || !b) return { error: "Заполните слово и перевод" };
  return addCards(deckId, [{ front: f, back: b }]);
}

export async function deleteCard(id: string, deckId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
