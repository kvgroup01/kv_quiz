import type { Metadata } from "next";
import "./quiz.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intake",
  description: "Pré-triagem de leads de anúncio: quem está pronto vai pro WhatsApp, quem tem dúvida cai no Kanban."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600;700&family=Fraunces:ital,wght@1,500&family=Kalam:wght@400;700&family=JetBrains+Mono:wght@500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
