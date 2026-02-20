import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Navbar";
import { WalletProvider } from "@/components/providers/WalletProvider";

export const metadata: Metadata = {
  title: "Envelop | Private Asset Manager on Aleo",
  description: "Private swaps, payments, invoices, and mobile onboarding on Aleo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className="min-h-screen bg-background font-sans antialiased text-foreground selection:bg-primary selection:text-primary-foreground"
      >
        <WalletProvider>
          <Header />
          <main className="relative z-10">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
