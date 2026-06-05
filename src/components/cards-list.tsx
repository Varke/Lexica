"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Pencil, Check, X } from "lucide-react";

import type { CardRow } from "@/lib/types";
import { bucketOf, BUCKET_META, type BucketKey } from "@/lib/stats";
import { deleteCard, updateCard } from "@/app/actions/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const BUCKET_BADGE: Record<BucketKey, string> = {
  good: "bg-emerald-600",
  medium: "bg-amber-600",
  poor: "bg-rose-600",
  learning: "bg-sky-600",
  new: "bg-zinc-500",
};

export function CardsList({
  cards,
  deckId,
}: {
  cards: CardRow[];
  deckId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");

  // Инлайн-редактирование одной карточки.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  const filtered = query
    ? cards.filter(
        (c) =>
          c.front.toLowerCase().includes(query.toLowerCase()) ||
          c.back.toLowerCase().includes(query.toLowerCase()),
      )
    : cards;

  function startEdit(card: CardRow) {
    setEditingId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleSave(card: CardRow) {
    if (!editFront.trim() || !editBack.trim()) {
      toast.error("Заполните слово и перевод");
      return;
    }
    startTransition(async () => {
      const res = await updateCard(card.id, deckId, editFront, editBack);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setEditingId(null);
      toast.success("Карточка обновлена");
      router.refresh();
    });
  }

  function handleDelete(card: CardRow) {
    startTransition(async () => {
      const res = await deleteCard(card.id, deckId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Карточка удалена");
      router.refresh();
    });
  }

  if (cards.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-4xl">✍️</span>
          <p className="font-medium">В колоде пока нет слов</p>
          <p className="text-sm text-muted-foreground">
            Нажмите «Импорт слов», чтобы добавить карточки
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Поиск по словам…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-xs"
      />
      <div className="divide-y rounded-lg border">
        {filtered.map((card) => {
          const bucket = bucketOf(card);

          if (editingId === card.id) {
            return (
              <div key={card.id} className="flex items-center gap-2 px-4 py-2">
                <Input
                  value={editFront}
                  onChange={(e) => setEditFront(e.target.value)}
                  className="h-8 flex-1 font-mono"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave(card);
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                <span className="text-muted-foreground">→</span>
                <Input
                  value={editBack}
                  onChange={(e) => setEditBack(e.target.value)}
                  className="h-8 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave(card);
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-emerald-600"
                  disabled={pending}
                  onClick={() => handleSave(card)}
                  aria-label="Сохранить"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  disabled={pending}
                  onClick={cancelEdit}
                  aria-label="Отменить"
                >
                  <X className="size-4" />
                </Button>
              </div>
            );
          }

          return (
            <div
              key={card.id}
              className="group flex items-center gap-3 px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <span className="font-mono font-medium">{card.front}</span>
                <span className="mx-2 text-muted-foreground">→</span>
                <span className="text-muted-foreground">{card.back}</span>
              </div>
              <Badge className={BUCKET_BADGE[bucket]}>
                {BUCKET_META[bucket].label}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                disabled={pending}
                onClick={() => startEdit(card)}
                aria-label="Редактировать"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                disabled={pending}
                onClick={() => handleDelete(card)}
                aria-label="Удалить"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </div>
        )}
      </div>
    </div>
  );
}
