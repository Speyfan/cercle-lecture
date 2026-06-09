"use client";

import { useState } from "react";
import Link from "next/link";
import StarRating from "./StarRating";
import EditReviewModal from "./EditReviewModal";

interface ReviewCardProps {
  review: {
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
    user?: { id: string; name: string };
  };
  currentUserId?: string;
  onDeleted?: (id: string) => void;
  onUpdated?: (review: ReviewCardProps["review"]) => void;
  showUser?: boolean;
}

export default function ReviewCard({
  review,
  currentUserId,
  onDeleted,
  onUpdated,
  showUser = false,
}: ReviewCardProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOwn = currentUserId === review.userId;

  async function handleDelete() {
    if (!confirm("Supprimer cette lecture ?")) return;
    setDeleting(true);
    await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
    setDeleting(false);
    onDeleted?.(review.id);
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 flex gap-4">
      <Link href={`/books/${review.book.id}`} className="flex-shrink-0">
        {review.book.coverUrl ? (
          <img
            src={review.book.coverUrl}
            alt={review.book.title}
            className="w-12 h-16 object-cover rounded-lg shadow-sm"
          />
        ) : (
          <div className="w-12 h-16 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 text-xl">
            📖
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/books/${review.book.id}`}
              className="font-semibold text-stone-900 hover:text-amber-700 line-clamp-1"
            >
              {review.book.title}
            </Link>
            <div className="text-sm text-stone-500">{review.book.author}</div>
          </div>
          {isOwn && (
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-stone-500 hover:text-stone-700 px-2 py-1 rounded hover:bg-stone-100"
              >
                Modifier
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
              >
                {deleting ? "…" : "Supprimer"}
              </button>
            </div>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <StarRating value={review.rating} size="sm" />
          <span className="text-xs text-stone-400">
            {new Date(review.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        {showUser && review.user && (
          <Link href={`/members/${review.user.id}`} className="text-xs text-amber-600 hover:underline mt-0.5 block">
            {review.user.name}
          </Link>
        )}
        {review.comment && (
          <p className="text-sm text-stone-600 mt-2 line-clamp-3">{review.comment}</p>
        )}
      </div>
      {editing && (
        <EditReviewModal
          review={review}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            onUpdated?.(updated as ReviewCardProps["review"]);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
