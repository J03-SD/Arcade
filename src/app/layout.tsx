import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const season = localFont({
  src: "../fonts/SeasonSerif-Regular.otf",
  variable: "--font-season-face",
  weight: "400",
  display: "swap",
});

const suisse = localFont({
  src: "../fonts/SuisseIntl-Regular.otf",
  variable: "--font-suisse-face",
  weight: "400",
  display: "swap",
});

const plex = IBM_Plex_Mono({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-plex-face",
});

export const metadata: Metadata = {
  title: "ShadowDragon Games",
  description: "The internet is full of clues. See what everyone else misses.",
  applicationName: "ShadowDragon Games",
  appleWebApp: {
    capable: true,
    title: "SHADOW",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#090c1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${season.variable} ${suisse.variable} ${plex.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ice font-suisse text-navy">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
