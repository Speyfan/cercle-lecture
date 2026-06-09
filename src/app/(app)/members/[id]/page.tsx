import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ReviewCard from "@/components/ReviewCard";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const member = await prisma.user.findUnique({
    where: { id, active: true },
    select: { id: true, name: true, createdAt: true },
  });

  if (!member) notFound();

  const reviews = await prisma.review.findMany({
    where: { userId: id },
    include: { book: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-2xl font-bold">
          {member.name[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{member.name}</h1>
          <p className="text-stone-500 text-sm">
            Membre depuis{" "}
            {new Date(member.createdAt).toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
            {" · "}
            {reviews.length} lecture{reviews.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <div className="text-5xl mb-3">📚</div>
          <p>Aucune lecture enregistrée.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={{
                ...review,
                createdAt: review.createdAt.toISOString(),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
