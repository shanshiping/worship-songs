import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cookies } from "next/headers";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { HtmlLang } from "@/components/html-lang";
import { Toaster } from "@/components/ui/sonner";
import { htmlLang, DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

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
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <ThemeProvider>
            <I18nProvider initialLocale={initialLocale}>
              <HtmlLang />
              {children}
              <Toaster />
            </I18nProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
