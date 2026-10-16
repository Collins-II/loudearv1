// app/wallet/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { DollarSign, Download, CreditCard, Upload, Wallet, PieChart } from "lucide-react";
import StudioPageHeader from "@/components/studio/StudioPageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, timeAgo } from "@/lib/utils";

/* -------------------------
   Types
-------------------------- */
type WalletData = {
  balance: number;
  locked: number;
  pendingPayout: number;
  currency: string;
};

type Tx = {
  _id: string;
  type: string;
  amount: number;
  currency: string;
  createdAt: string;
  status: string;
};

type RecentData = {
  transactions: Tx[];
};

type AnalyticsData = {
  last30DaysIncome: number;
  lifetimeEarnings: number;
};

/* -------------------------
   API Helpers
-------------------------- */
async function apiFetchWallet() {
  const res = await fetch("/api/wallet", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch wallet");
  return res.json();
}

async function apiRequestPayout(payload: any) {
  const res = await fetch("/api/wallet/payout", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Payout request failed");
  if (result.success === false) throw new Error(result.error || "Payout failed");
  return result;
}

/* -------------------------
   Skeleton Loader Components
-------------------------- */
function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="h-6 bg-muted animate-pulse rounded-md mb-2" />
      <CardContent className="h-12 bg-muted animate-pulse rounded-md" />
    </Card>
  );
}

function SkeletonTableRow() {
  return (
    <TableRow>
      {[...Array(5)].map((_, idx) => (
        <TableCell key={idx} className="h-6 bg-muted animate-pulse rounded-md" />
      ))}
    </TableRow>
  );
}

