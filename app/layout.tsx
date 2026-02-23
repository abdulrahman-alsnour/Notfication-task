import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notification Hub",
  description: "Send SMS and WhatsApp messages to groups",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
