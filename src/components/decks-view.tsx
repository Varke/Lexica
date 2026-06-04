"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, Pencil, Plus, Play, Trash2 } from "lucide-react";

import type { DeckWithCounts } from "@/lib/types";
import { createDeck, deleteDeck, renameDeck } from "@/app/actions/decks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DecksView({ decks }: { decks: DeckWithCounts[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<DeckWithCounts | null>(null);
  const [editName, setEditName] = useState("");

  function handleCreate() {
    startTransition(async () => {
      const res = await createDeck(name);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Колода создана");
      setName("");
      setCreateOpen(false);
      router.refresh();
    });
  }

  function handleRename() {
    if (!editing) return;
    startTransition(async () => {
      const res = await renameDeck(editing.id, editName);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Переименовано");
      setEditing(null);
      router.refresh();
    });
  }

  function handleDelete(deck: DeckWithCounts) {
    if (!confirm(`Удалить колоду «${deck.name}» со всеми карточками?`)) return;
    startTransition(async () => {
      const res = await deleteDeck(deck.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Колода удалена");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Колоды</h1>
          <p className="text-sm text-muted-foreground">
            Создавайте колоды и наполняйте их словами
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Новая колода
        </Button>
      </div>

      {decks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-4xl">🗂️</span>
            <p className="font-medium">Пока нет ни одной колоды</p>
            <p className="text-sm text-muted-foreground">
              Создайте первую колоду и импортируйте слова
            </p>
            <Button className="mt-2" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Создать колоду
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <Card key={deck.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="min-w-0 text-base leading-6">
                  <Link
                    href={`/decks/${deck.id}`}
                    className="block truncate hover:underline"
                    title={deck.name}
                  >
                    {deck.name}
                  </Link>
                </CardTitle>
                <CardAction>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-mr-1.5 -mt-1 size-8 text-muted-foreground"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-auto min-w-40">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditing(deck);
                        setEditName(deck.name);
                      }}
                    >
                      <Pencil className="size-4" />
                      Переименовать
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleDelete(deck)}
                    >
                      <Trash2 className="size-4" />
                      Удалить
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardAction>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="flex gap-2">
                  <Badge variant="secondary">{deck.total} слов</Badge>
                  {deck.due > 0 ? (
                    <Badge className="bg-emerald-600">
                      {deck.due} к повторению
                    </Badge>
                  ) : (
                    <Badge variant="outline">всё повторено</Badge>
                  )}
                </div>
              </CardContent>

              <CardFooter className="gap-2">
                <Button
                  asChild
                  className="flex-1"
                  disabled={deck.due === 0}
                  variant={deck.due > 0 ? "default" : "secondary"}
                >
                  <Link href={`/study/${deck.id}`}>
                    <Play className="size-4" />
                    Учить
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/decks/${deck.id}`}>Открыть</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Создание колоды */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая колода</DialogTitle>
            <DialogDescription>
              Например: «Топ-1000 английских слов»
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="deck-name">Название</Label>
            <Input
              id="deck-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={pending}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Переименование */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать колоду</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-name">Название</Label>
            <Input
              id="edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handleRename} disabled={pending}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