/* -------------------------
   Wallet Page Component
-------------------------- */
export default function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [recent, setRecent] = useState<RecentData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [filter, setFilter] = useState("all");

  /* Withdraw modal state */
  const [openWithdraw, setOpenWithdraw] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState("MTN");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");

  const loadWallet = async () => {
    setLoading(true);
    try {
      const data = await apiFetchWallet();
      setWallet(data.wallet);
      setRecent({ transactions: data.recent.transactions });
      setAnalytics(data.analytics);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const visibleTx = useMemo(() => {
    if (!recent) return [];
    if (filter === "all") return recent.transactions;
    return recent.transactions.filter((t) => t.type === filter);
  }, [recent, filter]);

  const balanceDisplay = wallet ? formatCurrency(wallet.balance / 100, wallet.currency) : "--";

  const handleRequestPayout = async () => {
    if (!wallet) return;
    const amountNum = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountNum) || amountNum <= 0) return alert("Enter a valid amount");
    if (amountNum > wallet.balance) return alert("Insufficient balance");
    if (!destination.trim()) return alert("Enter a mobile money number");

    const payload = {
      provider: withdrawMethod,
      phone: destination.trim(),
      amount: amountNum,
      currency: wallet.currency,
      idempotencyKey: crypto.randomUUID(),
    };

    try {
      const result = await apiRequestPayout(payload);
      setOpenWithdraw(false);
      setAmount("");
      setDestination("");
      await loadWallet();
      if (result.status === "processing") {
        alert("Payout submitted and is awaiting provider confirmation.");
      } else {
        alert("Payout completed.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Payout failed");
      await loadWallet();
    }
  };

  const exportCSV = () => {
    if (!recent) return;
    const rows = [
      ["ID", "Type", "Amount", "Currency", "Status", "Date"],
      ...recent.transactions.map((t) => [
        t._id,
        t.type,
        (t.amount / 100).toFixed(2),
        t.currency,
        t.status,
        t.createdAt,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallet_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-7">
        <StudioPageHeader
          eyebrow="Available funds & activity"
          title="Wallet"
          description="Available balance, reserved campaign funds, payouts, and transaction history."
          actions={
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={loading || !recent?.transactions.length}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          }
        />

        <div className="flex justify-end">
            <Dialog open={openWithdraw} onOpenChange={setOpenWithdraw}>
              <DialogTrigger asChild>
                <Button disabled={loading}>
                  <CreditCard className="mr-2" /> Withdraw
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-lg">
                <h3 className="text-lg font-bold mb-3">Request Withdrawal</h3>

                <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                    <SelectTrigger>{withdrawMethod}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTN">MTN</SelectItem>
                    <SelectItem value="AIRTEL">Airtel</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Mobile money number"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="mt-3"
                />

                <Input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-3"
                />

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="ghost" onClick={() => setOpenWithdraw(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRequestPayout}>Confirm</Button>
                </div>
              </DialogContent>
            </Dialog>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
          {loading
            ? [...Array(5)].map((_, idx) => <SkeletonCard key={idx} />)
            : wallet && analytics && (
                <>
                  <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-none">
                    <CardHeader className="flex items-center gap-2 pb-2 text-xs font-medium uppercase text-muted-foreground">
                      <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Available
                    </CardHeader>
                    <CardContent className="text-xl font-semibold tabular-nums">{balanceDisplay}</CardContent>
                  </Card>

                  <Card className="border-border bg-card/70 shadow-none">
                    <CardHeader className="flex items-center gap-2 pb-2 text-xs font-medium uppercase text-muted-foreground">
                      <Upload className="h-4 w-4" /> Pending payout
                    </CardHeader>
                    <CardContent className="text-xl font-semibold tabular-nums">
                      {formatCurrency(wallet.pendingPayout / 100, wallet.currency)}
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-card/70 shadow-none">
                    <CardHeader className="flex items-center gap-2 pb-2 text-xs font-medium uppercase text-muted-foreground">
                      <CreditCard className="h-4 w-4" /> Campaign funds locked
                    </CardHeader>
                    <CardContent className="text-xl font-semibold tabular-nums">
                      {formatCurrency(wallet.locked / 100, wallet.currency)}
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-card/70 shadow-none">
                    <CardHeader className="flex items-center gap-2 pb-2 text-xs font-medium uppercase text-muted-foreground">
                      <DollarSign className="h-4 w-4" /> Last 30 days
                    </CardHeader>
                    <CardContent className="text-xl font-semibold tabular-nums">
                      {formatCurrency(analytics.last30DaysIncome / 100, wallet.currency)}
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-card/70 shadow-none">
                    <CardHeader className="flex items-center gap-2 pb-2 text-xs font-medium uppercase text-muted-foreground">
                      <PieChart className="h-4 w-4" /> Lifetime earnings
                    </CardHeader>
                    <CardContent className="text-xl font-semibold tabular-nums">
                      {formatCurrency(analytics.lifetimeEarnings / 100, wallet.currency)}
                    </CardContent>
                  </Card>
                </>
              )}
        </div>

        {/* TRANSACTIONS */}
        <Card className="border-border bg-card/70 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border">
            <div>
              <h3 className="font-semibold">Transactions</h3>
              <p className="mt-1 text-xs text-muted-foreground">Latest wallet activity</p>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32">{filter}</SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="royalty">Royalties</SelectItem>
                <SelectItem value="wallet_topup">Top-ups</SelectItem>
                <SelectItem value="campaign_payment">Campaigns</SelectItem>
                <SelectItem value="payout">Payout</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHeader>

              <tbody>
                {loading
                  ? [...Array(5)].map((_, idx) => <SkeletonTableRow key={idx} />)
                  : visibleTx?.length ? visibleTx.map((t) => (
                      <TableRow key={t._id}>
                        <TableCell><span title={t._id} className="font-mono text-xs text-muted-foreground">{t._id.slice(-8)}</span></TableCell>
                        <TableCell>{t.type}</TableCell>
                        <TableCell>{formatCurrency(t.amount / 100, t.currency)}</TableCell>
                        <TableCell>
                          <Badge variant={t.status === "completed" || t.status === "settled" || t.status === "success" ? "default" : t.status === "failed" ? "destructive" : "secondary"}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{timeAgo(t.createdAt)}</TableCell>
                      </TableRow>
                    )) : <tr><td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">No transactions match this filter.</td></tr>}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
