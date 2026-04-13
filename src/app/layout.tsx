import type { Metadata } from "next";
import { GlobalToaster } from "@/components/GlobalToaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wikin | TOEFL & IELTS Assistant",
  description: "AI-powered TOEFL and IELTS test simulation platform",
  icons: {
    icon: "/big.png",
    apple: "/big.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="m-0 font-sans">
        {children}
        <GlobalToaster />
      </body>
    </html>
  );
}
