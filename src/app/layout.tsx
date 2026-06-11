import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", weight: ["300", "400", "500", "600", "700"] });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "HelixOS AI — Command Center",
  description:
    "Agentic AI platform — eight specialist agents that collaborate to autonomously operate and grow a business.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Apply persisted appearance prefs before paint so there's no theme flash.
  const tweaksScript = `try{var t=JSON.parse(localStorage.getItem('helix.tweaks')||'{}');var e=document.documentElement;if(t.theme)e.setAttribute('data-theme',t.theme);if(t.hue)e.style.setProperty('--acc-h',t.hue);if(t.density)e.style.setProperty('--d',t.density);}catch(_){}`;
  return (
    <html lang="en" data-theme="light" className={`${geist.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: tweaksScript }} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
