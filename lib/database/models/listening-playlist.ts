// lib/database/models/listening-history.ts

import { Schema, model, models, Types } from "mongoose";

export interface IListeningHistory {
  user: Types.ObjectId;
  song: Types.ObjectId;

  listenedAt: Date;

  durationPlayed: number;
  completed: boolean;
}

const ListeningHistorySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    song: {
      type: Schema.Types.ObjectId,
      ref: "Song",
      required: true,
      index: true,
    },

    listenedAt: {
      type: Date,
      default: Date.now,
    },

    durationPlayed: Number,

    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const ListeningHistory =
  models.ListeningHistory ||
  model("ListeningHistory", ListeningHistorySchema);