"use client";

import { useState } from "react";
import BookSearch from "./BookSearch";
import StarRating from "./StarRating";

interface AddReviewModalProps {
  onClose: () => void;
  onAdded: (review: unknown) => void;
}

export default function AddReviewModal({ onClose, onAdded }: AddReviewModalProps) {
  const [fields, setFields] = useState({
    title: "",
    author: "",
    openLibraryKey: "",
    coverUrl: "",
  });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleBookSelect(book: {
    title: string;
    author: string;
    openLibraryKey?: string;
    coverUrl?: string;
  }) {
    setFields({
      title: book.title,
      author: book.author,
      openLibraryKey: book.openLibraryKey ?? "",
      coverUrl: book.coverUrl ?? "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.title || !fields.author || rating === 0) {
      setError("Titre, auteur et note sont requis.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fields.title,
          author: fields.author,
          rating,
          comment: comment || undefined,
          openLibraryKey: fields.openLibraryKey || undefined,
          coverUrl: fields.coverUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur.");
      } else {
        onAdded(data);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-stone-900 mb-4">Ajouter une lecture</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Recherche (Open Library)
            </label>
            <BookSearch onSelect={handleBookSelect} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fields.title}
              onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))}
              required
              maxLength={200}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Titre du livre"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Auteur <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fields.author}
              onChange={(e) => setFields((f) => ({ ...f, author: e.target.value }))}
              required
              maxLength={200}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Nom de l'auteur"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Note <span className="text-red-500">*</span>
            </label>
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
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? "Enregistrement…" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
