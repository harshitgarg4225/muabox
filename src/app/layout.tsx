import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Muabox — Where makeup artists meet skincare brands",
    template: "%s · Muabox",
  },
  description:
    "Muabox connects makeup artists with skincare brands for PR collaborations. Artists connect Instagram in one tap; brands browse consented creators and send deals.",
  keywords: [
    "makeup artist",
    "MUA",
    "skincare brand",
    "PR collaboration",
    "influencer marketing",
    "Instagram creators",
  ],
  openGraph: {
    title: "Muabox — Where makeup artists meet skincare brands",
    description:
      "Artists connect Instagram and set their terms. Brands browse opted-in creators and send PR collab offers.",
    url: appUrl,
    siteName: "Muabox",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Muabox",
    description:
      "Where makeup artists meet skincare brands for PR collaborations.",
  },
  icons: { icon: "/favicon.ico" },
};

export const viewport = {
  themeColor: "#0a1f44",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
