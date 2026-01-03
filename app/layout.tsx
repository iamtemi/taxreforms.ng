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

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Tax Reform Assistant",
    template: "%s | Tax Reform Assistant",
  },
  description:
    "Ask questions about Nigerian tax reforms, business regulations, and compliance. Get grounded answers from key statutes and policy updates.",
  applicationName: "Tax Reform Assistant",
  keywords: [
    "Nigeria tax reform",
    "Nigerian tax law",
    "CAMA 2020",
    "Business Facilitation Act",
    "tax compliance",
    "regulatory guidance",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Tax Reform Assistant",
    description:
      "Ask questions about Nigerian tax reforms, business regulations, and compliance.",
    siteName: "Tax Reform Assistant",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Tax Reform Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tax Reform Assistant",
    description:
      "Ask questions about Nigerian tax reforms, business regulations, and compliance.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NG">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Tax Reform Assistant",
              url: siteUrl,
              description:
                "Ask questions about Nigerian tax reforms, business regulations, and compliance.",
              inLanguage: "en-NG",
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
