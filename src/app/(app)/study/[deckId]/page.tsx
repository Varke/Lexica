import Link from "next/link";
import { notFound } from "next/navigation";
import { PartyPopper } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { CardRow, DeckRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StudySession } from "@/components/study-session";

const SESSION_LIMIT = 100;

export default async function StudyPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const supabase = await createClient();

  const { data: deck } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .single<DeckRow>();

  if (!deck) notFound();

  const { data: cards } = await supabase
    .from("cards")
    .select("*")
    .eq("deck_id", deckId)
    .lte("due", new Date().toISOString())
    .order("due", { ascending: true })
    .limit(SESSION_LIMIT);

  const queue = (cards as CardRow[]) ?? [];

  if (queue.length === 0) {
    return (
      <Card className="mx-auto max-w-md border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <PartyPopper className="size-10 text-emerald-600" />
          <p className="text-lg font-semibold">На сегодня всё повторено!</p>
          <p className="text-sm text-muted-foreground">
            В колоде «{deck.name}» нет карточек к повторению. Возвращайтесь позже.
          </p>
          <div className="mt-2 flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/decks/${deck.id}`}>К колоде</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Статистика</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <StudySession deckId={deck.id} deckName={deck.name} queue={queue} />;
}
