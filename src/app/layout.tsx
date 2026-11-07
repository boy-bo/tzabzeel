import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TZABZEEL — Places, made memorable",
  description:
    "A creative studio shaping thoughtful brand identities, interior photography, art direction, and websites for hotels and restaurants.",
  openGraph: {
    title: "TZABZEEL — Places, made memorable",
    description:
      "Thoughtful identities and imagery for hotels, restaurants, and places worth remembering.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f3ee",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrument.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
