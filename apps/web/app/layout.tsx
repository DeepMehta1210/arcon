import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Archon | Autonomous Lead & Revenue Engine",
  description: "Autonomous command center for signal mining, lead verification, and multi-channel outreach in ASD-STE100.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
