import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/database";
import { User } from "@/lib/database/models/user";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid registration details" }, { status: 400 });
    }
    const registration = body as Record<string, unknown>;

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.isNewUser !== true) {
      return NextResponse.json(
        { error: "Registration has already been completed" },
        { status: 403 }
      );
    }
    const role = registration.role;
    const name = registration.name;
    const stageName = registration.stageName;
    const genres = registration.genres;
    if (
      (role !== "fan" && role !== "artist" && role !== "producer") ||
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 100 ||
      (role !== "fan" &&
        (typeof stageName !== "string" || !stageName.trim() || stageName.length > 100)) ||
      !Array.isArray(genres) ||
      genres.length > 20 ||
      !genres.every((genre) => typeof genre === "string" && genre.trim().length <= 40)
    ) {
      return NextResponse.json(
        { error: "Role, profile name, and music preferences are required to complete registration" },
        { status: 400 }
      );
    }

    const optionalString = (value: unknown, maxLength: number) =>
      typeof value === "string" ? value.trim().slice(0, maxLength) : undefined;
    user.name = name.trim();
    user.stageName = role === "fan" ? undefined : (stageName as string).trim();
    user.bio = optionalString(registration.bio, 2000);
    user.location = optionalString(registration.location, 200);
    user.phone = optionalString(registration.phone, 40);
    user.genres = genres.map((genre: string) => genre.trim()).filter(Boolean);
    user.role = role;
    if (registration.image !== undefined) {
      if (typeof registration.image !== "string") {
        return NextResponse.json({ error: "Invalid profile image URL" }, { status: 400 });
      }
      try {
        const imageUrl = new URL(registration.image);
        if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "res.cloudinary.com") {
          return NextResponse.json({ error: "Invalid profile image URL" }, { status: 400 });
        }
        user.image = registration.image;
      } catch {
        return NextResponse.json({ error: "Invalid profile image URL" }, { status: 400 });
      }
    }

    // ✅ Mark registration as complete
    user.isNewUser = false;

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Registration completed successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        stageName: user.stageName,
        bio: user.bio,
        location: user.location,
        phone: user.phone,
        genres: user.genres,
        isNewUser: false,
      },
    });
  } catch (error: any) {
    console.error("Complete registration error:", error);
    return NextResponse.json(
      { error: "Failed to complete registration", details: error.message },
      { status: 500 }
    );
  }
}
