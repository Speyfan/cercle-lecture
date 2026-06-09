"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    registrationCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'inscription.");
      } else {
        router.push("/login");
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-stone-900">📚 Cercle de Lecture</h1>
        <p className="text-stone-500 mt-2">Créer un compte</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Nom</label>
          <input
            name="name"
            type="text"
            value={form.name}
            onChange={onChange}
            required
            minLength={2}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Prénom Nom"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="vous@exemple.fr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Mot de passe
          </label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            required
            minLength={8}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="8 caractères minimum"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Code d&apos;invitation
          </label>
          <input
            name="registrationCode"
            type="text"
            value={form.registrationCode}
            onChange={onChange}
            required
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Code partagé par le cercle"
          />
        </div>
        {error && (
          <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? "Inscription…" : "Créer un compte"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-500">
        Déjà membre ?{" "}
        <Link href="/login" className="text-amber-600 hover:underline font-medium">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
