# S.A.M Agence

Outil interne S.A.M TRANSPORT CHARK. Pas le site vitrine.

## Test local

```bat
start.bat
```

Bureau: http://localhost:5173

1. Clique **Tester un exemple** : les cases se remplissent.
2. Ou **Dicter** (Chrome/Edge) : la phrase passe dans les champs en direct.
3. Contrôle, **Valider et enregistrer**, imprime l'étiquette.

## Déploiement (SQLite temporaire)

```bash
npm install
npm run build
npm start
```

Puis ouvre `http://localhost:8787`. Sur Render, le fichier `render.yaml` lance la même chose. La base fichier viendra après.
