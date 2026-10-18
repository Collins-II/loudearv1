"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Activity, ArrowDownRight, ArrowUpRight, Minus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import StudioPageHeader from "@/components/studio/StudioPageHeader";
import { fetcher } from "@/lib/utils";

type Range = "24h" | "7d" | "30d";
type Metric = "play" | "like" | "download" | "share" | "view" | "comment";
type Counts = Partial<Record<Metric, number>>;

type CategoryData = {
  key: string;
  label: string;
  itemCount: number;
  totals: Counts;
  previous: Counts;
  livePlays: number;
  series: Array<{ t: string } & Record<Metric, number>>;
  top: Array<{ id: string; title: string; image: string; plays: number; listeners: number }>;
};

type ChartsResponse = { range: Range; generatedAt: number; categories: CategoryData[] };
type LiveEvent = { id: string; category: string; type: Metric; title: string; at: string };

const METRICS: Array<{ key: Metric; label: string; color: string }> = [
  { key: "play", label: "Plays", color: "#6366f1" },
  { key: "like", label: "Likes", color: "#ec4899" },
  { key: "download", label: "Downloads", color: "#10b981" },
  { key: "share", label: "Shares", color: "#f59e0b" },
  { key: "view", label: "Views", color: "#06b6d4" },
  { key: "comment", label: "Comments", color: "#8b5cf6" },
];
const VERBS: Record<Metric, string> = {
  play: "played",
  like: "liked",
  download: "downloaded",
  share: "shared",
  view: "viewed",
  comment: "commented on",
};

