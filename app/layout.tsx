import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { ViewportHeightFix } from "@/components/ViewportHeightFix";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap", // Optimize font loading - use fallback font until Inter loads
  preload: true, // Explicitly enable preloading
});

export const metadata: Metadata = {
  title: "LensTrack - Optical Store Management System",
  description: "Intelligent product recommendations for optical stores",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Wrap in error boundary at layout level
  let appProvidersElement: React.ReactNode;
  try {
    if (typeof AppProviders === 'undefined') {
      throw new Error('AppProviders is undefined');
    }
    
    appProvidersElement = <AppProviders>{children}</AppProviders>;
  } catch (error: any) {
    console.error('[RootLayout] AppProviders error', { error: error?.message });
    // Fallback: render children without providers if AppProviders fails
    appProvidersElement = <>{children}</>;
  }
  
  try {
    return (
      <html lang="en" className="overscroll-none">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />
        </head>
        <body className={`${inter.variable} font-sans antialiased overscroll-none`} suppressHydrationWarning>
          {appProvidersElement}
          <ViewportHeightFix />
        </body>
      </html>
    );
  } catch (error: any) {
    console.error('[RootLayout] Render error', { error: error?.message });
    // Last resort: return minimal HTML
    return (
      <html lang="en">
        <body>
          <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Application Error</h1>
            <p>An error occurred while rendering the application.</p>
            {process.env.NODE_ENV === 'development' && (
              <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
                {error?.message || 'Unknown error'}
                {error?.stack && `\n\n${error.stack}`}
              </pre>
            )}
          </div>
        </body>
      </html>
    );
  }
}

