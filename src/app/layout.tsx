import type { Metadata, Viewport } from "next";
import { Bungee, Rubik } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const bungee = Bungee({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bungee",
});

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "VOICE-O-METER 3000 🎤 — How Macho Is Your Voice?",
  description:
    "The world's most unofficial voice test. Speak into your mic and discover if you sound like Barry White 🎩 or Mickey Mouse 🐭. 100% fun, 0% science, certified 127% accurate by the Institute of Totally Real Science™.",
  keywords: [
    "voice test",
    "voice meter",
    "pitch detector",
    "fun",
    "party game",
    "masculinity meter",
  ],
  openGraph: {
    title: "VOICE-O-METER 3000",
    description:
      "Find out if you sound like Barry White or Mickey Mouse. Certified 127% accurate* (*not really).",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0618",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bungee.variable} ${rubik.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
