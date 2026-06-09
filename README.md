# Cercle de Lecture

Application web privée pour noter ses lectures (étoiles + commentaire), consulter les avis des proches et recevoir chaque mois des recommandations personnalisées générées par IA.

## Stack

- **Next.js 16** (App Router, TypeScript) + Tailwind CSS
- **Prisma 7** + SQLite
- **Auth.js v5** (provider Credentials, inscription par code d'invitation)
- **Nodemailer** + Brevo SMTP (Phase 2)
- **API Anthropic Claude** pour les recommandations (Phase 2)
- **API Open Library** pour la recherche de livres et les couvertures
- **Docker Compose** : services `app` + `caddy`
- **Caddy** : reverse proxy avec HTTPS automatique (Let's Encrypt)
- **DuckDNS** : sous-domaine gratuit pour le certificat HTTPS

---

## Déploiement sur VPS

### Prérequis

- VPS avec Docker et Docker Compose installés
- Ports **80** et **443** ouverts dans le pare-feu
- Un compte [Brevo](https://www.brevo.com) (Phase 2, gratuit jusqu'à 300 emails/jour)
- Une clé API [Anthropic](https://console.anthropic.com) (Phase 2)

### 1. Sous-domaine DuckDNS

1. Créer un compte sur [duckdns.org](https://www.duckdns.org)
2. Réserver un sous-domaine (ex. `cercle-lecture`)
3. Renseigner l'adresse IP publique de votre VPS
4. Votre domaine sera : `cercle-lecture.duckdns.org`

### 2. Installation sur le VPS

```bash
# Cloner le dépôt
git clone <url-du-repo> /opt/cercle-lecture
cd /opt/cercle-lecture

# Configurer les variables d'environnement
cp .env.example .env
nano .env  # remplir toutes les variables (voir ci-dessous)

# Démarrer l'application
docker compose up -d --build
```

Caddy obtient automatiquement le certificat HTTPS pour votre sous-domaine DuckDNS.

### 3. Variables d'environnement obligatoires

| Variable | Description |
|---|---|
| `APP_URL` | URL complète en HTTPS, ex. `https://cercle-lecture.duckdns.org` |
| `APP_DOMAIN` | Domaine seul, ex. `cercle-lecture.duckdns.org` |
| `DATABASE_URL` | `file:/data/app.db` (ne pas modifier) |
| `AUTH_SECRET` | Chaîne aléatoire : `openssl rand -base64 32` |
| `REGISTRATION_CODE` | Code d'invitation partagé aux membres du cercle |
| `ADMIN_EMAIL` | Email du premier compte admin |

> Voir `.env.example` pour la liste complète incluant les variables Phase 2 (IA et email).

### 4. Créer le compte administrateur

Au premier démarrage, l'application est vide. Rendez-vous sur `https://<votre-domaine>/register` et créez un compte avec :
- L'email correspondant à `ADMIN_EMAIL` (il aura automatiquement le rôle `admin`)
- Le code d'invitation (`REGISTRATION_CODE`)

### 5. Migrations Prisma

Les migrations sont appliquées automatiquement au démarrage du conteneur (`prisma migrate deploy`). Aucune action manuelle requise.

---

## Développement local

```bash
# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Modifier .env : APP_URL=http://localhost:3000, DATABASE_URL=file:./dev.db, etc.

# Créer la base de données
npx prisma migrate dev

# Démarrer le serveur de développement
npm run dev
```

Accéder à [http://localhost:3000](http://localhost:3000)

---

## Structure du projet

```
src/
├── app/
│   ├── (auth)/           # Pages de connexion et inscription
│   ├── (app)/            # Pages protégées (authentification requise)
│   │   ├── dashboard/    # Fil d'activité global
│   │   ├── my-books/     # Ma bibliothèque
│   │   ├── books/[id]/   # Fiche livre + tous les avis
│   │   ├── members/[id]/ # Bibliothèque d'un membre
│   │   ├── profile/      # Page profil
│   │   └── admin/        # Espace administrateur
│   └── api/              # Routes API
├── components/            # Composants React réutilisables
├── lib/                   # Services (Prisma, Auth, Open Library, IA, Mailer)
└── types/                 # Types TypeScript
prisma/
└── schema.prisma          # Modèle de données
```

---

## Sauvegarde

La base SQLite est dans `./data/app.db` (volume Docker monté). Pour sauvegarder :

```bash
cp /opt/cercle-lecture/data/app.db /opt/backups/app-$(date +%Y%m%d).db
```

Ajoutez ce script à cron pour une sauvegarde automatique quotidienne.

---

## Mise à jour

```bash
cd /opt/cercle-lecture
git pull
docker compose up -d --build
```

Les migrations Prisma sont appliquées automatiquement au redémarrage.
