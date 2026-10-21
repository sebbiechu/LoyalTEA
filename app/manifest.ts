import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LoyalTEA",
    short_name: "LoyalTEA",
    description: "Canteen stamp card. Collect stamps, get a free drink.",
    start_url: "/",
    display: "standalone",
    background_color: "#ec008c",
    theme_color: "#ec008c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
