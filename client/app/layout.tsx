import "./globals.css";
import { Inter } from "next/font/google";
import { AppSessionProvider } from "../components/providers/SessionProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "VedaAI",
  description: "AI Assessment Creator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-page text-primary min-h-screen">
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
