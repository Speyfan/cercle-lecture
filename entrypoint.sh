#!/bin/sh
set -e

# Le volume /data (bind-mount) appartient à root côté hôte : on rend la main à
# l'utilisateur applicatif pour que SQLite puisse créer/écrire app.db.
mkdir -p /data
chown -R nextjs:nodejs /data

# Applique les migrations puis démarre le serveur Next, en tant que nextjs.
# On invoque la CLI Prisma via le package (et non le shim .bin/prisma) : COPY
# déréférence le symlink .bin/prisma, ce qui casse la résolution des fichiers
# .wasm (cherchés à côté du script). build/index.js les trouve dans prisma/build/.
exec su-exec nextjs:nodejs sh -c "node node_modules/prisma/build/index.js migrate deploy && node server.js"
