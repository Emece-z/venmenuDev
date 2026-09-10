import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cuando agreguemos Supabase Storage para imágenes de productos,
  // aquí habilitaremos el dominio del bucket en `images.remotePatterns`.
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
