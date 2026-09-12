import type { Metadata, Viewport } from "next";
import "./globals.css";

// `title.template` compone "VenMenu | <título de la página>" para toda
// página que defina su propio `title` (login, super-admin, /admin según el
// local, etc.); la que NO define nada (la landing, `/`) se queda con
// `default`, o sea "VenMenu" a secas.
export const metadata: Metadata = {
  title: {
    default: "VenMenu",
    template: "VenMenu | %s",
  },
  description: "Menús digitales para restaurantes y cafeterías vía NFC / QR",
};

// Mobile-first: la mayoría del tráfico es el cliente final escaneando en la mesa.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-white text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
