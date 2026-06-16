import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const updateSchema = z.object({
  status: z.enum([
    "EN_ATTENTE",
    "INTERESSE",
    "DEJA_LU",
    "PAS_MON_STYLE",
    "PAS_INTERESSE",
  ]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { id } = await params;
  const recommendation = await prisma.recommendation.findUnique({ where: { id } });
  if (!recommendation) {
    return NextResponse.json({ error: "Recommandation introuvable." }, { status: 404 });
  }
  if (recommendation.userId !== session.user.id) {
    return NextResponse.json({ error: "Interdit." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  const updated = await prisma.recommendation.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json(updated);
}
