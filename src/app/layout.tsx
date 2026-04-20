import type { Metadata } from "next";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";
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

function isMaintenanceModeEnabled() {
  const value = process.env.MAINTENANCE_MODE?.trim().toUpperCase();
  return value === "ON";
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMaintenanceMode = isMaintenanceModeEnabled();

  return (
    <html lang="en">
      <body className="m-0 font-sans">
        {isMaintenanceMode ? <MaintenanceScreen /> : children}
        <GlobalToaster />
      </body>
    </html>
  );
}