const RANGES: Range[] = ["24h", "7d", "30d"];
const chartConfig = {
  Song: { label: "Songs", color: "#6366f1" },
  Video: { label: "Videos", color: "#ec4899" },
  Album: { label: "Albums", color: "#10b981" },
} satisfies ChartConfig;
const nf = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function formatTick(t: string, range: Range) {
  const d = new Date(range === "24h" ? `${t}:00:00Z` : `${t}T00:00:00Z`);
  return range === "24h"
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric", timeZone: "UTC" });
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous && !current) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  const pct = previous ? ((current - previous) / previous) * 100 : 100;
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center text-xs font-medium ${up ? "text-emerald-500" : "text-red-500"}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export default function ChartsPage() {
  const [range, setRange] = useState<Range>("24h");
  const [metric, setMetric] = useState<Metric>("play");
  const [category, setCategory] = useState<string>("all");
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState<LiveEvent[]>([]);

  const { data, error, isLoading, isValidating, mutate } = useSWR<ChartsResponse>(
    `/api/studio/charts?range=${range}`,
    fetcher,
    { refreshInterval: connected ? 60_000 : 10_000, keepPreviousData: true, revalidateOnFocus: true }
  );

  // Live stream: apply events instantly to the cached data, then reconcile with the server.
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const reconcile = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const applyEvents = useCallback(
    (events: LiveEvent[]) => {
      setFeed((prev) => [...events.slice().reverse(), ...prev].slice(0, 30));
      void mutate(
        (current) => {
          if (!current) return current;
          const len = rangeRef.current === "24h" ? 13 : 10;
          return {
            ...current,
            categories: current.categories.map((c) => {
              const mine = events.filter((e) => e.category === c.key);
              if (!mine.length) return c;
              const totals = { ...c.totals };
              const series = c.series.map((p) => ({ ...p }));
              let livePlays = c.livePlays;
              for (const e of mine) {
                totals[e.type] = (totals[e.type] ?? 0) + 1;
                if (e.type === "play") livePlays += 1;
                const key = e.at.slice(0, len);
                let point = series.find((p) => p.t === key);
                if (!point) {
                  point = { t: key, play: 0, like: 0, download: 0, share: 0, view: 0, comment: 0 };
                  series.push(point);
                }
                point[e.type] += 1;
              }
              series.sort((a, b) => a.t.localeCompare(b.t));
              return { ...c, totals, series, livePlays };
            }),
          };
        },
        { revalidate: false }
      );
      clearTimeout(reconcile.current);
      reconcile.current = setTimeout(() => void mutate(), 5000);
    },
    [mutate]
  );

  useEffect(() => {
    const es = new EventSource("/api/studio/charts/stream");
    es.addEventListener("ready", () => setConnected(true));
    es.addEventListener("interactions", (e) => applyEvents(JSON.parse((e as MessageEvent).data)));
    es.onerror = () => setConnected(false);
    return () => {
      es.close();
      clearTimeout(reconcile.current);
      setConnected(false);
    };
  }, [applyEvents]);

  const categories = useMemo(() => data?.categories ?? [], [data]);
  const selected = useMemo(
    () => (category === "all" ? categories : categories.filter((c) => c.key === category)),
    [categories, category]
  );
  const metricMeta = METRICS.find((m) => m.key === metric)!;

  const combinedSeries = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    for (const c of selected) {
      for (const p of c.series) {
        const row = map.get(p.t) ?? { t: p.t };
        row[c.key] = p[metric];
        map.set(p.t, row);
      }
    }
    return Array.from(map.values()).sort((a, b) => String(a.t).localeCompare(String(b.t)));
  }, [selected, metric]);

  const totalFor = (m: Metric, prev = false) =>
    selected.reduce((sum, x) => sum + ((prev ? x.previous[m] : x.totals[m]) ?? 0), 0);

  const livePlays = selected.reduce((s, c) => s + c.livePlays, 0);
  const mix = categories.map((c) => ({ key: c.key, name: c.label, value: c.totals[metric] ?? 0, fill: `var(--color-${c.key})` }));
  const barData = METRICS.map((m) => ({
    name: m.label,
    ...Object.fromEntries(categories.map((c) => [c.key, c.totals[m.key] ?? 0])),
  }));
  const topItems = selected
    .flatMap((c) => c.top.map((t) => ({ ...t, category: c.label })))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 8);
  const visibleFeed = feed.filter((e) => category === "all" || e.category === category);

  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        <StudioPageHeader
          eyebrow="Live performance"
          title="Charts"
          description="Real-time engagement across your songs, videos and albums."
          actions={
            <>
              <Badge variant="outline" className="gap-2">
                <span className="relative flex h-2 w-2">
                  {connected && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`}
                  />
                </span>
                {connected ? "Live" : "Reconnecting"}
              </Badge>
              <Button variant="outline" size="icon" aria-label="Refresh charts" onClick={() => void mutate()}>
                <RefreshCw className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`} />
              </Button>
            </>
          }
        />

        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList>
              {RANGES.map((r) => (
                <TabsTrigger key={r} value={r}>
                  {r}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <ToggleGroup
            type="single"
            variant="outline"
            value={category}
            onValueChange={(v) => v && setCategory(v)}
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            {categories.map((c) => (
              <ToggleGroupItem key={c.key} value={c.key}>
                {c.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {error ? (
          <Card className="border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20">
            <CardContent className="pt-6 text-red-700 dark:text-red-200">Failed to load charts.</CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          <Card className="col-span-2 border-border bg-card/70 shadow-none md:col-span-4 lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Activity className="h-3.5 w-3.5 text-emerald-500" /> Last 5 min
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {isLoading ? <Skeleton className="h-8 w-12" /> : livePlays}
              </div>
              <div className="text-xs text-muted-foreground">plays</div>
            </CardContent>
          </Card>
          {METRICS.map((m) => (
            <Card
              key={m.key}
              role="button"
              tabIndex={0}
              onClick={() => setMetric(m.key)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setMetric(m.key)}
              className={`cursor-pointer border-border bg-card/70 shadow-none transition ${
                metric === m.key ? "ring-2 ring-primary" : "hover:bg-card"
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                  {m.label}
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {isLoading ? <Skeleton className="h-8 w-14" /> : nf.format(totalFor(m.key))}
                </div>
                <Delta current={totalFor(m.key)} previous={totalFor(m.key, true)} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="border-border bg-card/70 shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle>{metricMeta.label} over time</CardTitle>
              <CardDescription>Updates the moment activity happens.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <ChartContainer config={chartConfig} className="h-72 w-full">
                  <AreaChart data={combinedSeries}>
                    <defs>
                      {Object.keys(chartConfig).map((k) => (
                        <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={`var(--color-${k})`} stopOpacity={0.5} />
                          <stop offset="95%" stopColor={`var(--color-${k})`} stopOpacity={0.02} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="t"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(t) => formatTick(t, range)}
                      minTickGap={24}
                    />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                    <ChartTooltip
                      content={<ChartTooltipContent labelFormatter={(t) => formatTick(String(t), range)} />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {selected.map((c) => (
                      <Area
                        key={c.key}
                        type="monotone"
                        dataKey={c.key}
                        stroke={`var(--color-${c.key})`}
                        fill={`url(#grad-${c.key})`}
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    ))}
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/70 shadow-none">
            <CardHeader>
              <CardTitle>Live activity</CardTitle>
              <CardDescription>Latest interactions as they arrive.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72 pr-3">
                {visibleFeed.length ? (
                  <ul className="space-y-3">
                    {visibleFeed.map((e) => (
                      <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                        <span className="min-w-0">
                          <span className="text-muted-foreground">Someone {VERBS[e.type]} </span>
                          <span className="font-medium">{e.title}</span>
                        </span>
                        <Badge variant="secondary" className="shrink-0">
                          {new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-24 text-center text-sm text-muted-foreground">Waiting for new activity…</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="border-border bg-card/70 shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle>Engagement by category</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart data={barData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {categories.map((c) => (
                    <Bar key={c.key} dataKey={c.key} fill={`var(--color-${c.key})`} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/70 shadow-none">
            <CardHeader>
              <CardTitle>{metricMeta.label} share</CardTitle>
            </CardHeader>
            <CardContent>
              {mix.some((m) => m.value > 0) ? (
                <ChartContainer config={chartConfig} className="mx-auto h-64 w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
                    <Pie data={mix} dataKey="value" nameKey="key" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {mix.map((m) => (
                        <Cell key={m.key} fill={m.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="key" />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="py-24 text-center text-sm text-muted-foreground">No activity in this period.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card/70 shadow-none">
          <CardHeader>
            <CardTitle>Top performing</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Plays</TableHead>
                  <TableHead className="text-right">Listeners</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topItems.length ? (
                  topItems.map((t, i) => (
                    <TableRow key={`${t.category}-${t.id}`}>
                      <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-md">
                            <AvatarImage src={t.image} alt="" className="object-cover" />
                            <AvatarFallback className="rounded-md">{t.title.slice(0, 1)}</AvatarFallback>
                          </Avatar>
                          <span className="truncate font-medium">{t.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{nf.format(t.plays)}</TableCell>
                      <TableCell className="text-right tabular-nums">{nf.format(t.listeners)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No plays in this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
