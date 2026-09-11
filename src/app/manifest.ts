import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShadowDragon Games",
    short_name: "SHADOW",
    description: "The internet is full of clues. See what everyone else misses.",
    start_url: "/",
    display: "standalone",
    background_color: "#ecf4ff",
    theme_color: "#090c1a",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/dragon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
