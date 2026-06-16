FROM node:22-alpine
WORKDIR /app
# sqlite : utilisé pour les sauvegardes cohérentes (.backup)
RUN apk add --no-cache sqlite
COPY package.json ./
RUN npm install --omit=dev
COPY index.js ./
CMD ["node", "index.js"]
