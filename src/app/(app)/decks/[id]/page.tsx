import Link from "next/link";
import { notFound } from "next/navigation";
import { Play } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { CardRow, DeckRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImportDialog } from "@/components/import-dialog";
import { CardsList } from "@/components/cards-list";

export default async function DeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: deck } = await supabase
    .from("decks")
    .select("*")
    .eq("id", id)
    .single<DeckRow>();

  if (!deck) notFound();

  const { data: cards } = await supabase
    .from("cards")
    .select("*")
    .eq("deck_id", id)
    .order("created_at", { ascending: false });

  const rows = (cards as CardRow[]) ?? [];
  const nowMs = Date.now();
  const due = rows.filter((c) => new Date(c.due).getTime() <= nowMs).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/decks"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Все колоды
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {deck.name}
          </h1>
          <div className="mt-2 flex gap-2">
            <Badge variant="secondary">{rows.length} слов</Badge>
            {due > 0 ? (
              <Badge className="bg-emerald-600">{due} к повторению</Badge>
            ) : (
              <Badge variant="outline">всё повторено</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <ImportDialog deckId={deck.id} />
          <Button asChild disabled={due === 0} variant={due > 0 ? "default" : "secondary"}>
            <Link href={`/study/${deck.id}`}>
              <Play className="size-4" />
              Учить
            </Link>
          </Button>
        </div>
      </div>

      <CardsList cards={rows} deckId={deck.id} />
    </div>
  );
}
