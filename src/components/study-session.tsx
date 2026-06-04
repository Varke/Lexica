"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PartyPopper, Volume2, Keyboard } from "lucide-react";

import type { CardRow } from "@/lib/types";
import {
  GRADES,
  GRADE_META,
  previewIntervals,
  humanizeInterval,
} from "@/lib/fsrs";
import { submitReview } from "@/app/actions/review";
import { getWordContext, type WordContext } from "@/app/actions/context";
import { speak, ttsSupported } from "@/lib/tts";
import { isAnswerCorrect } from "@/lib/answer-check";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

type Direction = "fwd" | "rev" | "mix";
type Settings = { direction: Direction; typing: boolean; tts: boolean };

const DEFAULT_SETTINGS: Settings = { direction: "fwd", typing: false, tts: true };
const SETTINGS_KEY = "anki.study.settings";

const DIR_OPTIONS: { value: Direction; label: string }[] = [
  { value: "fwd", label: "EN→RU" },
  { value: "rev", label: "RU→EN" },
  { value: "mix", label: "Микс" },
];

/** Сторона показа для «микса» — стабильно по id карточки. */
function effectiveDir(direction: Direction, id: string): "fwd" | "rev" {
  if (direction !== "mix") return direction;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h % 2 === 0 ? "fwd" : "rev";
}

