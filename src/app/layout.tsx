import type { Metadata } from "next";
import Script from "next/script";
import { AppShell } from "@/components/app-shell";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { AuthProvider } from "@/store/auth-provider";
import "ol/ol.css";
import "ol-ext/dist/ol-ext.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrithviEx",
  description: "Service analysis and data extraction dashboard",
  icons: {
    icon: "/favicon.ico?v=2",
    shortcut: "/favicon.ico?v=2",
  },
};

const GOOGLE_ANALYTICS_ID = "G-ZXWQYNZ6R7";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link href="/favicon.ico?v=2" rel="icon" sizes="any" />
        <link href="/favicon.ico?v=2" rel="shortcut icon" />
        <Script id="google-consent-mode" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;

            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              wait_for_update: 500
            });

            try {
              if (localStorage.getItem('prithiviex-cookie-consent') === 'accepted') {
                gtag('consent', 'update', {
                  analytics_storage: 'granted',
                  ad_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied'
                });
              }
            } catch (error) {
              // Consent remains denied when browser storage is unavailable.
              
            }
          `}
        </Script>
      </head>
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <CookieConsentBanner />
      </body>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ANALYTICS_ID}');
        `}
      </Script>
    </html>
  );
}
