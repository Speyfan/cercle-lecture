#!/bin/sh
set -e

# Le volume /data (bind-mount) appartient à root côté hôte : on rend la main à
# l'utilisateur applicatif pour que SQLite puisse créer/écrire app.db.
mkdir -p /data
chown -R nextjs:nodejs /data

# Applique les migrations puis démarre le serveur Next, en tant que nextjs.
exec su-exec nextjs:nodejs sh -c "node_modules/.bin/prisma migrate deploy && node server.js"
