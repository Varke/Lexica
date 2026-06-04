import { createClient } from "@/lib/supabase/server";
import type { DeckRow, DeckWithCounts } from "@/lib/types";
import { DecksView } from "@/components/decks-view";

export default async function DecksPage() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [{ data: decks }, { data: cards }] = await Promise.all([
    supabase.from("decks").select("*").order("created_at", { ascending: true }),
    supabase.from("cards").select("deck_id, due"),
  ]);

  // Считаем total и due (к повторению) по каждой колоде на сервере.
  const totals = new Map<string, number>();
  const dues = new Map<string, number>();
  for (const c of cards ?? []) {
    const id = c.deck_id as string;
    totals.set(id, (totals.get(id) ?? 0) + 1);
    if ((c.due as string) <= nowIso) dues.set(id, (dues.get(id) ?? 0) + 1);
  }

  const withCounts: DeckWithCounts[] = ((decks as DeckRow[]) ?? []).map(
    (d) => ({
      ...d,
      total: totals.get(d.id) ?? 0,
      due: dues.get(d.id) ?? 0,
    }),
  );

  return <DecksView decks={withCounts} />;
}
