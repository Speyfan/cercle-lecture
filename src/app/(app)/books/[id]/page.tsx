import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import StarRating from "@/components/StarRating";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      reviews: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!book) notFound();

  const avg =
    book.reviews.length > 0
      ? book.reviews.reduce((s, r) => s + r.rating, 0) / book.reviews.length
      : 0;

  return (
    <div>
      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6 flex gap-6">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-24 h-32 object-cover rounded-xl shadow-sm flex-shrink-0"
          />
        ) : (
          <div className="w-24 h-32 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 text-4xl flex-shrink-0">
            📖
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{book.title}</h1>
          <p className="text-stone-500 mt-1">{book.author}</p>
          {book.reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <StarRating value={Math.round(avg)} size="md" />
              <span className="text-stone-500 text-sm">
                {avg.toFixed(1)} · {book.reviews.length} avis
              </span>
            </div>
          )}
        </div>
      </div>

      <h2 className="text-lg font-semibold text-stone-900 mb-4">
        Avis des membres ({book.reviews.length})
      </h2>

      {book.reviews.length === 0 ? (
        <p className="text-stone-400 text-center py-8">Aucun avis pour l&apos;instant.</p>
      ) : (
        <div className="space-y-4">
          {book.reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl border border-stone-200 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <Link
                  href={`/members/${review.user.id}`}
                  className="font-semibold text-stone-800 hover:text-amber-700"
                >
                  {review.user.name}
                  {review.user.id === session?.user.id && (
                    <span className="ml-2 text-xs text-amber-600 font-normal">(moi)</span>
                  )}
                </Link>
                <div className="flex items-center gap-2">
                  <StarRating value={review.rating} size="sm" />
                  <span className="text-xs text-stone-400">
                    {new Date(review.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              {review.comment && (
                <p className="text-stone-600 text-sm">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
