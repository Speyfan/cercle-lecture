import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAndSendVerification } from "@/lib/verification";

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  registrationCode: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const { name, email, password, registrationCode } = parsed.data;

    if (registrationCode !== process.env.REGISTRATION_CODE) {
      return NextResponse.json(
        { error: "Code d'invitation invalide." },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà." },
        { status: 409 }
      );
    }

    const userCount = await prisma.user.count();
    const isAdmin =
      email === process.env.ADMIN_EMAIL || userCount === 0;

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: isAdmin ? "admin" : "user",
      },
    });

    // Email de vérification — best-effort : ne bloque pas l'inscription si le SMTP échoue.
    try {
      await createAndSendVerification(user.id, user.email, user.name);
    } catch (err) {
      console.error("[register] envoi de la vérification d'email échoué:", err);
    }

    return NextResponse.json(
      { id: user.id, name: user.name, email: user.email },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
