import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TOEFL & IELTS Simulator",
  description: "AI-powered TOEFL and IELTS test simulation platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="m-0 font-sans">{children}</body>
    </html>
  );
}
