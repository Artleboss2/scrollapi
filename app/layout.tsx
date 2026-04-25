import type { Metadata } from "next";
import SmoothScrollProvider from "@/components/ui/SmoothScrollProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScrollAPI — Time is Space",
  description:
    "ScrollAPI transforms YouTube videos into scrollable experiences. The scroll controls time.",
  openGraph: {
    title: "ScrollAPI",
    description: "Scroll through time. Every frame is a step in your navigation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-ink text-paper antialiased">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
