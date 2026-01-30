import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JanAvlokan - AI-Powered Subsidy Leakage Detector",
  description: "A cloud-native, privacy-first decision-support platform using unsupervised machine learning to detect potential subsidy leakage while ensuring welfare delivery remains uninterrupted.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} antialiased`}>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
         <Script
          src="https://cdn.userway.org/widget.js"
          data-account="YkkfhZBzXo"
          data-color="#2c1100"
          strategy="afterInteractive"
        ></Script>
      </body>
    </html>
  );
}
