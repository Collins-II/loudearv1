import { redirect } from "next/navigation";
import ClientIndex from "./components/ClientIndex";
import Beat from "@/lib/database/models/beat";
import { getCurrentUser } from "@/actions/getCurrentUser";

export const dynamic = "force-dynamic";

export default async function ProducerBeatsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "producer") redirect("/forbidden");

  const beats = await Beat.find({ author: user._id })
    .sort({ createdAt: -1 })
    .select("_id title bpm key genre price image visibility createdAt")
    .lean();

  const serializedBeats = beats.map((beat) => ({
    id: String(beat._id),
    title: beat.title,
    bpm: beat.bpm ?? null,
    key: beat.key ?? "",
    genre: beat.genre ?? "",
    price: beat.price ?? 0,
    image: beat.image ?? "",
    visibility: beat.visibility,
    createdAt: beat.createdAt?.toISOString() ?? "",
  }));

  return <ClientIndex data={serializedBeats} />;
}
