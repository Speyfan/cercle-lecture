import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { runForUser, runForAllEligible } from "@/lib/newsletter";

const bodySchema = z.object({
  userId: z.string().optional(),
  // Par défaut, le déclenchement admin force la régénération + l'envoi (test).
  force: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const { userId, force } = parsed.data;

  if (userId) {
    const result = await runForUser(userId, { force });
    return NextResponse.json({ results: [result] });
  }

  const results = await runForAllEligible({ force });
  return NextResponse.json({ results });
}
