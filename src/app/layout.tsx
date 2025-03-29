import "./globals.css";
import { ClusterProvider } from "@/components/cluster/cluster-data-access";
import { SolanaProvider } from "@/components/solana/solana-provider";
import { ReactQueryProvider } from "./react-query-provider";
import { Toaster } from "sonner";
import { Inter as FontSans } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "./components/theme-provider";
import MainLayout from "./layout/main-layout";

export const metadata = {
  title: "Funblinks",
  description: "Blink your token for a few seconds",
};

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/favicon/web-app-manifest-192x192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="512x512"
          href="/favicon/web-app-manifest-512x512.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/icon1.png"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon/icon0.svg" />
        <link
          rel="shortcut icon"
          href="/favicon/favicon.ico"
          type="image/x-icon"
        />
        <link rel="manifest" href="/favicon/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta
          name="msapplication-TileImage"
          content="/favicon/web-app-manifest-192x192.png"
        />
      </head>
      <body
        className={cn("min-h-screen font-sans antialiased", fontSans.variable)}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
          forcedTheme="dark"
        >
          <ReactQueryProvider>
            <ClusterProvider>
              <SolanaProvider>
                <Toaster position="top-center" />
                <MainLayout>{children}</MainLayout>
              </SolanaProvider>
            </ClusterProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
