import { Schema, model, models, Types } from "mongoose";

export interface IStanEvent {
  fan: Types.ObjectId;
  artist: Types.ObjectId;
  createdAt: Date;
}

// Timestamped follow log; the User.stan array stays the source of truth for the current state
const StanEventSchema = new Schema<IStanEvent>(
  {
    fan: { type: Schema.Types.ObjectId, ref: "User", required: true },
    artist: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StanEventSchema.index({ fan: 1, artist: 1 }, { unique: true });
StanEventSchema.index({ artist: 1, createdAt: -1 });

export const StanEvent =
  models.StanEvent || model<IStanEvent>("StanEvent", StanEventSchema);
