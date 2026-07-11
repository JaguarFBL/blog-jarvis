const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { recupererLiensUtiles } = require('../db/liens');
const { genererArticlesDuJour, genererBrefsDuJour, genererChiffreDuJour } = require('../scripts/generer-article');
const { creerSlug } = require('../db/utils');

// Correspondance simplifiée code météo Open-Meteo -> texte lisible
// (référence WMO simplifiée, gratuite, sans clé API)
function texteMeteo(code) {
    if (code === 0) return 'Ciel dégagé';
    if ([1, 2, 3].includes(code)) return 'Partiellement nuageux';
    if ([45, 48].includes(code)) return 'Brouillard';
    if ([51, 53, 55, 56, 57].includes(code)) return 'Bruine';
    if ([61, 63, 65, 66, 67].includes(code)) return 'Pluie';
    if ([71, 73, 75, 77].includes(code)) return 'Neige';
    if ([80, 81, 82].includes(code)) return 'Averses';
    if ([95, 96, 99].includes(code)) return 'Orage';
    return 'Météo indisponible';
}

// Récupère la météo du jour à Paris via Open-Meteo (gratuit, sans clé API)
async function recupererMeteo() {
    try {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,weather_code&timezone=Europe%2FParis';
        const response = await fetch(url);

        if (!response.ok) return null;

        const data = await response.json();
        return {
            temperature: Math.round(data.current.temperature_2m),
            description: texteMeteo(data.current.weather_code)
        };
    } catch (err) {
        console.error('Erreur météo:', err);
        return null;
    }
}

// Page d'accueil : liste des derniers articles + météo + brefs + chiffre du jour
router.get('/', async (req, res) => {
    try {
        let articles = [];
        try {
            const [result] = await db.query(
                'SELECT id, titre, slug, resume, categorie, date_publication, images FROM articles ORDER BY date_publication DESC LIMIT 20'
            );
            articles = result;
        } catch (e) {
            // Si la colonne images n'existe pas encore, on retombe sur une requête sans elle
            const [result] = await db.query(
                'SELECT id, titre, slug, resume, categorie, date_publication FROM articles ORDER BY date_publication DESC LIMIT 20'
            );
            articles = result;
        }

        const articlesAvecVignette = articles.map(a => ({
            ...a,
            imageVignette: a.images && a.images.length > 0 ? a.images[0].url : null
        }));

        let generationEnCours = false;
        const debutAujourdhui = new Date();
        debutAujourdhui.setHours(0, 0, 0, 0);
        const articleAujourdhui = articles.find(a =>
            a.date_publication && new Date(a.date_publication) >= debutAujourdhui
        );
        if (!articleAujourdhui && process.env.AI_API_KEY) {
            generationEnCours = true;
            genererArticlesDuJour()
                .then(() => genererBrefsDuJour().catch(() => {}))
                .then(() => genererChiffreDuJour().catch(() => {}))
                .catch(e => console.error('Auto-génération:', e.message));
        }

        let brefs = [], chiffreRows = [];
        try {
            const [result] = await db.query('SELECT contenu FROM brefs ORDER BY date_publication DESC LIMIT 4');
            brefs = result;
        } catch (e) { /* table pas encore créée */ }

        try {
            const [result] = await db.query('SELECT chiffre, legende FROM chiffre_du_jour ORDER BY date_publication DESC LIMIT 1');
            chiffreRows = result;
        } catch (e) { /* table pas encore créée */ }

        const meteo = await recupererMeteo();
        const chiffreDuJour = chiffreRows.length > 0 ? chiffreRows[0] : null;
        const liensUtiles = await recupererLiensUtiles();

        res.render('accueil', { articles: articlesAvecVignette, brefs, chiffreDuJour, meteo, liensUtiles, generationEnCours });
    } catch (err) {
        console.error('Erreur chargement accueil:', err);
        res.status(500).send('Erreur serveur');
    }
});

// Page d'un article spécifique + ses commentaires
router.get('/article/:slug', async (req, res) => {
    try {
        const [articleRows] = await db.query(
            'SELECT * FROM articles WHERE slug = ?',
            [req.params.slug]
        );

        if (articleRows.length === 0) {
            return res.status(404).send('Article introuvable');
        }

        const article = articleRows[0];

        // Le contenu généré par IA est stocké en JSON ([partie1, partie2, partie3])
        // Les articles écrits manuellement restent en texte brut classique
        let parties;
        try {
            parties = JSON.parse(article.contenu);
            if (!Array.isArray(parties)) parties = [article.contenu];
        } catch {
            parties = [article.contenu];
        }

        let images = [];
        try { images = article.images || []; } catch { images = []; }

        const [commentaires] = await db.query(
            'SELECT * FROM commentaires WHERE article_id = ? AND approuve = TRUE ORDER BY date_creation DESC',
            [article.id]
        );

        const liensUtiles = await recupererLiensUtiles();

        res.render('article', { article, parties, images, commentaires, liensUtiles });
    } catch (err) {
        console.error('Erreur chargement article:', err);
        res.status(500).send('Erreur serveur');
    }
});

// Ajout d'un commentaire
router.post('/article/:slug/commentaire', async (req, res) => {
    try {
        const { nom_auteur, contenu } = req.body;

        if (!nom_auteur || !contenu || contenu.trim().length === 0) {
            return res.status(400).send('Champs manquants');
        }

        const [articleRows] = await db.query(
            'SELECT id FROM articles WHERE slug = ?',
            [req.params.slug]
        );

        if (articleRows.length === 0) {
            return res.status(404).send('Article introuvable');
        }

        await db.query(
            'INSERT INTO commentaires (article_id, nom_auteur, contenu) VALUES (?, ?, ?)',
            [articleRows[0].id, nom_auteur.substring(0, 100), contenu.substring(0, 2000)]
        );

        res.redirect('/article/' + req.params.slug + '#commentaires');
    } catch (err) {
        console.error('Erreur ajout commentaire:', err);
        res.status(500).send('Erreur serveur');
    }
});

module.exports = router;
