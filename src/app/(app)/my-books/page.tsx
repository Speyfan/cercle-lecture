"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import ReviewCard from "@/components/ReviewCard";
import AddReviewModal from "@/components/AddReviewModal";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userId: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
  };
}

type SortKey = "date" | "rating";

export default function MyBooksPage() {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [sort, setSort] = useState<SortKey>("date");

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/reviews");
    const data = await res.json();
    setReviews(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const sorted = [...reviews].sort((a, b) =>
    sort === "date"
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : b.rating - a.rating
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Mes lectures</h1>
          <p className="text-stone-500 text-sm mt-1">
            {reviews.length} livre{reviews.length !== 1 ? "s" : ""} enregistré
            {reviews.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
        >
          <span>+</span> Ajouter
        </button>
      </div>

      {reviews.length > 1 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSort("date")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sort === "date"
                ? "bg-amber-100 text-amber-700"
                : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            Par date
          </button>
          <button
            onClick={() => setSort("rating")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sort === "rating"
                ? "bg-amber-100 text-amber-700"
                : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            Par note
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-stone-400">Chargement…</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <div className="text-5xl mb-3">📚</div>
          <p className="font-medium">Aucune lecture enregistrée.</p>
          <p className="text-sm mt-1">Ajoutez votre premier livre !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={session?.user.id}
              onDeleted={(id) => setReviews((prev) => prev.filter((r) => r.id !== id))}
              onUpdated={(updated) =>
                setReviews((prev) =>
                  prev.map((r) => (r.id === updated.id ? (updated as Review) : r))
                )
              }
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddReviewModal
          onClose={() => setShowAdd(false)}
          onAdded={(review) => {
            setReviews((prev) => [review as Review, ...prev]);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
