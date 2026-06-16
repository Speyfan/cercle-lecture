import { prisma } from "@/lib/prisma";
import { generateForUser } from "@/lib/recommendations";
import { sendRecommendationEmail, sendWelcomeEmail } from "@/lib/email";

export type UserNewsletterOutcome =
  | "sent" // recommandations générées + email envoyé
  | "welcome" // historique insuffisant -> email d'accueil
  | "skipped" // déjà généré ce mois (idempotence)
  | "error";

export interface UserNewsletterResult {
  userId: string;
  email: string;
  outcome: UserNewsletterOutcome;
  detail?: string;
}

interface RunOptions {
  /** Régénère et renvoie l'email même si un batch existe déjà pour le mois. */
  force?: boolean;
}

/**
 * Génère puis envoie la newsletter d'un membre. N'échoue jamais en cascade :
 * toute erreur est capturée et renvoyée dans le résultat.
 */
export async function runForUser(
  userId: string,
  options: RunOptions = {}
): Promise<UserNewsletterResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    return { userId, email: "", outcome: "error", detail: "Membre introuvable." };
  }

  try {
    const result = await generateForUser(userId, { force: options.force });

    if (result.status === "ALREADY_GENERATED") {
      console.log(`[newsletter] ${user.email}: déjà généré pour ${result.month}, ignoré.`);
      return { userId, email: user.email, outcome: "skipped" };
    }

    if (result.status === "INSUFFICIENT_HISTORY") {
      await sendWelcomeEmail(user.email, user.name);
      console.log(`[newsletter] ${user.email}: historique insuffisant (${result.reviewCount}), email d'accueil envoyé.`);
      return { userId, email: user.email, outcome: "welcome" };
    }

    const recommendations = await prisma.recommendation.findMany({
      where: { batchId: result.batchId },
      orderBy: { createdAt: "asc" },
      select: { title: true, author: true, reason: true, coverUrl: true },
    });

    await sendRecommendationEmail(user.email, user.name, recommendations);
    console.log(`[newsletter] ${user.email}: ${recommendations.length} recommandations envoyées.`);
    return { userId, email: user.email, outcome: "sent" };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[newsletter] ${user.email}: échec — ${detail}`);
    return { userId, email: user.email, outcome: "error", detail };
  }
}

/**
 * Parcourt tous les membres actifs et abonnés, et lance la newsletter pour
 * chacun. Séquentiel pour ménager l'API IA et le serveur SMTP.
 */
export async function runForAllEligible(
  options: RunOptions = {}
): Promise<UserNewsletterResult[]> {
  const users = await prisma.user.findMany({
    where: { active: true, newsletterEnabled: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const results: UserNewsletterResult[] = [];
  for (const u of users) {
    results.push(await runForUser(u.id, options));
  }
  console.log(
    `[newsletter] terminé: ${results.length} membres traités ` +
      `(${results.filter((r) => r.outcome === "sent").length} envoyés, ` +
      `${results.filter((r) => r.outcome === "welcome").length} accueils, ` +
      `${results.filter((r) => r.outcome === "skipped").length} ignorés, ` +
      `${results.filter((r) => r.outcome === "error").length} erreurs).`
  );
  return results;
}
