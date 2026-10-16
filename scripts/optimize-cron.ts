// scripts/cron-optimize.ts
import { connectToDatabase } from "@/lib/database";
import fetch from "node-fetch";

async function run() {
  await connectToDatabase();
  // call the endpoint (or import the optimizer directly)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_BASE_URL must be configured.");
  const res = await fetch(`${appUrl}/api/optimize`, { method: "POST", body: JSON.stringify({}) });
  console.log(await res.json());
}

run().catch(console.error);
