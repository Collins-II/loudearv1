import ProfileSettingsForm from "@/components/profiles/ProfileSettingsForm";
import { getCurrentUser } from "@/actions/getCurrentUser";

export default async function StudioProfileEditPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Creator studio</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Profile settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your creator identity and public profile.</p>
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
    </div>
  );
}
