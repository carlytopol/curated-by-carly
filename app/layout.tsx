import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { Navigation } from "@/components/site/navigation";
import { SiteFooter } from "@/components/site/footer";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const editorialSerif = Cormorant_Garamond({
  variable: "--font-editorial-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Curated",
    template: "%s · Curated",
  },
  applicationName: "Curated",
  description: "A considered digital wardrobe and styling experience.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Curated",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4efe5",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const identity = await getCurrentIdentity();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${editorialSerif.variable} h-full antialiased`}
    >
      <body className={`${identity.isAuthenticated ? "authenticated-app" : ""} min-h-dvh text-neutral-900`}>
        <Navigation name={identity.firstName} isAuthenticated={identity.isAuthenticated} />
        <div className="app-scroll-region">
          {children}
          <SiteFooter isAuthenticated={identity.isAuthenticated} />
        </div>
      </body>
    </html>
  );
}
