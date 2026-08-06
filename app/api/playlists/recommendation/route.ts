import { generateForUser }
from "@/lib/playlists/generator";
import { getCurrentUser } from "@/actions/getCurrentUser";

export async function GET() {
  const user = getCurrentUser();

  if (!user)
    return Response.json([]);

  const playlist =
    await generateForUser("12323" as string);

  return Response.json(playlist);
}