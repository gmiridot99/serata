import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Serata",
  description: "Scopri eventi e serate nella tua città",
  openGraph: {
    title: "Serata",
    description: "Scopri eventi e serate nella tua città",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${syne.variable} ${dmSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  );
}
