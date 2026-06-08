FROM node:20-slim

# Métadonnées
LABEL maintainer="KHEDIM BENYAKHLEF dit BENY-JOE"
LABEL description="إسلام AI — المساعد الإسلامي العالمي"

# Répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json ./

# Installer les dépendances (ignorer package-lock.json vide)
RUN npm install --legacy-peer-deps

# Copier tout le code source
COPY . .

# Build : frontend Vite + bundle server.ts
RUN npm run build

# HuggingFace Spaces exige le port 7860
ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

# Démarrer le serveur
CMD ["node", "dist/server.cjs"]
