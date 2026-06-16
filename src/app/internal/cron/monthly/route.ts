import { NextResponse } from "next/server";
import { runForAllEligible } from "@/lib/newsletter";

// Endpoint appelé par le conteneur cron le 1er du mois. Protégé par CRON_SECRET,
// jamais par une session (déclaré public dans auth.config.ts). Respecte
// l'idempotence mensuelle : un membre déjà traité ce mois est ignoré.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré." }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  const provided = auth?.startsWith("Bearer ") ? auth.slice(7) : req.headers.get("x-cron-secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const results = await runForAllEligible({ force: false });
  return NextResponse.json({
    processed: results.length,
    sent: results.filter((r) => r.outcome === "sent").length,
    welcome: results.filter((r) => r.outcome === "welcome").length,
    skipped: results.filter((r) => r.outcome === "skipped").length,
    errors: results.filter((r) => r.outcome === "error").length,
  });
}
