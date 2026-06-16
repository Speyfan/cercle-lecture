import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Service d'appel IA, isolé derrière cette fonction pour rester remplaçable
// (un autre fournisseur ne toucherait que ce fichier).

export interface ReadingHistoryItem {
  title: string;
  author: string;
  rating: number;
  comment: string | null;
}

export interface PastRecommendationItem {
  title: string;
  author: string;
  status: string; // EN_ATTENTE | INTERESSE | DEJA_LU | PAS_MON_STYLE | PAS_INTERESSE
}

export interface RecommendationContext {
  history: ReadingHistoryItem[];
  pastRecommendations: PastRecommendationItem[];
  /** Titres à ne jamais reproposer, au format "Titre — Auteur". */
  exclusions: string[];
}

export interface GeneratedRecommendation {
  titre: string;
  auteur: string;
  justification: string;
}

const recommendationSchema = z.object({
  titre: z.string().min(1).max(300),
  auteur: z.string().min(1).max(300),
  justification: z.string().min(1).max(1000),
});
const recommendationsSchema = z.array(recommendationSchema).min(1).max(5);

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "pas encore de réaction",
  INTERESSE: "ça l'intéresse",
  DEJA_LU: "déjà lu",
  PAS_MON_STYLE: "pas son style",
  PAS_INTERESSE: "pas intéressé",
};

const SYSTEM_PROMPT =
  "Tu es un libraire expert et passionné. Ta mission est de recommander des livres réels et existants, " +
  "parfaitement adaptés aux goûts d'un lecteur, à partir de son historique de lecture et de ses retours. " +
  "Tu ne recommandes jamais un livre déjà lu ou déjà proposé. " +
  "Tu réponds exclusivement en JSON valide, sans aucun texte autour.";

function buildUserPrompt(ctx: RecommendationContext): string {
  const history =
    ctx.history.length > 0
      ? ctx.history
          .map(
            (h) =>
              `- ${h.title} — ${h.author} — ${h.rating}/5${
                h.comment ? ` — « ${h.comment.replace(/\s+/g, " ").trim()} »` : ""
              }`
          )
          .join("\n")
      : "(aucune lecture renseignée)";

  const past =
    ctx.pastRecommendations.length > 0
      ? ctx.pastRecommendations
          .map(
            (r) =>
              `- ${r.title} — ${r.author} → ${STATUS_LABELS[r.status] ?? r.status}`
          )
          .join("\n")
      : "(aucune recommandation passée)";

  const exclusions =
    ctx.exclusions.length > 0
      ? ctx.exclusions.map((e) => `- ${e}`).join("\n")
      : "(aucun)";

  return `Voici l'historique de lecture du membre (titre — auteur — note/5 — commentaire) :
${history}

Voici les recommandations déjà faites par le passé et la réaction du membre :
${past}

Ne recommande EN AUCUN CAS l'un des livres suivants (déjà lus ou déjà proposés) :
${exclusions}

Consignes :
- Propose exactement 5 livres réels et facilement trouvables.
- Varie les styles tout en restant cohérent avec les goûts détectés (note haute = goût fort ; commentaires = signal de préférence).
- Tiens compte des rejets : évite ce qui ressemble à ce que le membre a marqué « pas son style » ou « pas intéressé ».
- Pour chaque livre, donne une justification personnalisée qui fait référence à une lecture précise du membre.
- Réponds uniquement avec un tableau JSON de 5 objets de la forme {"titre": "...", "auteur": "...", "justification": "..."}, sans aucun texte autour.`;
}

/** Extrait le premier tableau JSON d'une réponse, en retirant d'éventuels backticks Markdown. */
function extractJsonArray(raw: string): unknown {
  let text = raw.trim();
  // Retire les clôtures Markdown ```json ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // À défaut, isole du premier '[' au dernier ']'.
  if (!text.startsWith("[")) {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      text = text.slice(start, end + 1);
    }
  }
  return JSON.parse(text);
}

function getClient(): Anthropic {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error("AI_API_KEY is not set");
  return new Anthropic({ apiKey });
}

async function callModel(ctx: RecommendationContext): Promise<string> {
  const client = getClient();
  const model = process.env.AI_MODEL || "claude-opus-4-8";

  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(ctx) }],
  });

  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/**
 * Génère 5 recommandations validées. Relance une fois l'appel si le parsing
 * ou la validation échoue (l'IA renvoie parfois du texte autour du JSON).
 */
export async function generateBookRecommendations(
  ctx: RecommendationContext
): Promise<GeneratedRecommendation[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callModel(ctx);
      const parsed = extractJsonArray(raw);
      const validated = recommendationsSchema.parse(parsed);
      return validated;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Échec de génération des recommandations: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
