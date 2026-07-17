import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { HtmlLang } from "@/components/html-lang";
import { Toaster } from "@/components/ui/sonner";
import { htmlLang, DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Worship Songs",
  description: "Worship song selection and meeting records",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("locale")?.value;
  const initialLocale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  return (
    <html
      lang={htmlLang(initialLocale)}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <I18nProvider initialLocale={initialLocale}>
            <HtmlLang />
            {children}
            <Toaster />
          </I18nProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
