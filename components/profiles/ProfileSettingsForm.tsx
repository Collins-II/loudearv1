"use client";

import ProfileEditForm from "@/components/forms/profile-edit-form";

interface ProfileSettingsFormProps {
  user: {
    _id: string;
    name: string;
    email?: string;
    role?: string;
    stageName?: string;
    image?: string;
    bannerImage?: string;
    bio?: string;
    location?: string;
    phone?: string;
    genres?: string[];
    socialLinks?: {
      instagram?: string;
      twitter?: string;
      facebook?: string;
      tiktok?: string;
      youtube?: string;
      website?: string;
    };
  };
}

export default function ProfileSettingsForm({ user }: ProfileSettingsFormProps) {
  return (
    <ProfileEditForm
      user={{
        _id: user._id,
        name: user.name,
        email: user.email ?? "",
        role: user.role,
        image: user.image,
        bio: user.bio,
        location: user.location,
        phone: user.phone,
        genres: user.genres,
      }}
    />
  );
}
