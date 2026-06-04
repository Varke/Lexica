import Link from "next/link";
import { BookOpen, GraduationCap, Flame, CalendarClock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { CardRow, ReviewLogRow } from "@/lib/types";
import { computeStats } from "@/lib/stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCharts } from "@/components/stats-charts";

const WEEK_MS = 7 * 86_400_000;

export default async function DashboardPage() {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();

  const [cards, logs] = await Promise.all([
    fetchAll<CardRow>((from, to) =>
      supabase.from("cards").select("*").range(from, to),
    ),
    fetchAll<ReviewLogRow>((from, to) =>
      supabase
        .from("review_logs")
        .select("*")
        .gte("review", weekAgo)
        .range(from, to),
    ),
  ]);

  const stats = computeStats(cards, logs);

  const weekReviews = stats.reviewsByDay.reduce((s, d) => s + d.count, 0);

  const metrics = [
    {
      label: "Всего слов",
      value: stats.total,
      icon: BookOpen,
      color: "text-sky-600",
    },
    {
      label: "Выучено",
      value: stats.buckets.good,
      icon: GraduationCap,
      color: "text-emerald-600",
    },
    {
      label: "К повторению сейчас",
      value: stats.dueToday,
      icon: CalendarClock,
      color: "text-amber-600",
    },
    {
      label: "Повторений за неделю",
      value: weekReviews,
      icon: Flame,
      color: "text-rose-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Статистика</h1>
          <p className="text-sm text-muted-foreground">
            Прогресс изучения слов
          </p>
        </div>
        <Button asChild>
          <Link href="/decks">К колодам</Link>
        </Button>
      </div>

      {stats.total === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-4xl">📈</span>
            <p className="font-medium">Пока нет данных</p>
            <p className="text-sm text-muted-foreground">
              Создайте колоду и добавьте слова — статистика появится здесь
            </p>
            <Button asChild className="mt-2">
              <Link href="/decks">Создать колоду</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => (
              <Card key={m.label} size="sm">
                <CardContent className="flex items-center gap-3">
                  <m.icon className={`size-7 shrink-0 ${m.color}`} />
                  <div className="min-w-0">
                    <div className="text-2xl font-bold leading-tight">
                      {m.value}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {m.label}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <StatsCharts
            buckets={stats.buckets}
            reviewsByDay={stats.reviewsByDay}
          />
        </>
      )}
    </div>
  );
}
