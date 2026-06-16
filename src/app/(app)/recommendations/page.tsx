import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RecommendationsClient, { type Reco } from "@/components/RecommendationsClient";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const batch = await prisma.recommendationBatch.findFirst({
    where: { userId },
    orderBy: { generatedAt: "desc" },
    include: { recommendations: { orderBy: { createdAt: "asc" } } },
  });

  const initial: Reco[] = (batch?.recommendations ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    reason: r.reason,
    coverUrl: r.coverUrl,
    openLibraryKey: r.openLibraryKey,
    verified: r.verified,
    status: r.status,
  }));

  return <RecommendationsClient initial={initial} initialMonth={batch?.month ?? null} />;
}
