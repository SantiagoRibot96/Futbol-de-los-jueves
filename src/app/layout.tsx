import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Futbol de los jueves",
  description: "Tabla de posiciones del torneo amistoso",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const role = await getSession();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-black">
        {role ? (
          <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
              <Link href="/" className="font-semibold text-zinc-900 dark:text-zinc-50">
                Futbol de los jueves
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                  Tabla
                </Link>
                {role === "admin" ? (
                  <Link href="/admin" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                    Admin
                  </Link>
                ) : null}
                <form action={logoutAction}>
                  <button type="submit" className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200">
                    Salir
                  </button>
                </form>
              </nav>
            </div>
          </header>
        ) : null}
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
