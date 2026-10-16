// File: /app/(user)/studio/dashboard/royalties/page.tsx
"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { PlusCircle, UserPlus, Download, Sparkles } from "lucide-react";
import { jsPDF } from "jspdf";                      // ← NEW

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import StudioPageHeader from "@/components/studio/StudioPageHeader";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ---------------------------------------------------------------------------
// AI Auto-Split Suggestion Engine
// ---------------------------------------------------------------------------
function computeAiSplitSuggestions(track: any) {
  if (!track) return [];

  const collabs: any[] = [];
  if (track.artist) collabs.push({ name: track.artist, weight: 1.0 });
  if (Array.isArray(track.features))
    track.features.forEach((f: string) =>
      collabs.push({ name: f, weight: 0.5 })
    );

  if (track.genre === "Hip-Hop") collabs.forEach((c) => (c.weight += 0.2));
  if (track.mood === "emotional") collabs.forEach((c) => (c.weight += 0.1));

  const totalWeight = collabs.reduce((s, c) => s + c.weight, 0);
  return collabs.map((c) => ({
    collaboratorName: c.name,
    percent: Number(((c.weight / totalWeight) * 100).toFixed(1)),
  }));
}

// ---------------------------------------------------------------------------

export default function RoyaltiesPage() {
  const { data: tracksRes, mutate: mutateTracks } = useSWR(
    "/api/royalties/tracks",
    fetcher
  );

  const [selected, setSelected] = useState<string | null>(null);
  const [splits, setSplits] = useState<any[]>([]);
  const [loadingSplits, setLoadingSplits] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPct, setNewPct] = useState<number | "">("");

  // Prefill first track
  useEffect(() => {
    if (tracksRes?.songs?.length) setSelected(tracksRes.songs[0]._id);
  }, [tracksRes]);

  const loadSplits = useCallback(async (songId: string | null) => {
    if (!songId) return;
    setLoadingSplits(true);
    const res = await fetch(`/api/royalties/splits/${songId}`);
    const json = await res.json();
    setSplits(json.splits || []);
    setLoadingSplits(false);
  }, []);

  useEffect(() => {
    if (selected) loadSplits(selected);
  }, [selected, loadSplits]);

  const sum = (arr: any[]) =>
    arr.reduce((s, x) => s + (Number(x.percent) || 0), 0);

  // ---------------------------------------------------------------------------
  // PDF EXPORT — Replaces old JSON export
  // ---------------------------------------------------------------------------
  const onExport = async () => {
    const res = await fetch("/api/royalties/tracks");
    const json = await res.json();
    const songs = json.songs || [];

    const doc = new jsPDF({ unit: "pt" });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Royalty Split Report", 40, 50);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 70);

    let y = 110;

    for (const s of songs) {
      const r = await fetch(`/api/royalties/splits/${s._id}`);
      const j = await r.json();
      const splits = j.splits || [];

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`${s.title}`, 40, y);
      y += 20;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Total Allocated: ${s.allocatedPercent}%`, 40, y);
      y += 20;

      doc.setFont("Helvetica", "bold");
      doc.text(`Splits:`, 40, y);
      y += 20;

      for (const sp of splits) {
        doc.setFont("Helvetica", "normal");

        doc.text(
          `• ${sp.collaboratorName} (${sp.percent}%) — ${
            sp.destination || sp.collaboratorEmail || "No payout set"
          }`,
          60,
          y
        );

        y += 18;

        if (y > 760) {
          doc.addPage();
          y = 60;
        }
      }

      y += 30;
      if (y > 760) {
        doc.addPage();
        y = 60;
      }
    }

    doc.save("royalty-splits.pdf");
  };

  // ---------------------------------------------------------------------------

  const onAdd = async () => {
    if (!selected) return alert("Select track");
    if (!newName || !newPct) return alert("Enter name & percent");

    const pct = Number(newPct);
    if (pct <= 0 || pct > 100) return alert("Invalid percent");
    if (sum(splits) + pct > 100) return alert("Total exceeds 100%");

    const res = await fetch(`/api/royalties/splits/${selected}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collaboratorName: newName,
        collaboratorEmail: newEmail,
        percent: pct,
      }),
    });

    const json = await res.json();
    if (json.error) return alert(json.error);

    setNewName("");
    setNewEmail("");
    setNewPct("");

    await loadSplits(selected);
    mutateTracks();
  };

  const onUpdatePct = async (splitId: string, percent: number) => {
    if (!selected) return;

    const res = await fetch(`/api/royalties/splits/${selected}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ splitId, percent }),
    });

    const json = await res.json();
    if (json.error) return alert(json.error);

    await loadSplits(selected);
    mutateTracks();
  };

  const onRemove = async (splitId: string) => {
    if (!selected) return;
    if (!confirm("Remove split?")) return;

    const res = await fetch(`/api/royalties/splits/${selected}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ splitId }),
    });

    const json = await res.json();
    if (json.error) return alert(json.error);

    await loadSplits(selected);
    mutateTracks();
  };

  const onInvite = async (splitId: string) => {
    const res = await fetch("/api/royalties/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ splitId }),
    });

    const j = await res.json();
    if (j.error) return alert(j.error);

    alert("Invite sent!");
    await loadSplits(selected);
  };

  const selectedTrack = tracksRes?.songs?.find((s: any) => s._id === selected);
  const aiSuggestions = useMemo(
    () => computeAiSplitSuggestions(selectedTrack),
    [selectedTrack]
  );

  const applySuggestion = async () => {
    if (!selected || !aiSuggestions.length) return;

    for (const s of aiSuggestions) {
      await fetch(`/api/royalties/splits/${selected}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collaboratorName: s.collaboratorName,
          percent: s.percent,
        }),
      });
    }

    await loadSplits(selected);
    mutateTracks();
  };

  return (
    <main className="min-h-full text-foreground">
      <div className="mx-auto max-w-7xl space-y-7">
        <StudioPageHeader
          eyebrow="Collaborators & ownership"
          title="Royalty splits"
          description="Set transparent revenue shares for your releases and invite collaborators to claim them."
        />

        <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>

            {/* INVITE COLLORATOR */}
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" /> Invite collaborator
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite collaborator</DialogTitle>
                </DialogHeader>

                <Input
                  placeholder="Collaborator name"
                  className="mb-2"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />

                <Input
                  placeholder="Collaborator email"
                  className="mb-2"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />

                <Input
                  placeholder="Percent"
                  type="number"
                  className="mb-2"
                  value={newPct as any}
                  onChange={(e) => setNewPct(Number(e.target.value))}
                />

                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline">Cancel</Button>
                  <Button
                    onClick={async () => {
                      if (!selected) return alert("Select a track first");

                      const r = await fetch(
                        `/api/royalties/splits/${selected}`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            collaboratorName: newName,
                            collaboratorEmail: newEmail,
                            percent: Number(newPct) || 0,
                          }),
                        }
                      );

                      const j = await r.json();
                      if (j.error) return alert(j.error);

                      await fetch("/api/royalties/invite", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ splitId: j.split._id }),
                      });

                      setNewName("");
                      setNewEmail("");
                      setNewPct("");

                      await loadSplits(selected);
                      mutateTracks();
                      alert("Invite sent");
                    }}
                  >
                    Send Invite
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* TRACK LIST */}
          <Card className="border-border bg-card/70 shadow-none">
            <CardHeader className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-semibold">Your tracks</h3>
                <p className="mt-1 text-xs text-muted-foreground">Select a release to manage shares</p>
              </div>
              <Badge variant="secondary">{tracksRes?.songs?.length ?? 0}</Badge>
            </CardHeader>

            <CardContent className="max-h-[620px] overflow-y-auto p-2">
              <div className="space-y-1">
                {!tracksRes && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Loading tracks…</p>}
                {tracksRes?.songs?.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Your uploaded songs will appear here.</p>}
                {tracksRes?.songs?.map((t: any) => (
                  <button
                    key={t._id}
                    onClick={() => {
                      setSelected(t._id);
                      loadSplits(t._id);
                    }}
                    className={`w-full border-l-2 px-3 py-3 text-left transition-colors 
                      ${
                        t._id === selected
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-transparent hover:bg-muted/70"
                      }
                    `}
                  >
                    <div className="font-semibold">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.allocatedPercent}% allocated · {t.splitsCount} splits
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* RIGHT PANEL */}
          <Card className="border-border bg-card/70 shadow-none lg:col-span-2">
            <CardHeader className="flex items-center justify-between border-b border-border">
              <div>
                <h3 className="text-lg font-bold">
                  {selectedTrack?.title ?? "Select a track"}
                </h3>
                <div className="text-sm text-muted-foreground">
                  <span className="tabular-nums">{sum(splits)}% allocated</span>
                  <span className="mx-2 text-border">·</span>
                  <span className="text-xs">{Math.max(0, 100 - sum(splits))}% available</span>
                </div>
                <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${Math.min(sum(splits), 100)}%` }} />
                </div>
              </div>

              {selectedTrack && aiSuggestions.length > 0 && (
                <Button variant="outline" size="sm" onClick={applySuggestion}>
                  <Sparkles size={16} className="mr-1" /> AI Auto-Split
                </Button>
              )}
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {/* TABLE */}
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Percent</TableCell>
                      <TableCell>Destination</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHeader>

                  <tbody>
                    {loadingSplits && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Loading collaborators…</td>
                      </tr>
                    )}
                    {!loadingSplits && selected && splits.length === 0 && (
                      <tr><td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No shares yet. Add the first collaborator below.</td></tr>
                    )}

                    {!loadingSplits &&
                      splits.map((s) => (
                        <TableRow key={s._id}>
                          <TableCell>{s.collaboratorName}</TableCell>

                          <TableCell>
                            <input
                              type="number"
                              aria-label={`Share percent for ${s.collaboratorName}`}
                              min={0}
                              max={100}
                              step="0.1"
                              value={s.percent}
                              onChange={(e) =>
                                onUpdatePct(s._id, Number(e.target.value))
                              }
                              className="w-20 border border-input bg-background px-2 py-1 text-sm tabular-nums"
                            />
                            %
                          </TableCell>

                          <TableCell>
                            {s.destination ?? s.collaboratorEmail ?? "—"}
                          </TableCell>

                          <TableCell>
                            {s.verified ? (
                              <Badge>Verified</Badge>
                            ) : (
                              <Badge variant="secondary">Unverified</Badge>
                            )}
                          </TableCell>

                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onInvite(s._id)}
                            >
                              Invite
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemove(s._id)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </tbody>
                </Table>
                </div>

                {/* ADD NEW SPLIT */}
                <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Collaborator name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />

                  <Input
                    placeholder="Email (optional)"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />

                  <Input
                    placeholder="Percent"
                    type="number"
                    min={0.1}
                    max={100}
                    step="0.1"
                    className="sm:w-28"
                    value={newPct as any}
                    onChange={(e) => setNewPct(Number(e.target.value))}
                  />

                  <Button onClick={onAdd} disabled={!selected || !newName.trim() || !newPct} aria-label="Add royalty split">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <strong>Notes:</strong> Splits must add up to 100% before payout
                  can be finalized. Invite collaborators so they can connect
                  payout accounts.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
