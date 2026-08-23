import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar Jurídico",
  description: "Pré-triagem de leads jurídicos com IA e diagnóstico automático."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Fraunces:ital,wght@1,500&family=Kalam:wght@400;700&family=JetBrains+Mono:wght@500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
