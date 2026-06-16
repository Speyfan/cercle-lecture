import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAndSendVerification } from "@/lib/verification";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, newsletterEnabled: true, role: true, emailVerified: true },
  });

  if (!user) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json(user);
}

const profileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  newsletterEnabled: z.boolean().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const { name, email, newsletterEnabled, currentPassword, newPassword } = parsed.data;
  const updateData: Record<string, unknown> = {};

  if (name !== undefined) updateData.name = name;
  if (newsletterEnabled !== undefined) updateData.newsletterEnabled = newsletterEnabled;

  let emailChanged = false;
  if (email !== undefined) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé." },
        { status: 409 }
      );
    }
    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });
    if (current && current.email !== email) {
      emailChanged = true;
      updateData.email = email;
      updateData.emailVerified = null; // la nouvelle adresse doit être re-vérifiée
    }
  }

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Mot de passe actuel requis." },
        { status: 400 }
      );
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Mot de passe actuel incorrect." },
        { status: 400 }
      );
    }
    updateData.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, name: true, email: true, newsletterEnabled: true, role: true, emailVerified: true },
  });

  if (emailChanged) {
    try {
      await createAndSendVerification(user.id, user.email, user.name);
    } catch (err) {
      console.error("[profile] envoi de la vérification d'email échoué:", err);
    }
  }

  return NextResponse.json(user);
}
