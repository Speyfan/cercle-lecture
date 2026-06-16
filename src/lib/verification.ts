import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmailVerification } from "@/lib/email";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

export type VerificationResult = "OK" | "EXPIRED" | "INVALID";

/**
 * Crée un jeton de vérification (en remplaçant les éventuels jetons précédents
 * du membre) et envoie l'email correspondant. Best-effort : à appeler dans un
 * try/catch côté appelant si l'envoi ne doit pas faire échouer l'action.
 */
export async function createAndSendVerification(
  userId: string,
  email: string,
  name: string
): Promise<void> {
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: { token, userId, email, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  await sendEmailVerification(email, name, token);
}

/** Valide un jeton et marque l'email comme vérifié. */
export async function verifyEmailToken(token: string): Promise<VerificationResult> {
  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record) return "INVALID";

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationToken.delete({ where: { token } });
    return "EXPIRED";
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  // Si l'email a changé depuis l'envoi, le jeton ne vaut plus.
  if (!user || user.email !== record.email) {
    await prisma.emailVerificationToken.delete({ where: { token } });
    return "INVALID";
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });
  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
  return "OK";
}
