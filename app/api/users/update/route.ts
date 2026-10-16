import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { User } from "@/lib/database/models/user";
import { getCurrentUser } from "@/actions/getCurrentUser";

export async function PATCH(req: Request) {
  try {
    await connectToDatabase();
    const session = await getCurrentUser();

    if (!session?._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();

    const name = form.get("name") as string;
    const bio = form.get("bio") as string;
    const location = form.get("location") as string;
    const phone = form.get("phone") as string;
    const stageName = form.get("stageName") as string;
    const requestedRole = form.get("role");
    const imageUrlString = form.get("imageUrl");
    const bannerImageUrlString = form.get("bannerImageUrl");

    const currentRole = session.role === "artist" || session.role === "producer"
      ? session.role
      : "fan";
    const isOnboarding = session.isNewUser === true;
    if (
      requestedRole !== null &&
      requestedRole !== "fan" &&
      requestedRole !== "artist" &&
      requestedRole !== "producer"
    ) {
      return NextResponse.json({ error: "Invalid account role" }, { status: 400 });
    }
    if (
      requestedRole !== null &&
      !isOnboarding &&
      requestedRole !== currentRole
    ) {
      return NextResponse.json(
        { error: "Account role cannot be changed after registration" },
        { status: 403 }
      );
    }
    if (
      isOnboarding &&
      (
        requestedRole === null ||
        typeof form.get("name") !== "string" ||
        !(form.get("name") as string).trim() ||
        ((requestedRole === "artist" || requestedRole === "producer") &&
          (typeof form.get("stageName") !== "string" || !(form.get("stageName") as string).trim())) ||
        !form.has("genres")
      )
    ) {
      return NextResponse.json(
        { error: "Complete the role, profile, and preferences steps before finishing registration" },
        { status: 400 }
      );
    }

    let genres: unknown;
    let socials: unknown;
    let payout: unknown;
    try {
      genres = JSON.parse((form.get("genres") as string) || "[]");
      socials = JSON.parse((form.get("socials") as string) || "{}");
      payout = JSON.parse((form.get("payout") as string) || "{}");
    } catch {
      return NextResponse.json({ error: "Invalid profile data" }, { status: 400 });
    }
    if (
      !Array.isArray(genres) ||
      genres.length > 20 ||
      !genres.every((genre) => typeof genre === "string" && genre.length <= 40) ||
      !socials || typeof socials !== "object" || Array.isArray(socials) ||
      !payout || typeof payout !== "object" || Array.isArray(payout)
    ) {
      return NextResponse.json({ error: "Invalid profile data" }, { status: 400 });
    }

    const socialLinks = socials as Record<string, unknown>;
    const payoutDetails = payout as Record<string, unknown>;
    const mobileMoney = {
      provider: typeof payoutDetails.network === "string"
        ? payoutDetails.network
        : undefined,
      phoneNumber: typeof payoutDetails.phone === "string"
        ? payoutDetails.phone.trim().slice(0, 40)
        : undefined,
    };
    const isSafeImageUrl = (value: FormDataEntryValue | null) => {
      if (value === null || value === "") return true;
      if (typeof value !== "string") return false;
      try {
        const url = new URL(value);
        return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
      } catch {
        return false;
      }
    };
    if (!isSafeImageUrl(imageUrlString) || !isSafeImageUrl(bannerImageUrlString)) {
      return NextResponse.json({ error: "Profile images must be uploaded securely" }, { status: 400 });
    }

    const allowedSocials = ["instagram", "twitter", "facebook", "tiktok", "youtube", "website"];
    for (const [key, value] of Object.entries(socialLinks)) {
      if (!allowedSocials.includes(key) || typeof value !== "string" || value.length > 300) {
        return NextResponse.json({ error: "Invalid social profile link" }, { status: 400 });
      }
      if (value.trim()) {
        try {
          const url = new URL(value);
          if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
        } catch {
          return NextResponse.json({ error: `Enter a valid URL for ${key}` }, { status: 400 });
        }
      }
    }

    const role = isOnboarding && requestedRole
      ? requestedRole
      : currentRole;

    const updatePayload: Record<string, unknown> = {
      role,
    };
    if (typeof imageUrlString === "string") updatePayload.image = imageUrlString;
    if (typeof bannerImageUrlString === "string") {
      updatePayload.bannerImage = bannerImageUrlString;
    }
    if (typeof name === "string") updatePayload.name = name.trim().slice(0, 100);
    if (typeof bio === "string") updatePayload.bio = bio.slice(0, 2000);
    if (typeof location === "string") updatePayload.location = location.trim().slice(0, 200);
    if (typeof phone === "string") updatePayload.phone = phone.trim().slice(0, 40);
    if (role !== "fan" && typeof stageName === "string") {
      updatePayload.stageName = stageName.trim().slice(0, 100);
    }
    if (form.has("genres")) updatePayload.genres = genres;
    if (form.has("socials")) {
      updatePayload.socialLinks = Object.fromEntries(
        allowedSocials.map((key) => [key, String(socialLinks[key] ?? "").trim()])
      );
    }
    if (form.has("payout")) {
      updatePayload["payment.mobileMoney"] = mobileMoney;
    }

    const updatedUser = await User.findByIdAndUpdate(
      session._id,
      {
        $set: {
          ...updatePayload,
          ...(isOnboarding ? { isNewUser: false } : {}),
        },
      },
      { new: true, runValidators: true }
    ).select("_id name email role stageName image bannerImage bio location genres socialLinks isNewUser").lean();

    return NextResponse.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });

  } catch (error: any) {
    console.error("[PROFILE_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
