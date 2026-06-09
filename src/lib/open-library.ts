export interface OpenLibraryResult {
  key: string;
  title: string;
  author: string;
  coverUrl: string | null;
  year: number | null;
}

export async function searchBooks(query: string): Promise<OpenLibraryResult[]> {
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=8&fields=key,title,author_name,cover_i,first_publish_year`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.docs ?? []).map(
    (doc: {
      key: string;
      title: string;
      author_name?: string[];
      cover_i?: number;
      first_publish_year?: number;
    }) => ({
      key: doc.key,
      title: doc.title,
      author: doc.author_name?.[0] ?? "Auteur inconnu",
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : null,
      year: doc.first_publish_year ?? null,
    })
  );
}

export async function verifyBook(
  title: string,
  author: string
): Promise<{ coverUrl: string | null; openLibraryKey: string | null }> {
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=1&fields=key,cover_i`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { coverUrl: null, openLibraryKey: null };
    const data = await res.json();
    const doc = data.docs?.[0];
    if (!doc) return { coverUrl: null, openLibraryKey: null };
    return {
      openLibraryKey: doc.key ?? null,
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : null,
    };
  } catch {
    return { coverUrl: null, openLibraryKey: null };
  }
}
