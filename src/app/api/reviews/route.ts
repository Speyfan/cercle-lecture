import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const createReviewSchema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().min(1).max(200),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  openLibraryKey: z.string().optional(),
  coverUrl: z.string().url().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? session.user.id;

  const reviews = await prisma.review.findMany({
    where: { userId },
    include: { book: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reviews);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides.", details: parsed.error.flatten() }, { status: 400 });
    }

    const { title, author, rating, comment, openLibraryKey, coverUrl } = parsed.data;

    const book = await prisma.book.upsert({
      where: openLibraryKey ? { openLibraryKey } : { title_author: { title, author } },
      create: { title, author, openLibraryKey, coverUrl },
      update: { coverUrl: coverUrl ?? undefined },
    });

    const existing = await prisma.review.findUnique({
      where: { userId_bookId: { userId: session.user.id, bookId: book.id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Vous avez déjà une entrée pour ce livre." },
        { status: 409 }
      );
    }

    const review = await prisma.review.create({
      data: { userId: session.user.id, bookId: book.id, rating, comment },
      include: { book: true },
    });

    return NextResponse.json(review, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
