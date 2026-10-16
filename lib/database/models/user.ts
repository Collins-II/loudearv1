import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * LoudEar User Interface
 * Supports both Fan and Artist profiles
 */

export interface IWallet {
  balance: number;
  currency?: string;
  locked?: number;
  pendingPayout?: number;
  history?: Types.ObjectId[]; // optional references to transactions
}
export interface IUser extends Document {
  _id: Types.ObjectId;
  // Core info
  name: string;
  email: string;
  image?: string;
  bannerImage?: string;
  role: "fan" | "artist" | "producer";
  isNewUser?: boolean;
  bio?: string;
  location?: string;
  phone?: string;
  wallet: IWallet;

  // Shared music-related preferences
  genres?: string[];

  // Fan-specific
  stan?: Types.ObjectId[];

  // Artist-specific
  stageName?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
    website?: string;
  };
  isVerified?: boolean;
  followers?: Types.ObjectId[];
  following?: Types.ObjectId[];
  tracks?: Types.ObjectId[];
  albums?: Types.ObjectId[];
  streamsCount?: number;
  likesCount?: number;

  // Monetization / payment info
  payment?: {
    stripeAccountId?: string;
    paypalEmail?: string;
    payoutEnabled?: boolean;
    payoutFrequency?: "daily" | "weekly" | "monthly";
    payoutTime?: string; // e.g., "01:00"
    mobileMoney?: {
      provider?: "MTN" | "Airtel" | "Zamtel" | "Other";
      phoneNumber?: string;
      verified?: boolean;
      country?: string;
    };
  };

  // Profile completion and gamification
  profileCompletion?: {
    percentage: number;
    completedSteps: string[];
    lastUpdated: Date;
  };

  // System fields
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  toSafeJSON(): Record<string, any>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    image: { type: String },
    bannerImage: { type: String, trim: true },
    role: {
      type: String,
      enum: ["fan", "artist", "producer"],
      default: "fan",
      index: true,
    },
    isNewUser: { type: Boolean },

    bio: { type: String, maxlength: 2000 },
    location: { type: String, maxlength: 200 },
    phone: { type: String, trim: true },
   wallet: {
  balance: { type: Number, default: 0 },
  currency: { type: String, default: "ZMW" },
  locked: { type: Number, default: 0 },              // ← FIXED
  pendingPayout: { type: Number, default: 0 },       // ← ENSURE DEFAULT
  history: [{ type: Schema.Types.ObjectId, ref: "Transaction" }],
    },
    genres: [{ type: String, trim: true }],

    // Fan side
    stan: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // Artist-specific
    stageName: { type: String, trim: true, maxlength: 100 },
    socialLinks: {
      instagram: { type: String, trim: true },
      twitter: { type: String, trim: true },
      facebook: { type: String, trim: true },
      tiktok: { type: String, trim: true },
      youtube: { type: String, trim: true },
      website: { type: String, trim: true },
    },
    isVerified: { type: Boolean, default: false },
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    tracks: [{ type: Schema.Types.ObjectId, ref: "Track" }],
    albums: [{ type: Schema.Types.ObjectId, ref: "Album" }],
    streamsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },

    // 💳 Monetization
    payment: {
      stripeAccountId: { type: String, trim: true },
      paypalEmail: { type: String, trim: true, lowercase: true },
      payoutEnabled: { type: Boolean, default: false },
      payoutFrequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      default: "monthly",
      },
      payoutTime: { type: String}, // e.g., "01:00"
      mobileMoney: {
        provider: {
          type: String,
          enum: ["MTN", "Airtel", "Zamtel", "Other"],
          trim: true,
        },
        phoneNumber: { type: String, trim: true },
        verified: { type: Boolean, default: false },
        country: { type: String, trim: true, default: "ZM" }, // ISO country code
      },
    },

    // 🎯 Profile completion gamification
    profileCompletion: {
      percentage: { type: Number, default: 0 },
      completedSteps: [{ type: String }],
      lastUpdated: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

/** 🔍 Index for faster queries */
UserSchema.index({ name: "text", stageName: "text", genres: 1 });
// Follower counts and lookups query by the followed artist id
UserSchema.index({ stan: 1 });

/** 🧠 Static helper methods */
UserSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

/** ✨ Instance method to sanitize output (remove private fields) */
UserSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.phone;
  delete obj.email;
  delete obj.payment; // Hide all payment info (including mobile money)
  return obj;
};

/** ⚙ Prevent recompilation on hot reload */
export const User: Model<IUser> =
  mongoose.models?.User || mongoose.model<IUser>("User", UserSchema);

export default User;
