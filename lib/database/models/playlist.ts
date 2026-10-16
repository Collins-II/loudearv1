import { Document, model, models, Schema, Types } from "mongoose";

export interface IPlaylist extends Document {
  owner: Types.ObjectId;
  name: string;
  description: string;
  visibility: "public" | "unlisted" | "private";
  tracks: { song: Types.ObjectId; addedAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const PlaylistSchema = new Schema<IPlaylist>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    visibility: {
      type: String,
      enum: ["public", "unlisted", "private"],
      default: "private",
      index: true,
    },
    tracks: [
      {
        _id: false,
        song: { type: Schema.Types.ObjectId, ref: "Song", required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

PlaylistSchema.index({ owner: 1, updatedAt: -1 });

export const Playlist =
  models.Playlist || model<IPlaylist>("Playlist", PlaylistSchema);