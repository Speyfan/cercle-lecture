"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "Actualités" },
    { href: "/my-books", label: "Mes lectures" },
    { href: "/recommendations", label: "Recommandations" },
  ];

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-stone-900">
            <span className="text-xl">📚</span>
            <span className="hidden sm:block">Cercle de Lecture</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(href)
                    ? "bg-amber-50 text-amber-700"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                }`}
              >
                {label}
              </Link>
            ))}
            {session?.user.role === "admin" && (
              <Link
                href="/admin"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith("/admin")
                    ? "bg-amber-50 text-amber-700"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                }`}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 text-sm text-stone-700 hover:text-stone-900"
          >
            <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
              {session?.user.name?.[0]?.toUpperCase() ?? "?"}
            </span>
            <span className="hidden sm:block">{session?.user.name}</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-stone-200 py-1 z-50">
              <Link
                href="/profile"
                className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                onClick={() => setMenuOpen(false)}
              >
                Mon profil
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-stone-50"
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
