import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoogleTranslateClient from "@/components/GoogleTranslateClient";
import { SchemeProvider } from "@/context/SchemeContext";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} antialiased`}>
        {/* Hidden Google Translate container */}
        <div id="google_translate_element" style={{ display: "none" }}></div>

        {/* Re-trigger translation on route change */}
        <GoogleTranslateClient />

        <SchemeProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </SchemeProvider>

        {/* UserWay Accessibility Widget */}
        <Script
          src="https://cdn.userway.org/widget.js"
          data-account="YkkfhZBzXo"
          data-color="#2c1100"
          strategy="afterInteractive"
        />

        {/* Google Translate Initialization Script */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              function googleTranslateElementInit() {
                new google.translate.TranslateElement(
                  {
                    pageLanguage: 'en',
                    includedLanguages: 'en,hi,pa',
                    autoDisplay: false
                  },
                  'google_translate_element'
                );
                
                // Hide Google Translate banner after initialization
                setTimeout(hideGoogleTranslateBar, 100);
                setTimeout(hideGoogleTranslateBar, 500);
                setTimeout(hideGoogleTranslateBar, 1000);
                setTimeout(hideGoogleTranslateBar, 2000);
              }
              
              function hideGoogleTranslateBar() {
                // Remove the banner iframe
                var frames = document.querySelectorAll('.goog-te-banner-frame, iframe.goog-te-banner-frame');
                frames.forEach(function(frame) {
                  frame.style.display = 'none';
                  frame.style.visibility = 'hidden';
                  frame.style.height = '0';
                  frame.remove();
                });
                
                // Remove skiptranslate elements (but keep our translate element)
                var skipElements = document.querySelectorAll('.skiptranslate');
                skipElements.forEach(function(el) {
                  if (el.id !== 'google_translate_element' && !el.querySelector('#google_translate_element')) {
                    el.style.display = 'none';
                    el.style.height = '0';
                  }
                });
                
                // Reset body position (Google Translate pushes it down)
                document.body.style.top = '0px';
                document.body.style.position = 'static';
                
                // Also check for the newer Google Translate UI classes
                var newBanners = document.querySelectorAll('[class*="VIpgJd"], .goog-te-menu-frame, #goog-gt-tt');
                newBanners.forEach(function(el) {
                  el.style.display = 'none';
                });
              }
              
              // Delay observer setup to avoid hydration issues
              window.addEventListener('load', function() {
                hideGoogleTranslateBar();
                
                // Observe DOM for dynamically added banners
                if (typeof MutationObserver !== 'undefined') {
                  var observer = new MutationObserver(function(mutations) {
                    hideGoogleTranslateBar();
                  });
                  observer.observe(document.body, { childList: true, subtree: true });
                }
              });
            `,
          }}
        />

        {/* Google Translate External Script */}
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
