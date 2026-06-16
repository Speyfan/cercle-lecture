import Link from "next/link";
import { verifyEmailToken } from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailToken(token) : "INVALID";

  const content =
    result === "OK"
      ? {
          icon: "✅",
          title: "Adresse vérifiée",
          text: "Votre adresse email a bien été confirmée. Merci !",
        }
      : result === "EXPIRED"
        ? {
            icon: "⏳",
            title: "Lien expiré",
            text: "Ce lien de vérification a expiré. Demandez-en un nouveau depuis votre profil.",
          }
        : {
            icon: "⚠️",
            title: "Lien invalide",
            text: "Ce lien de vérification est invalide ou a déjà été utilisé.",
          };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50">
      <div className="bg-white rounded-2xl border border-stone-200 p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">{content.icon}</div>
        <h1 className="text-xl font-bold text-stone-900 mb-2">{content.title}</h1>
        <p className="text-stone-600 text-sm mb-6">{content.text}</p>
        <Link
          href="/profile"
          className="inline-block bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700"
        >
          Aller à mon profil
        </Link>
      </div>
    </div>
  );
}
