import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

// Descarga del QR que apunta a /m/<slug> (para imprimir junto a la tarjeta NFC).
// Generado 100% en el servidor con la librería `qrcode` (sin servicio externo).
// Siempre PNG (formato único: se imprime igual y no hace falta elegir).
// Acceso: el dueño solo para SU local; el super-admin para cualquiera.
export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Falta el slug" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: local } = await supabase
    .from("locals")
    .select("id, slug")
    .eq("slug", slug)
    .single();
  if (!local) {
    return NextResponse.json({ error: "Local no encontrado" }, { status: 404 });
  }

  const isOwner = profile.role === "owner" && profile.local_id === local.id;
  const isSuperAdmin = profile.role === "super_admin";
  if (!isOwner && !isSuperAdmin) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const url = `${env.SITE_URL}/m/${local.slug}`;
  const png = await QRCode.toBuffer(url, { type: "png", margin: 2, width: 512 });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // `attachment` + nombre de archivo: el navegador lo guarda directo en su
      // carpeta de descargas por defecto, sin abrirlo ni navegar a otra página.
      "Content-Disposition": `attachment; filename="qr-${local.slug}.png"`,
    },
  });
}
