"use strict";
// models/Beat.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.Beat = void 0;
const mongoose_1 = require("mongoose");
require("./comment"); // Ensure comment virtuals work
const LicenseTierSchema = new mongoose_1.Schema({
    id: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    description: { type: String, trim: true },
    fileUrl: { type: String, trim: true },
    usageRights: [{ type: String, trim: true }],
}, { _id: false });
const BeatSchema = new mongoose_1.Schema({
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    producerName: { type: String, trim: true },
    genre: { type: String, trim: true },
    description: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    bpm: { type: Number },
    key: { type: String, trim: true },
    image: { type: String, trim: true },
    fileUrl: { type: String, required: true },
    previewUrl: { type: String, trim: true },
    licenseTiers: {
        type: [LicenseTierSchema],
        default: [],
    },
    visibility: {
        type: String,
        enum: ["public", "private", "unlisted"],
        default: "private",
    },
    // Engagement
    likes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    shares: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    downloads: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    views: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });
/* ------------------------------------------------------------------ */
/* VIRTUALS (comments) */
/* ------------------------------------------------------------------ */
BeatSchema.virtual("commentCount", {
    ref: "Comment",
    localField: "_id",
    foreignField: "targetId",
    count: true,
    match: { targetModel: "Beat" },
});
BeatSchema.virtual("latestComments", {
    ref: "Comment",
    localField: "_id",
    foreignField: "targetId",
    justOne: false,
    match: { targetModel: "Beat", parent: null },
    options: { sort: { createdAt: -1 }, limit: 5 },
});
// Output virtuals
BeatSchema.set("toObject", { virtuals: true });
BeatSchema.set("toJSON", { virtuals: true });
exports.Beat = (mongoose_1.models === null || mongoose_1.models === void 0 ? void 0 : mongoose_1.models.Beat) || (0, mongoose_1.model)("Beat", BeatSchema);
exports.default = exports.Beat;
