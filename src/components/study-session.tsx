"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PartyPopper } from "lucide-react";

import type { CardRow } from "@/lib/types";
import {
  GRADES,
  GRADE_META,
  previewIntervals,
  humanizeInterval,
} from "@/lib/fsrs";
import { submitReview } from "@/app/actions/review";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export function StudySession({
  deckId,
  deckName,
  queue: initialQueue,
}: {
  deckId: string;
  deckName: string;
  queue: CardRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [queue, setQueue] = useState<CardRow[]>(initialQueue);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const total = initialQueue.length;

  const current = queue[0];
  const now = useMemo(() => new Date(), [current?.id, revealed]);
  const intervals = useMemo(
    () => (current ? previewIntervals(current, now) : null),
    [current, now],
  );

  const rate = useCallback(
    (grade: number) => {
      if (!current || pending) return;
      startTransition(async () => {
        const res = await submitReview(current.id, grade);
        if (res.error) {
          toast.error(res.error);
          return;
        }

        const updated = res.card!;
        setQueue((q) => {
          const rest = q.slice(1);
          // Карточки в стадии заучивания (Learning/Relearning) возвращаются в конец очереди.
          if (updated.state === 1 || updated.state === 3) {
            return [...rest, updated];
          }
          return rest;
        });
        setDone((d) => d + 1);
        setRevealed(false);
      });
    },
    [current, pending],
  );

  // Клавиатура: Space/Enter — показать ответ; 1–4 — оценка.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      if (!revealed && (e.code === "Space" || e.code === "Enter")) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        rate(Number(e.key));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, revealed, rate]);

  // Сессия завершена.
  if (!current) {
    return (
      <Card className="mx-auto max-w-md border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <PartyPopper className="size-10 text-emerald-600" />
          <p className="text-lg font-semibold">Сессия завершена 🎉</p>
          <p className="text-sm text-muted-foreground">
            Повторено карточек: {done}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                router.refresh();
                router.push(`/decks/${deckId}`);
              }}
            >
              К колоде
            </Button>
            <Button asChild>
              <Link href="/dashboard">Статистика</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = total > 0 ? (done / (done + queue.length)) * 100 : 0;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{deckName}</span>
          <span>осталось: {queue.length}</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Карточка-переворот: клик или Пробел переворачивает.
          key по id — чтобы при переходе к новой карточке элемент пересоздавался
          и сразу показывал лицевую сторону без обратной анимации (иначе на долю
          секунды виден перевод следующей карточки во время поворота). */}
      <div className="[perspective:1200px]">
        <div
          key={current.id}
          onClick={() => setRevealed((r) => !r)}
          className={cn(
            "relative h-64 w-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d]",
            revealed && "[transform:rotateY(180deg)]",
          )}
        >
          {/* Лицевая сторона — слово */}
          <Card className="absolute inset-0 [backface-visibility:hidden]">
            <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="font-mono text-3xl font-semibold tracking-tight">
                {current.front}
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                Нажмите на карточку или
                <Kbd>Пробел</Kbd>
              </span>
            </CardContent>
          </Card>

          {/* Обратная сторона — перевод */}
          <Card className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <CardContent className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="font-mono text-lg text-muted-foreground">
                {current.front}
              </p>
              <div className="h-px w-16 bg-border" />
              <p className="text-2xl font-medium">{current.back}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {revealed && intervals && (
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map((grade) => {
            const meta = GRADE_META[grade];
            return (
              <Button
                key={grade}
                onClick={() => rate(grade)}
                disabled={pending}
                className={cn("flex h-auto flex-col gap-1 py-3 text-white", meta.className)}
              >
                <span className="text-sm font-semibold">{meta.label}</span>
                <span className="text-xs opacity-90">
                  {humanizeInterval(now, intervals[grade])}
                </span>
                <Kbd className="bg-white/20 text-white">{meta.key}</Kbd>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
