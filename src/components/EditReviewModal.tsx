"use client";

import { useState } from "react";
import StarRating from "./StarRating";

interface EditReviewModalProps {
  review: {
    id: string;
    rating: number;
    comment: string | null;
    book: { title: string; author: string };
  };
  onClose: () => void;
  onSaved: (review: unknown) => void;
}

export default function EditReviewModal({ review, onClose, onSaved }: EditReviewModalProps) {
  const [rating, setRating] = useState(review.rating);
  const [comment, setComment] = useState(review.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Erreur.");
      } else {
        const updated = await res.json();
        onSaved(updated);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-stone-900 mb-1">Modifier ma lecture</h2>
        <p className="text-sm text-stone-500 mb-4">
          {review.book.title} — {review.book.author}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Note</label>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Commentaire <span className="text-stone-400">(optionnel)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              placeholder="Votre avis sur ce livre…"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || rating === 0}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
