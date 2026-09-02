import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import ThemeProvider from "@/components/ThemeProvider";
import NavBar from "@/components/NavBar";
import { AsciiBackground } from "@/components/ascii-field";
import PageTransition from "@/components/ascii-ui/PageTransition";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://rydertetreault.dev"),
  title: "Ryder Tetreault | AI Integration & Cyber Defense",
  description:
    "Software engineer focused on integrating AI into real products, with a foundation in cybersecurity and infrastructure defense. Auburn University CS graduate building with language models, semantic search, and AI-driven automation.",
  keywords: [
    "Ryder Tetreault",
    "software engineer",
    "AI integration",
    "AI engineer",
    "LLM integration",
    "semantic search",
    "cybersecurity",
    "cyber defense",
    "Auburn University",
    "full stack developer",
    "portfolio",
  ],
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Ryder Tetreault | AI Integration & Cyber Defense",
    description:
      "Software engineer focused on integrating AI into real products, with a foundation in cybersecurity.",
    url: "https://rydertetreault.dev",
    siteName: "Ryder Tetreault",
    type: "website",
    images: [
      {
        url: "/portfolio-preview.png",
        width: 1731,
        height: 909,
        alt: "Ryder Tetreault portfolio preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ryder Tetreault | AI Integration & Cyber Defense",
    description:
      "Software engineer focused on integrating AI into real products, with a foundation in cybersecurity.",
    images: ["/portfolio-preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.classList.add(t)}else{document.documentElement.classList.add(window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light")}}catch(e){document.documentElement.classList.add("dark")}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <Analytics />
          {/* Persistent ASCII plasma/topography field: one canvas for the whole site,
              morphs per route and fires a shockwave on navigation (never remounts). */}
          <AsciiBackground quietZoneSelector="[data-ascii-quiet]" />
          {/* Link-click choreography: cloud sweep / terminal collapse, driven by the field */}
          <PageTransition />
          <NavBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
