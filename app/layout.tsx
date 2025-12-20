import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Navbar } from "@/app/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

//<title>Blog | MySite</title>
//<meta name="description" content="Thoughts on systems, design, and engineering">
export const metadata: Metadata = {
  title: "Relevant",
  description: "Thoughts on systems, design, and engineering",
};

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased max-w-xl mt-8 mx-auto`}
      >
        <main className="flex-auto min-w-0 m-8 flex flex-col">
          <Navbar />
          {children}
        </main>
      </body>
    </html>
  );
}
