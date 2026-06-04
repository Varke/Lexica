"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { BucketKey } from "@/lib/stats";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const BUCKET_ORDER: BucketKey[] = ["good", "medium", "poor", "learning", "new"];

const BUCKET_LABEL: Record<BucketKey, string> = {
  good: "Выучено",
  medium: "Средне",
  poor: "Плохо",
  learning: "Изучается",
  new: "Новые",
};

const BUCKET_COLOR: Record<BucketKey, string> = {
  good: "#059669", // emerald-600
  medium: "#d97706", // amber-600
  poor: "#e11d48", // rose-600
  learning: "#0284c7", // sky-600
  new: "#71717a", // zinc-500
};

export function StatsCharts({
  buckets,
  reviewsByDay,
}: {
  buckets: Record<BucketKey, number>;
  reviewsByDay: { date: string; count: number }[];
}) {
  const pieData = BUCKET_ORDER.filter((k) => buckets[k] > 0).map((k) => ({
    key: k,
    name: BUCKET_LABEL[k],
    value: buckets[k],
    color: BUCKET_COLOR[k],
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Распределение по уровню запоминания */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Как запомнены слова</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-52 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.key} fill={d.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-2 text-sm">
              {BUCKET_ORDER.map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-sm"
                    style={{ backgroundColor: BUCKET_COLOR[k] }}
                  />
                  <span className="flex-1">{BUCKET_LABEL[k]}</span>
                  <span className="font-medium tabular-nums">
                    {buckets[k]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Повторения за неделю */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Повторения за 7 дней</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reviewsByDay}>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  fontSize={12}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    fontSize: 13,
                  }}
                  labelFormatter={(l) => `Дата: ${l}`}
                  formatter={(v) => [v, "повторений"]}
                />
                <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
