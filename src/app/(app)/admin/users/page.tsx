"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  newsletterEnabled: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (session && session.user.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    async function fetchUsers() {
      const res = await fetch("/api/admin/users");
      if (res.ok) setUsers(await res.json());
      setLoading(false);
    }
    fetchUsers();
  }, [session, router]);

  async function toggleActive(user: AdminUser) {
    setUpdating(user.id);
    const res = await fetch(`/api/admin/users?id=${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, active: updated.active } : u)));
    }
    setUpdating(null);
  }

  async function toggleRole(user: AdminUser) {
    if (user.id === session?.user.id) return;
    setUpdating(user.id);
    const newRole = user.role === "admin" ? "user" : "admin";
    const res = await fetch(`/api/admin/users?id=${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, role: updated.role } : u)));
    }
    setUpdating(null);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-2">Administration — Membres</h1>
      <p className="text-stone-500 text-sm mb-6">
        {users.length} membre{users.length !== 1 ? "s" : ""} au total
      </p>

      {loading ? (
        <div className="text-center py-12 text-stone-400">Chargement…</div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Membre</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Rôle</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 hidden sm:table-cell">Inscrit le</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((user) => (
                <tr key={user.id} className={!user.active ? "opacity-50" : ""}>
                  <td className="px-4 py-3 font-medium text-stone-900">
                    {user.name}
                    {user.id === session?.user.id && (
                      <span className="ml-1 text-xs text-amber-600">(moi)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-500 hidden md:table-cell">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {user.active ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-400 hidden sm:table-cell">
                    {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    {user.id !== session?.user.id && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => toggleRole(user)}
                          disabled={updating === user.id}
                          className="text-xs px-2 py-1 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded"
                        >
                          {user.role === "admin" ? "→ user" : "→ admin"}
                        </button>
                        <button
                          onClick={() => toggleActive(user)}
                          disabled={updating === user.id}
                          className={`text-xs px-2 py-1 rounded ${
                            user.active
                              ? "text-red-500 hover:text-red-700 hover:bg-red-50"
                              : "text-green-600 hover:text-green-800 hover:bg-green-50"
                          }`}
                        >
                          {updating === user.id ? "…" : user.active ? "Désactiver" : "Activer"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
