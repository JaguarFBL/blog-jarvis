# Guide de déploiement — Le Fil (blog auto-généré)

Hébergement choisi : **Render** (serveur Node.js, gratuit) + **Neon** (base PostgreSQL, gratuite et permanente)

## Ce que contient ce projet

- `server.js` : point d'entrée du serveur
- `routes/blog.js` : pages publiques (accueil, article, commentaires)
- `routes/api.js` : route de génération automatique (déclenchée par cron-job.org)
- `scripts/generer-article.js` : appel à l'IA pour écrire l'article du jour
- `db/schema.sql` : structure de la base de données à créer une fois (syntaxe PostgreSQL)
- `views/` : templates HTML (EJS)
- `public/css/style.css` : design du site

## Étape 1 — Créer la base de données sur Neon

1. Va sur **neon.tech**, crée un compte gratuit (GitHub/Google suffit, pas de carte bancaire)
2. Crée un nouveau projet (ex: "blog-lefil")
3. Sur le tableau de bord, trouve le bloc **"Connection string"** — il ressemble à :
   `postgresql://utilisateur:motdepasse@ep-xxxx.neon.tech/nom_de_base?sslmode=require`
4. Copie cette chaîne complète, garde-la de côté (c'est ta `DATABASE_URL`)
5. Toujours sur Neon, ouvre l'**éditeur SQL** (souvent appelé "SQL Editor" dans le menu) → colle le contenu de `db/schema.sql` → Exécuter

## Étape 2 — Mettre le code sur GitHub

```bash
cd blog-jarvis
git init
git add .
git commit -m "Premier déploiement du blog"
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/blog-jarvis.git
git push -u origin main
```

(Remplace TON-PSEUDO par ton vrai pseudo GitHub, et crée le repo vide sur GitHub avant ce push)

## Étape 3 — Déployer sur Render

1. Va sur **render.com**, crée un compte gratuit (connexion via GitHub recommandée, ça simplifie tout)
2. Dans le tableau de bord, clique **"New +"** → **"Web Service"**
3. Choisis ton repo GitHub `blog-jarvis`
4. Configuration :
   - **Name** : lefil (ou ce que tu veux, ça devient une partie de ton URL)
   - **Region** : Frankfurt (le plus proche pour toi)
   - **Branch** : main
   - **Runtime** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `node server.js`
   - **Instance Type** : **Free**
5. Dans "Environment Variables", ajoute :
   - `DATABASE_URL` → la chaîne de connexion copiée depuis Neon à l'étape 1
   - `AI_API_KEY` → ta clé API (à ajouter quand tu l'auras)
   - `UNSPLASH_ACCESS_KEY` → ta clé Unsplash, pour les photos d'illustration (voir section dédiée plus bas)
   - `CRON_SECRET_KEY` → invente une chaîne aléatoire longue (ex: générée sur uuidgenerator.net), garde-la de côté
   - `ADMIN_PASSWORD` → le mot de passe que tu veux utiliser pour publier tes propres articles
   - `SESSION_SECRET` → une autre chaîne aléatoire longue, différente de CRON_SECRET_KEY
6. Clique **"Create Web Service"** — Render installe et démarre tout seul

Ton site sera accessible à une adresse du type : `https://lefil.onrender.com`

## Étape 4 — Configurer la génération automatique quotidienne

1. Va sur **cron-job.org**, crée un compte gratuit
2. Crée un nouveau cron job :
   - URL : `https://lefil.onrender.com/api/generate-article?cle=TA_CLE_SECRETE`
   - Fréquence : tous les jours, à l'heure de ton choix (ex: 7h du matin)
3. Sauvegarde

**Astuce importante** : comme Render gratuit met le service en veille après 15 min d'inactivité, ce même cron-job.org peut aussi servir à "réveiller" le site chaque jour avant que de vrais visiteurs n'arrivent — la requête de génération d'article fait déjà ce travail automatiquement.

## Étape 5 — Configurer la tablette (Fully Kiosk)

Dans Fully Kiosk Browser → Settings → Web Content Settings → Start URL :
```
https://lefil.onrender.com
```

## Test manuel de la génération (sans attendre le cron)

Une fois déployé, déclenche un article test en visitant dans un navigateur :
```
https://lefil.onrender.com/api/generate-article?cle=TA_CLE_SECRETE
```
Tu dois voir une réponse JSON avec `succes: true` et le titre généré.

## À savoir sur le plan gratuit Render

- Le service "dort" après 15 min sans visite : la première visite après une pause prend 30-60 secondes à charger, ensuite c'est rapide
- 750h gratuites par mois (largement suffisant pour un seul site qui tourne H24, ça correspond à un mois complet)
- Pas de carte bancaire requise pour ce plan

## Nouveautés : météo, chiffre du jour, brefs, images multiples

- **Météo** : récupérée automatiquement via Open-Meteo (gratuit, sans clé API) — rien à configurer
- **Chiffre du jour** et **Brefs** (mini-actus) : générés automatiquement par l'IA en même temps que l'article principal, à chaque appel de `/api/generate-article`
- **Images multiples** : l'IA propose 3 mots-clés (un par partie de l'article), et le serveur récupère jusqu'à 3 photos Unsplash différentes, intercalées dans le texte

Si tu avais déjà créé la base de données avant cette mise à jour, va dans l'éditeur SQL de Neon et exécute les lignes `ALTER TABLE` en commentaire en bas de `db/schema.sql`, puis exécute aussi les nouvelles tables `brefs` et `chiffre_du_jour`.

## Activer les photos d'illustration (Unsplash)

Chaque article (généré par IA ou écrit par toi) peut avoir une photo libre de droit en illustration :

1. Va sur **unsplash.com/developers**, crée un compte gratuit
2. Clique "New Application", accepte les conditions, donne un nom à ton appli (ex: "Le Fil")
3. Une fois créée, tu trouveras une **"Access Key"** sur le tableau de bord de l'appli — copie-la
4. Ajoute-la dans Render comme variable d'environnement `UNSPLASH_ACCESS_KEY`

Sans cette clé, le blog fonctionne quand même normalement, juste sans photo. Limite gratuite : 50 recherches par heure, largement suffisant pour 1 article par jour.

## Gérer les liens utiles (menu)

Le menu (bouton ☰ en haut à gauche) affiche une section "Liens utiles" — pratique pour accéder à ton portfolio, ton GitHub, ou tout autre site depuis la tablette en mode kiosque.

Pour gérer ces liens, connecte-toi sur `/admin/connexion`, puis va sur :
```
https://lefil.onrender.com/admin/liens
```

Tu peux y ajouter de nouveaux liens (titre + URL) ou supprimer les existants. Si tu as déjà créé la base avant cette mise à jour, exécute la nouvelle table `liens_utiles` du fichier `db/schema.sql` sur Neon — sinon le menu affichera simplement aucune section "Liens utiles" sans planter.

## Publier tes propres articles

En plus des articles générés automatiquement par l'IA, tu peux écrire et publier les tiens :

```
https://lefil.onrender.com/admin/connexion
```

Connecte-toi avec le mot de passe défini dans `ADMIN_PASSWORD`, puis écris ton article sur la page qui suit. Il apparaîtra immédiatement sur le blog, mélangé avec les articles IA (sans distinction visuelle particulière à part le badge "Rédigé par IA" qui n'apparaît que sur les articles générés automatiquement).

## Quand tu auras ta clé API

Donne-la moi, et je te dirai exactement où la mettre dans les variables d'environnement de Render (aucune modification de code nécessaire).
