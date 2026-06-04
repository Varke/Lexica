import { createClient } from "@/lib/supabase/server";
import type { DeckRow, DeckWithCounts } from "@/lib/types";
import { DecksView } from "@/components/decks-view";

export default async function DecksPage() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: decks } = await supabase
    .from("decks")
    .select("*")
    .order("created_at", { ascending: true });

  // Считаем total и due точными count-запросами (head: true не тянет строки),
  // иначе PostgREST обрезает выборку на 1000 и счётчики занижаются.
  const withCounts: DeckWithCounts[] = await Promise.all(
    ((decks as DeckRow[]) ?? []).map(async (d) => {
      const [{ count: total }, { count: due }] = await Promise.all([
        supabase
          .from("cards")
          .select("*", { count: "exact", head: true })
          .eq("deck_id", d.id),
        supabase
          .from("cards")
          .select("*", { count: "exact", head: true })
          .eq("deck_id", d.id)
          .lte("due", nowIso),
      ]);
      return { ...d, total: total ?? 0, due: due ?? 0 };
    }),
  );

  return <DecksView decks={withCounts} />;
}
