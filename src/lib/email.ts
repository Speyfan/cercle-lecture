import nodemailer, { type Transporter } from "nodemailer";

export interface EmailRecommendation {
  title: string;
  author: string;
  reason: string;
  coverUrl: string | null;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error("Configuration SMTP incomplète (SMTP_HOST / SMTP_USER / SMTP_PASS).");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 587 = STARTTLS
    auth: { user, pass },
  });
  return transporter;
}

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function mailFrom(): string {
  const from = process.env.MAIL_FROM;
  if (!from) throw new Error("MAIL_FROM n'est pas défini.");
  return from;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="font-size:24px;font-weight:700;">📚 Cercle de Lecture</span>
  </div>
  <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:24px;">
    <h1 style="font-size:20px;margin:0 0 16px;">${escapeHtml(title)}</h1>
    ${body}
  </div>
  <p style="text-align:center;color:#a8a29e;font-size:12px;margin-top:24px;">
    Vous recevez cet email car vous êtes membre du Cercle de Lecture.<br>
    Gérez votre abonnement depuis votre <a href="${appUrl()}/profile" style="color:#b45309;">profil</a>.
  </p>
</div>
</body></html>`;
}

function recommendationBlock(rec: EmailRecommendation): string {
  const cover = rec.coverUrl
    ? `<img src="${escapeHtml(rec.coverUrl)}" alt="" width="56" style="width:56px;border-radius:6px;display:block;">`
    : `<div style="width:56px;height:80px;background:#f5f5f4;border-radius:6px;text-align:center;line-height:80px;font-size:24px;">📖</div>`;
  return `<table role="presentation" width="100%" style="margin-bottom:16px;border-collapse:collapse;"><tr>
    <td valign="top" width="56" style="padding-right:12px;">${cover}</td>
    <td valign="top">
      <div style="font-weight:600;font-size:15px;">${escapeHtml(rec.title)}</div>
      <div style="color:#78716c;font-size:13px;margin-bottom:4px;">${escapeHtml(rec.author)}</div>
      <div style="color:#44403c;font-size:13px;line-height:1.5;">${escapeHtml(rec.reason)}</div>
    </td>
  </tr></table>`;
}

function button(label: string, href: string): string {
  return `<div style="text-align:center;margin-top:20px;">
    <a href="${href}" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;">${escapeHtml(label)}</a>
  </div>`;
}

export async function sendRecommendationEmail(
  to: string,
  name: string,
  recommendations: EmailRecommendation[]
): Promise<void> {
  const intro = `<p style="color:#44403c;font-size:14px;line-height:1.6;margin:0 0 20px;">Bonjour ${escapeHtml(
    name
  )}, voici vos 5 lectures recommandées ce mois-ci, choisies d'après vos goûts et vos retours.</p>`;
  const body =
    intro +
    recommendations.map(recommendationBlock).join("") +
    button("Réagir à mes recommandations", `${appUrl()}/recommendations`);

  await getTransporter().sendMail({
    from: mailFrom(),
    to,
    subject: "Vos recommandations de lecture du mois 📚",
    html: layout("Vos recommandations du mois", body),
  });
}

export async function sendEmailVerification(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const link = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const body =
    `<p style="color:#44403c;font-size:14px;line-height:1.6;">Bonjour ${escapeHtml(
      name
    )}, confirmez votre adresse email pour sécuriser votre compte.</p>
     <p style="color:#78716c;font-size:13px;line-height:1.6;">Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>` +
    button("Vérifier mon adresse", link);

  await getTransporter().sendMail({
    from: mailFrom(),
    to,
    subject: "Vérifiez votre adresse email 📚",
    html: layout("Confirmez votre adresse", body),
  });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const body =
    `<p style="color:#44403c;font-size:14px;line-height:1.6;">Bonjour ${escapeHtml(
      name
    )}, bienvenue dans le Cercle de Lecture !</p>
     <p style="color:#44403c;font-size:14px;line-height:1.6;">Pour recevoir des recommandations vraiment personnalisées, enregistrez au moins deux lectures avec une note et, si vous le souhaitez, un commentaire. Dès que ce sera fait, votre première sélection sera générée.</p>` +
    button("Ajouter mes lectures", `${appUrl()}/my-books`);

  await getTransporter().sendMail({
    from: mailFrom(),
    to,
    subject: "Bienvenue au Cercle de Lecture 📚",
    html: layout("Bienvenue !", body),
  });
}
