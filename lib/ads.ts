export type AdPlacement = "leaderboard" | "square" | "fluid";

export const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID;

// NEXT_PUBLIC variables must be referenced literally to be inlined into the client bundle.
const SLOTS: Record<AdPlacement, string | undefined> = {
  leaderboard: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEADERBOARD,
  square: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SQUARE,
  fluid: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FLUID,
};

export function getAdSlot(placement: AdPlacement) {
  return SLOTS[placement];
}
