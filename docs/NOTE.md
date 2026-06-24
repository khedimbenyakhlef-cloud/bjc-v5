# BJC-V5 Architecture Note

## Structure du projet

- `backend/server.js` → **Point d'entrée principal** (utilisé par Render en production)
- `render.yaml` → `cd backend && node server.js`
- `frontend/` → HTML statique servi par Express depuis backend
- `src/` → Source React (pour build Vite optionnel)
- `server.ts` → Ancienne version TypeScript (développement local Vite uniquement, **pas utilisé en prod**)

## Déploiement Render
```
Build: cd backend && npm install
Start: cd backend && node server.js
```
