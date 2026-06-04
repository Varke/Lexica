"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Papa from "papaparse";
import { Upload, Plus, FileUp } from "lucide-react";

import { parseImport } from "@/lib/import-parse";
import { addCards, addSingleCard } from "@/app/actions/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PLACEHOLDER = `apple - яблоко
to run — бежать
serendipity\tслучайная удача
book; книга`;

export function ImportDialog({ deckId }: { deckId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // --- Пачкой ---
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => parseImport(text), [text]);

  // --- По одной ---
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (res) => {
        // Превращаем строки CSV в текст «слово<TAB>перевод», далее общий парсер.
        const lines = res.data
          .map((row) =>
            Array.isArray(row) ? row.slice(0, 2).join("\t") : String(row),
          )
          .join("\n");
        setText((prev) => (prev ? prev + "\n" : "") + lines);
        toast.success(`Файл загружен: ${file.name}`);
      },
      error: () => toast.error("Не удалось прочитать файл"),
    });
    e.target.value = "";
  }

  function handleBatch() {
    if (parsed.cards.length === 0) {
      toast.error("Не найдено ни одной пары «слово — перевод»");
      return;
    }
    startTransition(async () => {
      const res = await addCards(deckId, parsed.cards);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Добавлено: ${res.added}` +
          (res.skipped ? `, пропущено дублей: ${res.skipped}` : ""),
      );
      setText("");
      setOpen(false);
      router.refresh();
    });
  }

  function handleSingle() {
    startTransition(async () => {
      const res = await addSingleCard(deckId, front, back);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.added === 0) {
        toast.error("Такое слово уже есть в колоде");
        return;
      }
      toast.success("Карточка добавлена");
      setFront("");
      setBack("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="size-4" />
          Импорт слов
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Импорт карточек</DialogTitle>
          <DialogDescription>
            Добавьте слова пачкой или по одному
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="batch">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="batch">Пачкой</TabsTrigger>
            <TabsTrigger value="single">По одной</TabsTrigger>
          </TabsList>

          {/* Пачкой */}
          <TabsContent value="batch" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Каждая строка — одна карточка. Разделитель: <code>таб</code>,{" "}
              <code> - </code>, <code> — </code>, <code>;</code>,{" "}
              <code>|</code> или <code>,</code>.
            </p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={8}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt"
                hidden
                onChange={handleFile}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp className="size-4" />
                Загрузить CSV/TSV
              </Button>
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary">
                  готово: {parsed.cards.length}
                </Badge>
                {parsed.duplicates > 0 && (
                  <Badge variant="outline">дубли: {parsed.duplicates}</Badge>
                )}
                {parsed.skipped > 0 && (
                  <Badge variant="outline">пропущено: {parsed.skipped}</Badge>
                )}
              </div>
            </div>

            {parsed.cards.length > 0 && (
              <div className="max-h-32 overflow-auto rounded-md border bg-muted/30 p-2 text-sm">
                {parsed.cards.slice(0, 50).map((c, i) => (
                  <div key={i} className="flex gap-2 py-0.5">
                    <span className="font-medium">{c.front}</span>
                    <span className="text-muted-foreground">→ {c.back}</span>
                  </div>
                ))}
                {parsed.cards.length > 50 && (
                  <div className="py-1 text-xs text-muted-foreground">
                    …и ещё {parsed.cards.length - 50}
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleBatch}
              disabled={pending || parsed.cards.length === 0}
            >
              Добавить {parsed.cards.length || ""} карточек
            </Button>
          </TabsContent>

          {/* По одной */}
          <TabsContent value="single" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="single-front">Слово (англ.)</Label>
              <Input
                id="single-front"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="apple"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="single-back">Перевод</Label>
              <Input
                id="single-back"
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="яблоко"
                onKeyDown={(e) => e.key === "Enter" && handleSingle()}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSingle}
              disabled={pending || !front.trim() || !back.trim()}
            >
              <Plus className="size-4" />
              Добавить карточку
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
