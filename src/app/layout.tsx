import type { Metadata, Viewport } from "next";
import { Google_Sans_Flex, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const flex = Google_Sans_Flex({
  subsets: ["latin"],
  axes: ["wdth", "ROND", "opsz"],
  variable: "--font-flex",
  display: "swap",
  adjustFontFallback: false,
});
const schibsted = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Huddle: write it together", template: "%s | Huddle" },
  description:
    "Free collaborative documents. Write on one page together, live, with comments, version history, two-factor sign-in and passkeys.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ecf0e1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1810" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const stored = (await cookies()).get("huddle-theme")?.value;
  const theme = stored === "light" || stored === "dark" ? stored : undefined;

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${flex.variable} ${schibsted.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
