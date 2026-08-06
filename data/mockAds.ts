import { AdSize } from "@/components/ads/AdBanner";

export interface MockAdData {
  id: string;
  companyName: string;
  destinationUrl: string;
  imageUrl: string;
  altText: string;
  size: AdSize;
  gamblingWarning?: string;
}

export const mockAdDatabase: MockAdData[] = [
  {
    id: "ad-betway-01",
    companyName: "Betway",
    destinationUrl: "https://betway.com",
    // Replace with actual loaded asset path or hotlinked production URL
    imageUrl: "/assets/ads/btika-av1.jpg", 
    altText: "Get up to 100% First Deposit Bonus! Fast payouts and live match streaming.",
    size: "leaderboard",
    gamblingWarning: "18+ Only. Terms & Conditions Apply. Play Responsibly. Gambling can be addictive.",
  },
  {
    id: "ad-betika-02",
    companyName: "Betika",
    destinationUrl: "https://betika.com",
    imageUrl: "/assets/ads/btika-av1.jpg",
    altText: "Grand Jackpot is LIVE! Win millions with a small stake today.",
    size: "square",
    gamblingWarning: "Gaming is for 18 years and above. Betting is addictive. Regulated by BCLB.",
  },
  {
    id: "ad-techstore-03",
    companyName: "Nexus Tech",
    destinationUrl: "https://example.com",
    imageUrl: "/assets/ads/btika-av1.jpg",
    altText: "Upgrade your stack. 20% off all mechanical keyboards and custom desks.",
    size: "skyscraper",
    // No gambling warning needed for normal ecommerce businesses
  },
  {
    id: "ad-broken-fallback-demo",
    companyName: "SportyBet (Simulated Broken Asset)",
    destinationUrl: "https://sportybet.com",
    imageUrl: "/assets/ads/btika-aviator.jpg", // Intentionally broken to show fallback feature
    altText: "Join the winning team! Instant deposits & live cashout features.",
    size: "leaderboard",
    gamblingWarning: "Strictly 18+. Winners know when to stop.",
  }
];

/**
 * Simulates network fetch call to an API route or Headless CMS endpoint
 */
export const fetchAdByPlacement = async (placementSize: AdSize): Promise<MockAdData | null> => {
  // Simulate network roundtrip delay
  await new Promise((resolve) => setTimeout(resolve, 800));
  
  const matchedAds = mockAdDatabase.filter((ad) => ad.size === placementSize);
  if (matchedAds.length === 0) return null;
  
  // Return random choice from filtered collection
  const randomIndex = Math.floor(Math.random() * matchedAds.length);
  return matchedAds[randomIndex];
};
