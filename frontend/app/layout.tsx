import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
    title: "Privacy Interface — High-Precision Privacy Interface",
    description: "Industrial-grade security layer for decentralized assets. Built on Aleo Zero-Knowledge proof system.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark scroll-smooth">
            <body className={cn("min-h-screen bg-background font-sans antialiased text-foreground selection:bg-primary selection:text-primary-foreground", inter.variable)}>
                <Header />
                <main className="relative z-10">
                    {children}
                </main>
            </body>
        </html>
    );
}
