FROM node:22-alpine AS base

# ---- Dépendances ----
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Runner ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# su-exec : permet de dropper les privilèges root -> nextjs depuis l'entrypoint.
RUN apk add --no-cache su-exec && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma CLI pour `migrate deploy` au démarrage (entrypoint).
# prisma.config.ts (obligatoire en Prisma 7 pour l'URL de la datasource) est
# chargé via @prisma/config -> c12/jiti/effect... : un arbre de dépendances
# trop profond pour du cherry-picking. On copie donc tout node_modules depuis
# le builder, par-dessus celui (réduit) du standalone. La CLI est ensuite
# appelée via node_modules/prisma/build/index.js (cf. entrypoint.sh) et non via
# le shim .bin/prisma (symlink déréférencé par COPY, casse la résolution .wasm).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

COPY --chmod=755 entrypoint.sh ./entrypoint.sh

# On démarre en root : l'entrypoint chown /data puis bascule sur nextjs.
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
