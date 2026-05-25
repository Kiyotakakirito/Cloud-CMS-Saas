import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { NotificationContainer } from "@/components/ui/notifications";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Yunetra - ISP CRM",
  description: "Customer Management System for Indian ISPs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          {children}
          <NotificationContainer />
        </ErrorBoundary>
      </body>
    </html>
  );
}

