import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import ThemeProvider from "@/components/ThemeProvider";
import NavBar from "@/components/NavBar";
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
  title: "Ryder Tetreault | Software Engineer & Cyber Defense",
  description:
    "Software engineer and cybersecurity specialist building secure, scalable systems. Auburn University CS graduate focused on systems engineering and infrastructure defense.",
  keywords: [
    "Ryder Tetreault",
    "software engineer",
    "cybersecurity",
    "cyber defense",
    "Auburn University",
    "full stack developer",
    "portfolio",
  ],
  openGraph: {
    title: "Ryder Tetreault | Software Engineer & Cyber Defense",
    description:
      "Software engineer and cybersecurity specialist building secure, scalable systems.",
    url: "https://rydertetreault.dev",
    siteName: "Ryder Tetreault",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Ryder Tetreault | Software Engineer & Cyber Defense",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ryder Tetreault | Software Engineer & Cyber Defense",
    description:
      "Software engineer and cybersecurity specialist building secure, scalable systems.",
    images: ["/og.png"],
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
          <NavBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
