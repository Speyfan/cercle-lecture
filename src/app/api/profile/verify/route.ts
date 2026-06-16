import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAndSendVerification } from "@/lib/verification";

// Renvoie un email de vérification au membre connecté.
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, emailVerified: true },
  });
  if (!user) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  if (user.emailVerified) {
    return NextResponse.json({ error: "Adresse déjà vérifiée." }, { status: 400 });
  }

  try {
    await createAndSendVerification(user.id, user.email, user.name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[profile/verify] envoi échoué:", err);
    return NextResponse.json({ error: "Échec de l'envoi de l'email." }, { status: 502 });
  }
}
