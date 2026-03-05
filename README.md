# CartoPlateforme

Plateforme cartographique avec page d'accueil à fond animé et carte interactive.

## Voir le projet en ligne (GitHub Pages)

Pour afficher le site via un lien public :

1. Sur GitHub, ouvrez le dépôt **https://github.com/AMAUDE/EKOLAN**
2. Allez dans **Settings** (Paramètres) du dépôt
3. Dans le menu de gauche, cliquez sur **Pages** (sous "Code and automation")
4. Dans **Build and deployment** → **Source** : choisissez **Deploy from a branch**
5. **Branch** : `main` — **Folder** : `/ (root)` — puis **Save**
6. Après 1 à 2 minutes, le site sera accessible à l’adresse :  
   **https://amaude.github.io/EKOLAN/**

*(GitHub utilise le nom d’utilisateur en minuscules dans l’URL.)*

Sur cette version en ligne, la page d’accueil et la carte s’affichent ; l’inscription et la connexion (API) ne fonctionnent pas car GitHub Pages ne fait que servir des fichiers statiques.

## Contenu

- **Page d'accueil** (`index.html`) : fond animé (orbes en dégradé, grille, bruit), titre et bouton vers la carte.
- **Page Carte** (`map.html`) : carte mondiale (Leaflet + fond sombre CARTO), recherche de lieu et géolocalisation.

## Lancer le projet

### Avec inscription / connexion (recommandé pour contribuer)

Pour utiliser l’inscription, la connexion et la confirmation par email :

1. Aller dans le dossier `server` et installer les dépendances :
   ```bash
   cd server
   npm install
   ```
2. Copier `server/.env.example` vers `server/.env` et renseigner au minimum :
   - `JWT_SECRET` : une chaîne aléatoire pour signer les sessions
   - Pour envoyer les emails de confirmation : `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (et éventuellement `SMTP_PORT`, `BASE_URL`)
3. Démarrer le serveur :
   ```bash
   npm start
   ```
4. Ouvrir dans le navigateur : `http://localhost:3000` (carte : `http://localhost:3000/map.html`).

Les utilisateurs sont enregistrés dans `server/data/users.json`. Sans configuration SMTP, le lien de confirmation est affiché dans la console du serveur.

### Sans serveur (carte seule)

Ouvrez `index.html` ou `map.html` dans un navigateur. La contribution sera bloquée (connexion requise) sauf si vous utilisez le serveur ci-dessus.

## Fichiers

- `index.html` — Accueil
- `map.html` — Carte
- `styles.css` — Styles et animations
- `script.js` — Script de la page d'accueil
- `map.js` — Logique de la carte (recherche, géolocalisation)
