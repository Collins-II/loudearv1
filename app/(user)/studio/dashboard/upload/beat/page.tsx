import { redirect } from "next/navigation";
import { UploadPageShell } from "@/components/studio/UploadPageShell";
import AddBeatForm from "@/components/studio/forms/AddBeatForm";
import { getCurrentUser } from "@/actions/getCurrentUser";

export default async function UploadBeatPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "producer") redirect("/forbidden");

  return (
    <UploadPageShell
      title="Upload a beat"
      description="List your instrumental on SoundHub with a custom preview and clear license options."
      icon="beat"
    >
      <AddBeatForm />
    </UploadPageShell>
  );
}
