import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/getCurrentUser";
import ProfileSettingsForm from "@/components/profiles/ProfileSettingsForm";

export const metadata = {
  title: "Edit profile | LoudEar",
  description: "Manage your LoudEar profile and public presence.",
};

export default async function EditProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-8">
      <div className="mx-auto mb-8 max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Your account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Profile settings</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Build a profile that feels like you. Your private account details stay private.
        </p>
      </div>
      <ProfileSettingsForm
        user={{
          _id: String(user._id),
          name: user.name,
          role: user.role,
          stageName: user.stageName,
          image: user.image,
          bannerImage: user.bannerImage,
          bio: user.bio,
          location: user.location,
          phone: user.phone,
          genres: user.genres,
          socialLinks: user.socialLinks,
        }}
      />
    </main>
  );
}
