"use client";

import { useState } from "react";

export interface Reco {
  id: string;
  title: string;
  author: string;
  reason: string;
  coverUrl: string | null;
  openLibraryKey: string | null;
  verified: boolean;
  status: string;
}

const REACTIONS: { value: string; label: string }[] = [
  { value: "INTERESSE", label: "Ça m'intéresse" },
  { value: "DEJA_LU", label: "Déjà lu" },
  { value: "PAS_MON_STYLE", label: "Pas mon style" },
  { value: "PAS_INTERESSE", label: "Pas intéressé" },
];

function RecommendationCard({
  reco,
  onStatusChange,
}: {
  reco: Reco;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function react(value: string) {
    // Re-cliquer la réaction active la retire (retour à EN_ATTENTE).
    const next = reco.status === value ? "EN_ATTENTE" : value;
    setSaving(true);
    const res = await fetch(`/api/recommendations/${reco.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) onStatusChange(reco.id, next);
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 flex gap-4">
      <div className="flex-shrink-0">
        {reco.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reco.coverUrl}
            alt={reco.title}
            className="w-14 h-20 object-cover rounded-lg shadow-sm"
          />
        ) : (
          <div className="w-14 h-20 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 text-2xl">
            📖
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-stone-900">{reco.title}</span>
          {!reco.verified && (
            <span
              title="Ce livre n'a pas pu être vérifié sur Open Library."
              className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200"
            >
              non vérifié
            </span>
          )}
        </div>
        <div className="text-sm text-stone-500">{reco.author}</div>
        <p className="text-sm text-stone-600 mt-2">{reco.reason}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {REACTIONS.map((r) => {
            const active = reco.status === r.value;
            return (
              <button
                key={r.value}
                onClick={() => react(r.value)}
                disabled={saving}
                aria-pressed={active}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 ${
                  active
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function RecommendationsClient({
  initial,
  initialMonth,
}: {
  initial: Reco[];
  initialMonth: string | null;
}) {
  const [recos, setRecos] = useState<Reco[]>(initial);
  const [month, setMonth] = useState<string | null>(initialMonth);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/recommendations/generate", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "La génération a échoué.");
        return;
      }
      setRecos(data.recommendations);
      setMonth(null); // batch fraîchement généré
    } catch {
      setError("La génération a échoué. Réessayez plus tard.");
    } finally {
      setGenerating(false);
    }
  }

  function onStatusChange(id: string, status: string) {
    setRecos((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Mes recommandations</h1>
          {month && (
            <p className="text-sm text-stone-500 mt-0.5">Sélection de {month}</p>
          )}
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-60"
        >
          {generating ? "Génération…" : "Générer maintenant"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3"
        >
          {error}
        </div>
      )}

      {recos.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <div className="text-5xl mb-3">✨</div>
          <p className="font-medium">Aucune recommandation pour l&apos;instant.</p>
          <p className="text-sm mt-1">
            Notez au moins 2 lectures, puis cliquez sur « Générer maintenant ».
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recos.map((reco) => (
            <RecommendationCard key={reco.id} reco={reco} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}
