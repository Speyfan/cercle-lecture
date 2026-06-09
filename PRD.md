# PRD — « Cercle de Lecture »

**Application de suivi de lectures + recommandations IA mensuelles**

Version 1.0 · Document destiné à une implémentation par Claude Code

---

## 1. Vision & résumé

Une petite application web où un cercle restreint de proches (moins d'une vingtaine de personnes) enregistre les livres qu'ils lisent, leur attribue une note sur 5 sous forme d'étoiles et un commentaire libre. Chaque mois, chaque membre reçoit par email une newsletter contenant 5 recommandations de lecture **personnalisées**, générées par appel à une IA à partir de son historique de lecture et de ses retours passés. Les membres peuvent voir les avis des autres et réagir aux recommandations reçues.

L'application doit être **simple à déployer sur un VPS** (un `docker compose up` suffit) et **gratuite à exploiter**, à l'exception des appels à l'API d'IA et du coût du VPS.

### Principes directeurs

- **Simplicité avant tout** : peu d'utilisateurs, pas de scalabilité massive à prévoir, pas de microservices.
- **Pertinence des recommandations** : c'est le cœur de la valeur produit. La qualité du prompt et la boucle de feedback priment sur la quantité de fonctionnalités.
- **Auto-hébergeable et gratuit** : tout le logiciel repose sur des briques open source.
- **Maintenable seul** : un seul développeur (ou Claude Code) doit pouvoir comprendre et faire évoluer l'ensemble.

---

## 2. Objectifs et hors-périmètre

### Objectifs (v1)

1. Création de compte (nom, email, mot de passe) restreinte au cercle proche.
2. Saisie d'une lecture : titre, auteur, note (1 à 5 étoiles), commentaire libre.
3. Consultation de sa propre bibliothèque et de celle des autres membres.
4. Génération mensuelle automatique de 5 recommandations pertinentes par IA.
5. Envoi de la newsletter par email.
6. Possibilité de réagir à chaque recommandation (déjà lu, pas mon style, ça m'intéresse, etc.).
7. Page profil permettant au minimum de régler son adresse email et d'activer/désactiver la newsletter.

### Hors-périmètre (v1)

- Application mobile native (le site sera responsive, accessible sur mobile).
- Système social avancé (commentaires sur les avis des autres, likes, messagerie).
- Import automatique depuis Goodreads / Babelio / Amazon.
- Gestion fine des rôles et permissions au-delà d'un simple rôle « admin ».
- Internationalisation : l'interface est en **français** uniquement.

---

## 3. Utilisateurs cibles

| Persona | Description | Besoin principal |
|---|---|---|
| Le membre lecteur | Un proche du créateur, lit régulièrement | Noter ses lectures rapidement, recevoir de bonnes recommandations |
| L'administrateur | Le créateur de l'app | Gérer les comptes, déclencher manuellement une newsletter de test, surveiller que tout fonctionne |

Volume attendu : **5 à 20 utilisateurs**. Aucune montée en charge à anticiper.

---

## 4. Parcours utilisateur (user stories)

- En tant que visiteur invité, je crée un compte avec mon nom, mon email et un mot de passe (et un code d'invitation partagé), afin d'accéder à l'application.
- En tant que membre, j'ajoute un livre que j'ai lu en saisissant le titre et l'auteur, en cliquant sur un nombre d'étoiles, et en écrivant un commentaire libre.
- En tant que membre, je modifie ou supprime une de mes entrées.
- En tant que membre, je consulte la liste de mes lectures, triées par date ou par note.
- En tant que membre, je consulte les avis des autres membres sur un livre ou en parcourant un fil d'activité.
- En tant que membre, je reçois chaque mois un email avec 5 recommandations justifiées.
- En tant que membre, depuis l'app ou via un lien de l'email, je marque une recommandation comme « déjà lu », « pas mon style », « ça m'intéresse » ou « pas intéressé ».
- En tant que membre, je modifie mon adresse email et j'active/désactive la réception de la newsletter depuis ma page profil.
- En tant qu'administrateur, je déclenche manuellement la génération d'une newsletter pour tester.

---

## 5. Spécifications fonctionnelles détaillées

### 5.1 Authentification & comptes

- Inscription par **nom + email + mot de passe**.
- Pour éviter que n'importe qui s'inscrive (l'app sera exposée publiquement sur le VPS), l'inscription exige un **code d'invitation** partagé, défini via une variable d'environnement (`REGISTRATION_CODE`). Tant que ce code n'est pas fourni correctement, la création de compte est refusée.
- Connexion par email + mot de passe. Session persistée (cookie sécurisé).
- Mots de passe stockés **hachés** (bcrypt ou argon2), jamais en clair.
- Le premier compte créé (ou un email défini dans `ADMIN_EMAIL`) reçoit le rôle `admin`.
- Déconnexion.

### 5.2 Saisie & gestion des lectures

- Formulaire d'ajout : titre (obligatoire), auteur (obligatoire), note 1–5 (obligatoire, sélecteur d'étoiles cliquable), commentaire (optionnel, texte libre multi-lignes).
- Aide à la saisie recommandée : un champ de recherche qui interroge l'**API Open Library** (gratuite, sans clé) pour proposer un titre/auteur existant et récupérer une couverture. La saisie manuelle reste possible si aucun résultat.
- Affichage des étoiles : composant visuel (étoiles pleines/vides), pas un simple chiffre.
- Une entrée = une lecture par utilisateur pour un livre donné (un membre peut éditer sa note/commentaire ; pas de doublon du même livre par le même membre).
- Édition et suppression de ses propres entrées uniquement.

### 5.3 Consultation des avis des autres

- Page « livre » : pour un livre donné, affiche tous les avis des membres (nom, note, commentaire, date).
- Fil d'activité global : liste chronologique des dernières lectures ajoutées par l'ensemble des membres.
- Page « bibliothèque d'un membre » : la liste des lectures d'un autre membre (lecture seule).

### 5.4 Recommandations IA

C'est la fonctionnalité centrale. Voir section **6** pour le détail technique du moteur.

- Chaque mois, 5 recommandations sont générées par membre actif.
- Chaque recommandation comprend : titre, auteur, et une **justification personnalisée** (1–2 phrases expliquant pourquoi ce livre, en référence aux goûts du membre).
- Les recommandations sont enregistrées en base et affichées dans une page « Mes recommandations » dans l'app, en plus d'être envoyées par email.
- Un bouton « Générer mes recommandations maintenant » est disponible dans l'app (utile pour tester et pour les nouveaux membres), avec une limite anti-abus (ex. 1 génération manuelle / 24 h hors admin).

### 5.5 Réactions aux recommandations

Pour chaque recommandation, le membre peut choisir un statut parmi :

- `INTERESSE` — ça m'intéresse / dans ma liste
- `DEJA_LU` — déjà lu
- `PAS_MON_STYLE` — pas mon style
- `PAS_INTERESSE` — pas intéressé (autre raison)
- `EN_ATTENTE` — état par défaut, aucune réaction

Ces statuts alimentent directement le prompt du mois suivant (voir 6.3) afin d'améliorer la pertinence. Les réactions sont accessibles depuis l'app et via des liens dans l'email (qui ouvrent la page recommandations).

### 5.6 Page profil

- Modifier son nom.
- Modifier son adresse email.
- Activer / désactiver la réception de la newsletter (`newsletterEnabled`).
- Changer son mot de passe.
- (Optionnel v1.1) vérification de l'email par lien magique.

### 5.7 Espace administrateur (minimal)

- Lister les utilisateurs.
- Déclencher manuellement la génération + envoi de newsletter (pour un membre ou pour tous), afin de tester sans attendre le cron mensuel.
- Désactiver/supprimer un compte.

---

## 6. Moteur de recommandation (le cœur du produit)

L'exigence « je veux que les recommandations soient vraiment pertinentes » repose sur trois piliers : un **bon prompt nourri d'un maximum de signal**, une **boucle de feedback**, et une **validation des résultats** pour éviter les livres inventés.

### 6.1 Données envoyées à l'IA

Pour un membre, on construit un contexte à partir de :

1. **Son historique de lecture** : pour chaque livre lu → titre, auteur, note /5, et commentaire. Les commentaires sont un signal de goût très riche, il faut les inclure.
2. **Ses recommandations passées et leurs statuts** : afin de ne jamais re-recommander un livre déjà proposé, et de comprendre ce qui a été rejeté (`PAS_MON_STYLE`, `PAS_INTERESSE`) ou apprécié (`INTERESSE`).
3. **Une liste d'exclusion explicite** : tous les titres déjà lus et déjà recommandés, à ne pas reproposer.

### 6.2 Format de sortie attendu

On demande à l'IA de répondre **uniquement en JSON** (pas de texte autour), sous la forme d'un tableau de 5 objets :

```json
[
  {
    "titre": "Titre du livre",
    "auteur": "Nom de l'auteur",
    "justification": "Pourquoi ce livre correspond aux goûts du membre, en 1-2 phrases."
  }
]
```

Le code parse ce JSON de façon robuste (en retirant d'éventuels backticks Markdown) et le valide (schéma via zod). En cas d'échec de parsing, on relance l'appel une fois.

### 6.3 Gabarit de prompt (à adapter en code)

> **System** : Tu es un libraire expert et passionné. Ta mission est de recommander des livres réels et existants, parfaitement adaptés aux goûts d'un lecteur, à partir de son historique de lecture et de ses retours. Tu ne recommandes jamais un livre déjà lu ou déjà proposé. Tu réponds exclusivement en JSON valide, sans aucun texte autour.
>
> **User** :
> Voici l'historique de lecture du membre (titre — auteur — note/5 — commentaire) :
> {liste des lectures}
>
> Voici les recommandations déjà faites par le passé et la réaction du membre :
> {liste recommandations + statut}
>
> Ne recommande EN AUCUN CAS l'un des livres suivants (déjà lus ou déjà proposés) :
> {liste d'exclusion}
>
> Consignes :
> - Propose exactement 5 livres réels et facilement trouvables.
> - Varie les styles tout en restant cohérent avec les goûts détectés (note haute = goût fort ; commentaires = signal de préférence).
> - Tiens compte des rejets : évite ce qui ressemble à ce que le membre a marqué « pas mon style ».
> - Pour chaque livre, donne une justification personnalisée qui fait référence à une lecture précise du membre.
> - Réponds uniquement avec le tableau JSON décrit.

Paramètres suggérés : température modérée (≈ 0.7) pour de la diversité sans dérive.

### 6.4 Validation post-génération (anti-hallucination)

Les IA peuvent inventer des titres. Après réception des 5 propositions :

1. Pour chaque livre, requête à l'**API Open Library** (`https://openlibrary.org/search.json?title=...&author=...`) pour vérifier qu'il existe et récupérer une couverture.
2. Si un livre n'est pas trouvé, on le marque comme non vérifié (ou on relance une demande de remplacement à l'IA). En v1, on peut simplement signaler les livres non vérifiés sans bloquer.
3. On enrichit la recommandation avec `coverUrl` et éventuellement un lien Open Library.

### 6.5 Cas particuliers

- **Membre sans historique suffisant** : pas de génération tant que le membre n'a pas **au moins 2 livres notés**. À la place, envoyer un email d'accueil l'invitant à enregistrer ses premières lectures.
- **Idempotence mensuelle** : ne pas générer deux fois la newsletter d'un même mois pour un même membre (vérifier via `RecommendationBatch` du mois courant).

---

## 7. Système de newsletter (emails)

- **Planification** : un job mensuel, **le 1er du mois à 08h00** (fuseau `Europe/Paris`), parcourt tous les membres ayant `newsletterEnabled = true` et un email valide.
- Pour chaque membre : génération des recommandations (section 6) → création d'un `RecommendationBatch` → rendu d'un email HTML → envoi.
- **Rendu email** : HTML simple et responsive, listant les 5 recommandations avec couverture, titre, auteur, justification, et des boutons/liens de réaction renvoyant vers la page « Mes recommandations » de l'app.
- **Envoi** : via SMTP (Nodemailer) en utilisant **Brevo** (palier gratuit : 300 emails/jour, largement suffisant). Réglages SMTP Brevo : hôte `smtp-relay.brevo.com`, port `587`, identifiant et clé SMTP fournis par Brevo, tous renseignés dans les variables d'environnement. L'adresse expéditrice (`MAIL_FROM`) doit être une adresse vérifiée dans le compte Brevo.
- **Traçabilité** : journaliser chaque envoi (succès/échec) pour le debug.

---

## 8. Architecture technique

### 8.1 Stack retenue

| Couche | Choix | Justification |
|---|---|---|
| Framework full-stack | **Next.js (App Router, TypeScript)** | Front + back dans un seul déploiement, React pour l'UI (étoiles), écosystème riche |
| Style | **Tailwind CSS** (+ shadcn/ui optionnel) | Rapide, gratuit, cohérent |
| ORM & base | **Prisma + SQLite** | SQLite = un seul fichier, zéro config, parfait pour < 50 users ; sauvegarde = copie de fichier |
| Authentification | **Auth.js (NextAuth) v5, provider Credentials** | Gestion de session/CSRF intégrée |
| Email | **Nodemailer + Brevo (SMTP)** | Palier gratuit 300 emails/jour, bonne délivrabilité ; SMTP standard donc fournisseur remplaçable sans toucher au code |
| IA | **API Anthropic Claude**, abstraite derrière un service | Provider remplaçable (OpenAI, etc.) sans toucher au reste |
| Données livres | **API Open Library** (gratuite, sans clé) | Vérification d'existence + couvertures |
| Planification | **Conteneur cron dédié** (node-cron) ou cron système appelant un endpoint protégé | Fiable et simple à conteneuriser |
| Nom de domaine | **Sous-domaine DuckDNS gratuit** (`xxx.duckdns.org` → IP du VPS) | Permet à Let's Encrypt de délivrer un vrai certificat HTTPS (impossible sur IP nue) |
| Reverse proxy / HTTPS | **Caddy** | HTTPS automatique (Let's Encrypt) gratuit, config minimale |
| Conteneurisation | **Docker + Docker Compose** | `docker compose up -d` pour tout déployer |

> Note : SQLite est recommandé pour la simplicité maximale. Si le créateur préfère PostgreSQL, l'usage de Prisma rend la bascule triviale (changer le `provider` et la `DATABASE_URL`). Pour ce volume d'utilisateurs, SQLite suffit largement.

### 8.2 Modèle de données (schéma Prisma indicatif)

```prisma
model User {
  id                String   @id @default(cuid())
  name              String
  email             String   @unique
  passwordHash      String
  role              String   @default("user") // "user" | "admin"
  newsletterEnabled Boolean  @default(true)
  createdAt         DateTime @default(now())
  reviews           Review[]
  recommendations   Recommendation[]
  batches           RecommendationBatch[]
}

model Book {
  id             String   @id @default(cuid())
  title          String
  author         String
  openLibraryKey String?  @unique
  coverUrl       String?
  createdAt      DateTime @default(now())
  reviews        Review[]
  @@unique([title, author])
}

model Review {
  id        String   @id @default(cuid())
  userId    String
  bookId    String
  rating    Int      // 1..5
  comment   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])
  book      Book     @relation(fields: [bookId], references: [id])
  @@unique([userId, bookId]) // un avis par livre par membre
}

model RecommendationBatch {
  id              String   @id @default(cuid())
  userId          String
  month           String   // ex. "2026-06"
  generatedAt     DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id])
  recommendations Recommendation[]
  @@unique([userId, month]) // idempotence mensuelle
}

model Recommendation {
  id             String   @id @default(cuid())
  userId         String
  batchId        String
  title          String
  author         String
  reason         String   // justification de l'IA
  coverUrl       String?
  openLibraryKey String?
  verified       Boolean  @default(false)
  status         String   @default("EN_ATTENTE")
  // EN_ATTENTE | INTERESSE | DEJA_LU | PAS_MON_STYLE | PAS_INTERESSE
  createdAt      DateTime @default(now())
  user           User                @relation(fields: [userId], references: [id])
  batch          RecommendationBatch @relation(fields: [batchId], references: [id])
}
```

### 8.3 Endpoints / actions clés (indicatif)

- `POST /api/auth/*` — gérés par Auth.js (login, logout, session).
- `POST /api/register` — création de compte (vérifie `REGISTRATION_CODE`).
- `GET /api/books/search?q=` — proxy vers Open Library pour l'autocomplétion.
- `POST /api/reviews` / `PATCH /api/reviews/:id` / `DELETE /api/reviews/:id` — CRUD des lectures.
- `GET /api/reviews?userId=` / `GET /api/books/:id` — consultation des avis (les siens et ceux des autres).
- `POST /api/recommendations/generate` — génération à la demande (avec limite anti-abus).
- `PATCH /api/recommendations/:id` — mise à jour du statut (réaction).
- `PATCH /api/profile` — mise à jour nom/email/newsletter/mot de passe.
- `POST /api/admin/newsletter/run` — déclenchement manuel (admin uniquement).
- `POST /internal/cron/monthly` — endpoint protégé par un secret, appelé par le job mensuel.

> Les endpoints peuvent être implémentés en Route Handlers Next.js ou en Server Actions selon les préférences de Claude Code.

---

## 9. Exigences non-fonctionnelles

### Sécurité

- Mots de passe hachés (bcrypt/argon2).
- Variables sensibles uniquement via `.env` (jamais commitées) ; liste complète en section 10.1.
- Validation systématique des entrées côté serveur (zod).
- Rate limiting basique sur le login et la génération de recommandations.
- HTTPS obligatoire en production (géré par Caddy).
- L'endpoint cron interne n'est appelable qu'avec `CRON_SECRET`.

### Performance & fiabilité

- Pas d'exigence de charge particulière. Les appels IA et Open Library sont faits en arrière-plan lors du cron, pas dans le chemin critique d'une page.
- Gérer proprement les erreurs d'appel IA (retry simple, log, et ne pas faire échouer toute la newsletter si un membre échoue).

### Sauvegarde

- Sauvegarde de la base = copie périodique du fichier SQLite (script + cron système, ou tâche dans le conteneur cron). Stocker hors du conteneur (volume monté).

### Coûts

- Tout le logiciel est open source et gratuit.
- Seuls coûts récurrents : appels à l'API IA (quelques centimes par génération, ~5 recommandations) et le VPS.
- Email : rester dans un palier gratuit suffit pour ce volume.

---

## 10. Déploiement sur VPS

Objectif : un déploiement en quelques commandes.

### Nom de domaine via DuckDNS (gratuit)

Il n'y a pas de nom de domaine dédié : on utilise un **sous-domaine DuckDNS gratuit** (ex. `cercle-lecture.duckdns.org`) pointant vers l'IP du VPS. C'est nécessaire car Let's Encrypt ne délivre pas de certificat HTTPS pour une adresse IP nue — or HTTPS est requis pour que les cookies de session sécurisés d'Auth.js fonctionnent.

Mise en place : créer un compte sur duckdns.org, réserver un sous-domaine, y renseigner l'IP publique du VPS. (Le VPS ayant une IP fixe, une simple mise à jour ponctuelle suffit ; un petit cron de rafraîchissement DuckDNS peut être ajouté par précaution.)

### Composition Docker (indicative)

`docker-compose.yml` avec trois services :

1. **app** — l'application Next.js (build de production), volume monté pour le fichier SQLite.
2. **cron** — petit conteneur Node exécutant node-cron, qui appelle l'endpoint `/internal/cron/monthly` chaque mois (ou directement le service de génération). Partage le même réseau que `app`.
3. **caddy** — reverse proxy, termine le TLS et route vers `app`. Un `Caddyfile` minimal :

```
cercle-lecture.duckdns.org {
    reverse_proxy app:3000
}
```

Caddy détecte le domaine et obtient automatiquement le certificat Let's Encrypt. Les ports 80 et 443 du VPS doivent être ouverts (pare-feu) pour la validation ACME et l'accès HTTPS.

### Procédure de mise en route

1. Créer le sous-domaine DuckDNS et le faire pointer vers l'IP du VPS.
2. Ouvrir les ports 80 et 443 sur le VPS.
3. `git clone` du dépôt sur le VPS.
4. Copier `.env.example` en `.env` et renseigner les variables (voir 10.1).
5. `docker compose up -d --build`.
6. Migrations Prisma au premier démarrage (`prisma migrate deploy`, idéalement automatisé dans l'entrypoint du conteneur `app`).
7. Caddy obtient automatiquement le certificat HTTPS pour le sous-domaine DuckDNS.
8. Créer le premier compte (qui devient admin, car son email correspond à `ADMIN_EMAIL`).

Un `README.md` doit documenter ces étapes et la liste exhaustive des variables d'environnement.

### 10.1 Variables d'environnement (`.env.example`)

```bash
# --- Application ---
APP_URL=https://cercle-lecture.duckdns.org   # sous-domaine DuckDNS, en HTTPS
NODE_ENV=production

# --- Base de données (SQLite) ---
DATABASE_URL=file:/data/app.db               # fichier sur le volume monté

# --- Authentification (Auth.js) ---
AUTH_SECRET=                                  # chaîne aléatoire longue (openssl rand -base64 32)
REGISTRATION_CODE=                            # code d'invitation partagé au cercle
ADMIN_EMAIL=                                  # email du compte qui devient admin

# --- IA (Anthropic Claude) ---
AI_API_KEY=                                   # clé API Anthropic
AI_MODEL=claude-sonnet-4-5                    # modèle utilisé pour les recommandations

# --- Email (Brevo SMTP) ---
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=                                    # identifiant SMTP Brevo
SMTP_PASS=                                    # clé SMTP Brevo
MAIL_FROM=                                    # adresse expéditrice vérifiée dans Brevo

# --- Cron interne ---
CRON_SECRET=                                  # secret protégeant /internal/cron/monthly
TZ=Europe/Paris                               # fuseau pour le déclenchement mensuel
```

---

## 11. Phases de livraison

### Phase 1 — MVP (sans IA)

- Auth + inscription par code d'invitation.
- CRUD des lectures avec note étoiles + commentaire.
- Recherche Open Library pour l'autocomplétion + couvertures.
- Consultation de sa bibliothèque, du fil d'activité et des avis des autres.
- Page profil (nom, email, mot de passe, toggle newsletter).
- Déploiement Docker + Caddy fonctionnel.

### Phase 2 — Recommandations & newsletter

- Service d'appel IA + construction du prompt + parsing JSON robuste.
- Validation Open Library des livres recommandés.
- Page « Mes recommandations » + réactions (statuts).
- Cron mensuel + envoi email HTML + journalisation.
- Endpoint admin de déclenchement manuel + bouton « générer maintenant ».

### Phase 3 — Finitions

- Vérification d'email (lien magique).
- Boucle de feedback affinée dans le prompt (analyse des rejets).
- Sauvegardes automatiques SQLite.
- Améliorations UI/UX et accessibilité.

---

## 12. Décisions arrêtées

Toutes les décisions structurantes sont prises :

- **Base de données** : SQLite (simplicité maximale pour ce volume ; bascule PostgreSQL triviale via Prisma si besoin un jour).
- **Fournisseur IA** : Claude (Anthropic), derrière une abstraction remplaçable.
- **Email** : Brevo en SMTP (palier gratuit 300/jour), via Nodemailer.
- **Nom de domaine** : sous-domaine DuckDNS gratuit pointant vers l'IP du VPS (indispensable pour le HTTPS).
- **Inscription** : restreinte par un code d'invitation partagé (`REGISTRATION_CODE`).
- **Newsletter** : envoyée le **1er du mois à 08h00**, fuseau `Europe/Paris`.
- **Seuil minimum** : **2 livres notés** avant la première génération de recommandations.

Points pratiques restant à la charge du créateur (pas des décisions de conception) : disposer d'un VPS avec Docker installé, créer le compte Brevo et récupérer ses identifiants SMTP, créer le sous-domaine DuckDNS, et obtenir une clé API Anthropic.

---

## 13. Critères d'acceptation (résumé testable)

- [ ] Un proche peut créer un compte avec le bon code d'invitation, et seulement dans ce cas.
- [ ] Un membre peut ajouter, noter (étoiles cliquables 1–5) et commenter une lecture, puis la modifier/supprimer.
- [ ] Un membre voit les avis des autres membres sur un livre.
- [ ] La génération produit 5 recommandations cohérentes avec l'historique, jamais des livres déjà lus/proposés, chacune justifiée.
- [ ] Les livres recommandés sont vérifiés via Open Library (couverture affichée quand disponible).
- [ ] Un membre peut réagir à une recommandation, et cette réaction influence la génération suivante.
- [ ] La newsletter mensuelle part automatiquement par email aux membres abonnés.
- [ ] La page profil permet de changer email, nom, mot de passe et l'abonnement newsletter.
- [ ] L'ensemble se déploie via `docker compose up -d` avec HTTPS automatique.