import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      "www.facebook.com",
      "flagcdn.com",
      "images.pexels.com",
      "cdn-images.dzcdn.net",
      "i.ytimg.com",
      "img.youtube.com",
      "images.unsplash.com",
      "lh3.googleusercontent.com",
      "www.pngall.com",
      "maps.googleapis.com",
      "res.cloudinary.com",
      "pngimg.com",
    ].map((hostname) => ({ protocol: "https" as const, hostname })),
  },
  async redirects() {
    return [
      { source: "/playlists", destination: "/playlist", permanent: true },
      { source: "/playlists/:id", destination: "/playlist", permanent: true },
    ];
  },
  outputFileTracingRoot: process.cwd(),
};

export default withSerwist(nextConfig);