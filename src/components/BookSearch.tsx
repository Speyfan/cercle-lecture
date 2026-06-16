"use client";

import { useState, useRef, useEffect } from "react";
import type { OpenLibraryResult } from "@/lib/open-library";

interface BookSearchProps {
  onSelect: (book: {
    title: string;
    author: string;
    openLibraryKey?: string;
    coverUrl?: string;
  }) => void;
  initialTitle?: string;
}

export default function BookSearch({ onSelect, initialTitle = "" }: BookSearchProps) {
  const [query, setQuery] = useState(initialTitle);
  const [results, setResults] = useState<OpenLibraryResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/books?q=${encodeURIComponent(v)}`);
        const data = res.ok ? await res.json().catch(() => null) : null;
        setResults(data?.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleSelect(book: OpenLibraryResult) {
    setQuery(book.title);
    setOpen(false);
    onSelect({
      title: book.title,
      author: book.author,
      openLibraryKey: book.key,
      coverUrl: book.coverUrl ?? undefined,
    });
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Rechercher un titre sur Open Library…"
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 pr-8"
        />
        {loading && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs">
            ⟳
          </span>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 w-full bg-white border border-stone-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
          {results.map((book) => (
            <li key={book.key}>
              <button
                type="button"
                onClick={() => handleSelect(book)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 text-left"
              >
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-8 h-10 object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-10 bg-stone-100 rounded flex-shrink-0 flex items-center justify-center text-stone-400 text-xs">
                    📖
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-stone-900 truncate">
                    {book.title}
                  </div>
                  <div className="text-xs text-stone-500 truncate">
                    {book.author}
                    {book.year ? ` · ${book.year}` : ""}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
