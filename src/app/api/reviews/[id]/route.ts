import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { id } = await params;
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });
  if (review.userId !== session.user.id) {
    return NextResponse.json({ error: "Interdit." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const updated = await prisma.review.update({
    where: { id },
    data: parsed.data,
    include: { book: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { id } = await params;
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });
  if (review.userId !== session.user.id) {
    return NextResponse.json({ error: "Interdit." }, { status: 403 });
  }

  await prisma.review.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
