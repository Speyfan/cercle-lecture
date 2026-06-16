import { prisma } from "@/lib/prisma";
import { verifyBook } from "@/lib/open-library";
import { generateBookRecommendations, type RecommendationContext } from "@/lib/ai";

export const MIN_REVIEWS_FOR_RECOMMENDATIONS = 2;

/** Mois courant au format "AAAA-MM" dans le fuseau Europe/Paris. */
export function currentMonth(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  return `${year}-${month}`;
}

export type GenerationResult =
  | { status: "OK"; batchId: string; count: number }
  | { status: "INSUFFICIENT_HISTORY"; reviewCount: number }
  | { status: "ALREADY_GENERATED"; batchId: string; month: string };

export interface GenerateOptions {
  /** Mois cible (défaut : mois courant). */
  month?: string;
  /** Régénère même si un batch existe déjà pour ce mois (bouton « générer maintenant »). */
  force?: boolean;
}

/**
 * Génère les recommandations d'un membre pour un mois donné :
 * construit le contexte, appelle l'IA, vérifie chaque livre via Open Library,
 * puis enregistre un RecommendationBatch et ses 5 recommandations.
 *
 * Idempotence mensuelle : si un batch existe déjà pour ce mois et que `force`
 * est faux, rien n'est régénéré (cas du cron). Avec `force` (génération à la
 * demande), le batch du mois est remplacé.
 */
export async function generateForUser(
  userId: string,
  options: GenerateOptions = {}
): Promise<GenerationResult> {
  const month = options.month ?? currentMonth();

  const existing = await prisma.recommendationBatch.findUnique({
    where: { userId_month: { userId, month } },
  });
  if (existing && !options.force) {
    return { status: "ALREADY_GENERATED", batchId: existing.id, month };
  }

  const reviews = await prisma.review.findMany({
    where: { userId },
    include: { book: true },
    orderBy: { rating: "desc" },
  });

  if (reviews.length < MIN_REVIEWS_FOR_RECOMMENDATIONS) {
    return { status: "INSUFFICIENT_HISTORY", reviewCount: reviews.length };
  }

  const pastRecs = await prisma.recommendation.findMany({
    where: { userId },
    select: { title: true, author: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const context: RecommendationContext = {
    history: reviews.map((r) => ({
      title: r.book.title,
      author: r.book.author,
      rating: r.rating,
      comment: r.comment,
    })),
    pastRecommendations: pastRecs.map((r) => ({
      title: r.title,
      author: r.author,
      status: r.status,
    })),
    exclusions: [
      ...reviews.map((r) => `${r.book.title} — ${r.book.author}`),
      ...pastRecs.map((r) => `${r.title} — ${r.author}`),
    ],
  };

  const generated = await generateBookRecommendations(context);

  // Validation post-génération : vérifie l'existence + récupère une couverture.
  const verified = await Promise.all(
    generated.map(async (rec) => {
      const { coverUrl, openLibraryKey } = await verifyBook(rec.titre, rec.auteur);
      return {
        title: rec.titre,
        author: rec.auteur,
        reason: rec.justification,
        coverUrl,
        openLibraryKey,
        verified: openLibraryKey !== null,
      };
    })
  );

  // Remplace le batch du mois (cascade -> supprime ses anciennes recommandations).
  const batch = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.recommendationBatch.delete({ where: { id: existing.id } });
    }
    return tx.recommendationBatch.create({
      data: {
        userId,
        month,
        recommendations: {
          create: verified.map((v) => ({
            userId,
            title: v.title,
            author: v.author,
            reason: v.reason,
            coverUrl: v.coverUrl,
            openLibraryKey: v.openLibraryKey,
            verified: v.verified,
          })),
        },
      },
    });
  });

  return { status: "OK", batchId: batch.id, count: verified.length };
}
