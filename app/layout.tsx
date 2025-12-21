import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased max-w-3xl  m-8 mt-20 mx-auto`}>
        {/* <main className="flex-auto min-w-0 flex flex-col"> */}
          {children}
      </body>
    </html>
  );
}
