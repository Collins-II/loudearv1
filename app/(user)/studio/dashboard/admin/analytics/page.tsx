// app/artist/[id]/analytics/page.tsx
"use client";

import React from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OverviewGrid } from "@/components/analytics/OverviewGrid";
import { PlaysChart } from "@/components/analytics/PlaysChart";
import { TopTracksTable } from "@/components/analytics/TopTracksTable";
import { GeoTable } from "@/components/analytics/GeoTable";
import { RealtimePlays } from "@/components/analytics/RealtimePlays";
import StudioPageHeader from "@/components/studio/StudioPageHeader";
import { Download, RefreshCw } from "lucide-react";
import { fetcher } from "@/lib/utils";
import type { ArtistAnalyticsResponse } from "@/types/analytics";

export default function ArtistAnalyticsPage() {
  const params = useParams();
  const artistId = params?.id ?? "me";

  const { data, error, isLoading, mutate } = useSWR<ArtistAnalyticsResponse>(
    `/api/analytics/user/${artistId}`,
    fetcher,
    { refreshInterval: 30_000 }
  );

  const exportCsv = () => {
    const rows = [
      ["Title", "Qualified plays", "Listeners"],
      ...(data?.topTracks ?? []).map((track) => [track.title, String(track.plays), String(track.listeners)]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "loudear-artist-analytics.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-7">
        <StudioPageHeader
          eyebrow="Audience & performance"
          title="Analytics"
          description="Qualified plays, listener reach, and settled royalties over the last 30 days."
          actions={
            <>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data?.topTracks?.length}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
              <Button variant="outline" size="icon" aria-label="Refresh analytics" onClick={() => void mutate()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </>
          }
        />

        {/* Data not loaded / error */}
        {error && (
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
            <CardContent>
              <div className="text-red-700 dark:text-red-200">Failed to load analytics.</div>
            </CardContent>
          </Card>
        )}

        {/* Overview */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <OverviewGrid data={data?.overview} loading={isLoading} />
        </motion.div>

        {/* Charts + Realtime + Geo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border bg-card/70 shadow-none">
              <CardHeader>
                <CardTitle>Daily play history</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <PlaysChart series={[]} loading />
                ) : data?.timeseries?.length ? (
                  <PlaysChart series={data.timeseries} />
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No qualified plays in the last 30 days.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card/70 shadow-none">
              <CardHeader>
                <CardTitle>Top Music & Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <TopTracksTable items={data?.topTracks ?? []} loading={isLoading} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border bg-card/70 shadow-none">
              <CardHeader>
                <CardTitle>Live activity</CardTitle>
              </CardHeader>
              <CardContent>
                <RealtimePlays artistId={data?.artistId ?? ""} />
              </CardContent>
            </Card>

            <Card className="border-border bg-card/70 shadow-none">
              <CardHeader>
                <CardTitle>Listener geography</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading listener geography...</p>
                ) : data?.geo?.length ? (
                  <GeoTable items={data.geo} loading={isLoading} />
                ) : (
                  <p className="text-sm text-muted-foreground">No country data. Configure a trusted GEOIP_COUNTRY_HEADER.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
