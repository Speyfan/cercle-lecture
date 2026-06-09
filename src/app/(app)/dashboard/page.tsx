import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import ReviewCard from "@/components/ReviewCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const reviews = await prisma.review.findMany({
    take: 30,
    orderBy: { createdAt: "desc" },
    include: {
      book: true,
      user: { select: { id: true, name: true } },
    },
  });

  const members = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-stone-900 mb-6">Actualités</h1>
        {reviews.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <div className="text-5xl mb-3">📚</div>
            <p className="font-medium">Aucune lecture partagée pour l&apos;instant.</p>
            <p className="text-sm mt-1">Soyez le premier à ajouter un livre !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={{
                  ...review,
                  createdAt: review.createdAt.toISOString(),
                  user: review.user,
                }}
                currentUserId={session?.user.id}
                showUser
              />
            ))}
          </div>
        )}
      </div>

      <aside className="hidden lg:block w-56 flex-shrink-0">
        <div className="bg-white rounded-xl border border-stone-200 p-4 sticky top-20">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Membres</h2>
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/members/${m.id}`}
                  className="flex items-center gap-2 text-sm text-stone-600 hover:text-amber-700"
                >
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {m.name[0]?.toUpperCase()}
                  </span>
                  <span className="truncate">{m.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
