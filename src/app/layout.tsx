import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'Backcountry Crews - Find Your Backcountry Partners in Crested Butte',
    template: '%s | Backcountry Crews',
  },
  description: 'Find partners for backcountry skiing, ski touring, hiking, mountain biking, and trail running in Crested Butte, Colorado. Check avalanche forecasts, post trips, and connect with local crews.',
  keywords: ['backcountry skiing', 'ski touring', 'Crested Butte', 'avalanche forecast', 'CBAC', 'backcountry partners', 'Colorado skiing', 'mountain biking', 'hiking partners'],
  authors: [{ name: 'Backcountry Crews' }],
  creator: 'Backcountry Crews',
  metadataBase: new URL('https://backcountrycrews.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://backcountrycrews.com',
    siteName: 'Backcountry Crews',
    title: 'Backcountry Crews - Find Your Backcountry Partners',
    description: 'Find partners for backcountry skiing and outdoor adventures in Crested Butte, Colorado. Check forecasts, post trips, connect with crews.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Backcountry Crews - Find Your Backcountry Partners',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Backcountry Crews - Find Your Backcountry Partners',
    description: 'Find partners for backcountry skiing and outdoor adventures in Crested Butte, Colorado.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'vRkZMB6-LtHXg3ZwJpi3zqLjQJohbBdAzuSNqIW-bYo',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen`}
      >
        <Providers>
          <Navigation />
          <main className="max-w-4xl mx-auto px-4 py-6">
            {children}
          </main>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
