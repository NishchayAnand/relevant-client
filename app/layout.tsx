import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" >
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased m-8`}>
        <Navbar />
        <main className="max-w-3xl mt-10 mb-20 mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
