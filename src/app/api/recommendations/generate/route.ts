import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateForUser } from "@/lib/recommendations";

const MANUAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 1 génération manuelle / 24 h (hors admin)

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const userId = session.user.id;
  const isAdmin = session.user.role === "admin";

  // Limite anti-abus : on s'appuie sur la date du dernier batch généré.
  if (!isAdmin) {
    const last = await prisma.recommendationBatch.findFirst({
      where: { userId },
      orderBy: { generatedAt: "desc" },
      select: { generatedAt: true },
    });
    if (last && Date.now() - last.generatedAt.getTime() < MANUAL_COOLDOWN_MS) {
      const retryInHours = Math.ceil(
        (MANUAL_COOLDOWN_MS - (Date.now() - last.generatedAt.getTime())) / (60 * 60 * 1000)
      );
      return NextResponse.json(
        {
          error: `Vous avez déjà généré des recommandations récemment. Réessayez dans environ ${retryInHours} h.`,
        },
        { status: 429 }
      );
    }
  }

  try {
    const result = await generateForUser(userId, { force: true });

    if (result.status === "INSUFFICIENT_HISTORY") {
      return NextResponse.json(
        {
          error: "Ajoutez au moins 2 lectures notées pour générer des recommandations.",
          reviewCount: result.reviewCount,
        },
        { status: 422 }
      );
    }

    const recommendations = await prisma.recommendation.findMany({
      where: { batchId: result.batchId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ recommendations }, { status: 201 });
  } catch (err) {
    console.error("[recommendations/generate]", err);
    return NextResponse.json(
      { error: "La génération a échoué. Réessayez plus tard." },
      { status: 502 }
    );
  }
}
