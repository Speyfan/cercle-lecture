import { NextResponse } from "next/server";
import { searchBooks } from "@/lib/open-library";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchBooks(q);
    return NextResponse.json({ results });
  } catch {
    // Never let an upstream failure surface as a non-JSON 500 to the client.
    return NextResponse.json({ results: [] });
  }
}
