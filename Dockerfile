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

# Prisma CLI + migrations (+ dotenv requis par prisma.config.ts).
# On copie le package prisma complet (avec ses .wasm) et on l'appelle via
# build/index.js dans l'entrypoint — pas via le shim .bin/prisma (symlink
# déréférencé par COPY, ce qui casserait la résolution des .wasm).
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

COPY --chmod=755 entrypoint.sh ./entrypoint.sh

# On démarre en root : l'entrypoint chown /data puis bascule sur nextjs.
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
