import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Curated",
    short_name: "Curated",
    description:
      "Your private digital wardrobe and personal styling experience.",
    start_url: "/auth/sign-in?next=/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f4efe5",
    theme_color: "#f4efe5",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
