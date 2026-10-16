import mongoose, { Schema } from "mongoose";

const CampaignEventSchema = new Schema(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    eventId: { type: String, required: true },
    type: { type: String, enum: ["impression", "click"], required: true },
    viewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true },
    country: { type: String, match: /^[A-Z]{2}$/ },
  },
  { timestamps: true }
);

CampaignEventSchema.index({ campaignId: 1, eventId: 1, type: 1 }, { unique: true });
CampaignEventSchema.index({ campaignId: 1, viewerId: 1, day: 1, type: 1 }, { unique: true });
CampaignEventSchema.index({ campaignId: 1, createdAt: -1 });

export const CampaignEvent =
  mongoose.models.CampaignEvent || mongoose.model("CampaignEvent", CampaignEventSchema);

export default CampaignEvent;