"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export type AdSize = "leaderboard" | "square" | "skyscraper" | "fluid";

export interface AdBannerProps {
  /** Target URL when the user clicks the ad */
  destinationUrl: string;
  /** Image source URL */
  imageUrl: string;
  /** Alternative text for accessibility */
  altText: string;
  /** Layout behavior and aspect ratio constraints */
  size?: AdSize;
  /** Optional tracking callback for analytics/impressions */
  onImpression?: () => void;
  /** Optional tracking callback for click events */
  onClickThrough?: () => void;
  /** Responsible gambling warning text (Required for betting ads) */
  gamblingWarning?: string;
  /** Additional CSS classes */
  className?: string;
  /** Enable user-dismissible close button */
  dismissible?: boolean;
  /** Callback fired when user closes the ad */
  onDismiss?: () => void;
  /** Custom company name to display fallback text if image completely fails */
  companyName?: string;
}

const sizeClasses: Record<AdSize, string> = {
  leaderboard: "w-full max-w-[728px] h-[90px]",
  square: "w-full max-w-[300px] aspect-square",
  skyscraper: "w-[120px] sm:w-[160px] h-[600px]",
  fluid: "w-full h-auto aspect-[16/9] sm:aspect-[21/9]",
};

export const AdBanner: React.FC<AdBannerProps> = ({
  destinationUrl,
  imageUrl,
  altText,
  size = "fluid",
  onImpression,
  onClickThrough,
  gamblingWarning,
  className = "",
  dismissible = true,
  onDismiss,
  companyName = "Sponsor",
}) => {
  const [isClient, setIsClient] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (isVisible && onImpression) {
      onImpression();
    }
  }, [isVisible, onImpression]);

  // Loading skeleton placeholder during SSR hydration
  if (!isClient) {
    return <div className={`${sizeClasses[size]} bg-gray-100 dark:bg-gray-800 animate-pulse rounded border border-gray-200 dark:border-gray-700 ${className}`} />;
  }

  // Do not render anything if the user has dismissed the ad
  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  return (
    <div className={`relative flex flex-col items-center justify-center overflow-hidden mx-auto bg-gray-50 border border-gray-200/80 rounded shadow-sm group/banner ${className}`}>
      
      {/* Badge Tag */}
      <span className="absolute top-1 left-1 bg-black/70 text-[9px] text-white px-1.5 py-0.5 rounded uppercase tracking-wider z-10 select-none font-sans pointer-events-none">
        Sponsored
      </span>

      {/* Close/Hide Button */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-1 right-1 bg-white/80 hover:bg-white text-gray-700 hover:text-black rounded-full p-1 shadow z-20 transition-all opacity-80 group-hover/banner:opacity-100"
          title="Close Ad"
          aria-label="Close Ad"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Main Container / Image Fallback Layer */}
      <Link
        href={destinationUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={onClickThrough}
        className={`relative block overflow-hidden w-full ${sizeClasses[size]} ${
          imgError ? "flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-center text-white" : ""
        }`}
      >
        {imgError ? (
          /* Network/Asset Failure Fallback UI */
          <div className="flex flex-col items-center justify-center h-full space-y-1">
            <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">{companyName}</p>
            <p className="text-sm font-bold max-w-[90%] truncate sm:whitespace-normal">{altText}</p>
            <span className="mt-1 inline-block bg-yellow-500 text-black font-extrabold text-[10px] px-3 py-1 rounded shadow hover:bg-yellow-400 transition-colors">
              Visit Site &rarr;
            </span>
          </div>
        ) : (
          /* Standard Render Engine */
          <Image
            src={imageUrl}
            alt={altText}
            fill
            sizes="(max-width: 768px) 100vw, 728px"
            priority={size === "leaderboard"}
            className="object-cover transition-transform duration-500 group-hover/banner:scale-[1.01]"
            onError={() => setImgError(true)}
          />
        )}
      </Link>

      {/* Betting Compliance Legal Footer */}
      {gamblingWarning && (
        <div className="w-full bg-black text-[10px] sm:text-[11px] text-yellow-500 py-1 px-2 text-center font-bold tracking-wide uppercase border-t border-yellow-500/20 z-10">
          {gamblingWarning}
        </div>
      )}
    </div>
  );
};

export default AdBanner;
