import type { Metadata } from "next";
import "./globals.css";
import { Providers } from './providers';
import '@/lib/startup/initMarketMaker'; // Add at the top with other imports

export const metadata: Metadata = {
  title: "Prediction Exchange",
  description: "Trade on future events with crypto",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}