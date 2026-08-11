import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "./ServiceWorkerRegistration";

const description = "A local-first sewing planner for measurements, reusable slopers, garment projects, fittings, construction progress, and portable backups.";

export const metadata: Metadata = {
  title: "Sewing Studio",
  description,
  icons: { icon: "./favicon.svg", shortcut: "./favicon.svg" },
  openGraph: { title: "Sewing Studio", description, type: "website" },
  twitter: { card: "summary", title: "Sewing Studio", description },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ServiceWorkerRegistration />{children}</body></html>;
}
