import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function requireAdmin(session: { user: { role: string } } | null) {
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const session = await auth();
  const deny = requireAdmin(session);
  if (deny) return deny;

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, newsletterEnabled: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

const updateUserSchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(["user", "admin"]).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  const deny = requireAdmin(session);
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");
  if (!userId) return NextResponse.json({ error: "ID requis." }, { status: 400 });

  if (userId === session!.user.id) {
    return NextResponse.json({ error: "Impossible de modifier son propre compte." }, { status: 400 });
  }

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  return NextResponse.json(user);
}
