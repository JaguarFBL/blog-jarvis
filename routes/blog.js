const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// Fonction utilitaire : transforme un titre en slug propre pour l'URL
function creerSlug(titre) {
    return titre
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlève les accents
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .substring(0, 100);
}

// Page d'accueil : liste des derniers articles
router.get('/', async (req, res) => {
    try {
        const [articles] = await db.query(
            'SELECT id, titre, slug, resume, categorie, date_publication FROM articles ORDER BY date_publication DESC LIMIT 20'
        );
        res.render('accueil', { articles });
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

        const [commentaires] = await db.query(
            'SELECT * FROM commentaires WHERE article_id = ? AND approuve = TRUE ORDER BY date_creation DESC',
            [article.id]
        );

        res.render('article', { article, commentaires });
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
module.exports.creerSlug = creerSlug;
