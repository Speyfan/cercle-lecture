"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface ProfileData {
  name: string;
  email: string;
  newsletterEnabled: boolean;
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    newsletterEnabled: true,
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { type: "ok" | "err"; text: string }>>({});

  useEffect(() => {
    async function fetchProfile() {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = await res.json();
      setProfile({
        name: data.name,
        email: data.email,
        newsletterEnabled: data.newsletterEnabled,
      });
    }
    fetchProfile();
  }, []);

  async function saveField(field: string, data: Record<string, unknown>) {
    setSaving(field);
    setMessages((m) => ({ ...m, [field]: { type: "ok", text: "" } }));
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        setMessages((m) => ({ ...m, [field]: { type: "err", text: result.error } }));
      } else {
        setMessages((m) => ({ ...m, [field]: { type: "ok", text: "Enregistré ✓" } }));
        if (result.name || result.email) {
          await updateSession({ name: result.name, email: result.email });
        }
      }
    } catch {
      setMessages((m) => ({ ...m, [field]: { type: "err", text: "Erreur réseau." } }));
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    await saveField("info", { name: profile.name, email: profile.email });
  }

  async function handleToggleNewsletter() {
    const next = !profile.newsletterEnabled;
    setProfile((p) => ({ ...p, newsletterEnabled: next }));
    await saveField("newsletter", { newsletterEnabled: next });
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessages((m) => ({
        ...m,
        password: { type: "err", text: "Les mots de passe ne correspondent pas." },
      }));
      return;
    }
    await saveField("password", {
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
    });
    setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
  }

  function msg(field: string) {
    const m = messages[field];
    if (!m?.text) return null;
    return (
      <p
        className={`text-sm mt-2 ${
          m.type === "ok" ? "text-green-600" : "text-red-600"
        }`}
      >
        {m.text}
      </p>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Mon profil</h1>

      {/* Informations personnelles */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6 mb-4">
        <h2 className="font-semibold text-stone-800 mb-4">Informations</h2>
        <form onSubmit={handleSaveInfo} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Nom</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              required
              minLength={2}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          {msg("info")}
          <button
            type="submit"
            disabled={saving === "info"}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving === "info" ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </section>

      {/* Newsletter */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-stone-800">Newsletter mensuelle</h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Recevoir 5 recommandations personnalisées chaque mois par email.
            </p>
          </div>
          <button
            onClick={handleToggleNewsletter}
            disabled={saving === "newsletter"}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              profile.newsletterEnabled ? "bg-amber-500" : "bg-stone-300"
            }`}
            role="switch"
            aria-checked={profile.newsletterEnabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                profile.newsletterEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        {msg("newsletter")}
      </section>

      {/* Mot de passe */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="font-semibold text-stone-800 mb-4">Changer le mot de passe</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          {msg("password")}
          <button
            type="submit"
            disabled={saving === "password"}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving === "password" ? "Enregistrement…" : "Changer le mot de passe"}
          </button>
        </form>
      </section>
    </div>
  );
}