/** Приводит транскрипцию к виду /…/. */
function fmtPhonetic(p: string): string {
  const t = p.trim().replace(/^\/+|\/+$/g, "");
  return t ? `/${t}/` : "";
}

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

  // --- Режим ввода ---
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);

  // --- Контекст слова (транскрипция + пример), подтянутый в этой сессии ---
  const [contextMap, setContextMap] = useState<Record<string, WordContext>>({});

  // --- Настройки сессии (запоминаются в localStorage) ---
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let loaded = DEFAULT_SETTINGS;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // игнорируем недоступный/битый localStorage
    }
    // localStorage недоступен на сервере, поэтому читаем после монтирования
    // (в инициализаторе useState это вызвало бы рассинхрон гидратации).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loaded);
    setMounted(true);
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // игнорируем
      }
      return next;
    });
  }, []);

  const current = queue[0];
  const dir = current ? effectiveDir(settings.direction, current.id) : "fwd";
  // front в БД — англ. слово, back — перевод. Английский озвучиваем всегда.
  const promptText = current ? (dir === "fwd" ? current.front : current.back) : "";
  const answerText = current ? (dir === "fwd" ? current.back : current.front) : "";
  // Контекст: из этой сессии (contextMap) либо уже сохранённый в карточке.
  const ctx = current ? contextMap[current.id] : undefined;
  const phonetic = fmtPhonetic(ctx?.phonetic ?? current?.phonetic ?? "");
  const example = ctx?.example ?? current?.example ?? "";

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
        setTyped("");
        setChecked(false);
      });
    },
    [current, pending],
  );

  const submitTyping = useCallback(() => {
    setChecked(true);
    setRevealed(true);
  }, []);

  const reveal = useCallback(() => {
    if (settings.typing) {
      if (!checked) submitTyping();
    } else {
      setRevealed((r) => !r);
    }
  }, [settings.typing, checked, submitTyping]);

  // Автопроизношение английского слова: в прямом направлении — на показе,
  // в обратном — когда открыт ответ (английский на обороте).
  useEffect(() => {
    if (!current || !settings.tts) return;
    if (effectiveDir(settings.direction, current.id) === "fwd") {
      speak(current.front);
    }
  }, [current, settings.tts, settings.direction]);

  useEffect(() => {
    if (!current || !settings.tts || !revealed) return;
    if (effectiveDir(settings.direction, current.id) === "rev") {
      speak(current.front);
    }
  }, [revealed, current, settings.tts, settings.direction]);

  // Лениво подтягиваем контекст слова. `phonetic === null` означает «ещё не
  // запрашивали»; undefined (нет колонки в БД) — пропускаем, чтобы не падать.
  useEffect(() => {
    if (!current || current.phonetic !== null) return;
    if (current.id in contextMap) return;
    let cancelled = false;
    getWordContext(current.id)
      .then((res) => {
        if (cancelled || "error" in res) return;
        setContextMap((m) => ({ ...m, [current.id]: res }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [current, contextMap]);

  // Клавиатура: Space/Enter — показать ответ (кроме режима ввода); 1–4 — оценка.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      if (!revealed) {
        if (!settings.typing && (e.code === "Space" || e.code === "Enter")) {
          e.preventDefault();
          setRevealed(true);
        }
        return;
      }
      if (["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        rate(Number(e.key));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, revealed, rate, settings.typing]);

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
  const answerCorrect = checked ? isAnswerCorrect(typed, answerText) : null;
  const showTts = mounted && ttsSupported();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{deckName}</span>
          <span>осталось: {queue.length}</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Настройки сессии: направление, режим ввода, звук */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="inline-flex rounded-md border p-0.5">
          {DIR_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => updateSettings({ direction: o.value })}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                settings.direction === o.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant={settings.typing ? "default" : "outline"}
          onClick={() => updateSettings({ typing: !settings.typing })}
        >
          <Keyboard className="size-4" />
          Ввод
        </Button>
        {showTts && (
          <Button
            type="button"
            size="sm"
            variant={settings.tts ? "default" : "outline"}
            onClick={() => updateSettings({ tts: !settings.tts })}
          >
            <Volume2 className="size-4" />
            Звук
          </Button>
        )}
      </div>

      {/* Карточка-переворот: клик или Пробел переворачивает.
          key по id — чтобы при переходе к новой карточке элемент пересоздавался
          и сразу показывал лицевую сторону без обратной анимации. */}
      <div className="relative [perspective:1200px]">
        {showTts && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Озвучить слово"
            className="absolute top-2 right-2 z-10 text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              speak(current.front);
            }}
          >
            <Volume2 className="size-4" />
          </Button>
        )}
        <div
          key={current.id}
          onClick={reveal}
          className={cn(
            "relative h-64 w-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d]",
            revealed && "[transform:rotateY(180deg)]",
          )}
        >
          {/* Лицевая сторона — вопрос */}
          <Card className="absolute inset-0 [backface-visibility:hidden]">
            <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="space-y-1">
                <p className="font-mono text-3xl font-semibold tracking-tight">
                  {promptText}
                </p>
                {dir === "fwd" && phonetic && (
                  <p className="font-mono text-sm text-muted-foreground">
                    {phonetic}
                  </p>
                )}
              </div>
              {!settings.typing && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  Нажмите на карточку или
                  <Kbd>Пробел</Kbd>
                </span>
              )}
            </CardContent>
          </Card>

          {/* Обратная сторона — ответ */}
          <Card className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <CardContent className="flex h-full flex-col items-center justify-center gap-2 overflow-hidden p-8 text-center">
              <p className="font-mono text-lg text-muted-foreground">
                {promptText}
              </p>
              <div className="h-px w-16 bg-border" />
              <p className="text-2xl font-medium">{answerText}</p>
              {dir === "rev" && phonetic && (
                <p className="font-mono text-sm text-muted-foreground">
                  {phonetic}
                </p>
              )}
              {example && (
                <p className="mt-1 max-w-prose text-sm italic text-muted-foreground">
                  «{example}»
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Режим ввода: поле для ответа / результат проверки */}
      {settings.typing && !checked && (
        <div className="flex gap-2">
          <Input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitTyping();
              }
            }}
            placeholder="Введите ответ и нажмите Enter…"
          />
          <Button type="button" onClick={submitTyping}>
            Проверить
          </Button>
        </div>
      )}
      {settings.typing && checked && (
        <div className="text-center text-sm">
          {answerCorrect ? (
            <span className="font-medium text-emerald-600">✓ Верно</span>
          ) : (
            <span className="text-rose-600">
              ✗ Ваш ответ: <span className="font-medium">{typed || "—"}</span> · верно:{" "}
              <span className="font-medium">{answerText}</span>
            </span>
          )}
        </div>
      )}

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
