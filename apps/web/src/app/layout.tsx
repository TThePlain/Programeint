import type { Metadata, Viewport } from "next";
import { Fraunces, Sora } from "next/font/google";
import { AppChrome } from "@/components/app-chrome";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const sans = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-loaded",
});

const serif = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif-loaded",
});

export const metadata: Metadata = {
  title: "Programeint",
  description:
    "Aprende tecnologia, programação, IA e o mercado tech — mapa, prática e notícias da imprensa do ramo.",
  applicationName: "Programeint",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png?v=sprout-project-2", sizes: "32x32", type: "image/png" },
      { url: "/brand/mark-icon-256.png?v=sprout-project-2", sizes: "256x256", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=sprout-project-2", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#536342" },
    { media: "(prefers-color-scheme: dark)", color: "#141a15" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="eco" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('programeint-theme');if(t==='light'||t==='eco'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${sans.variable} ${serif.variable} shell`}>
        <ThemeProvider>
          <a className="skip" href="#conteudo">
            Saltar para o conteúdo
          </a>
          <AppChrome>{children}</AppChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
