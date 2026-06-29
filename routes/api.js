const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { genererArticleDuJour } = require('../scripts/generer-article');

// Route publique : renvoie tous les articles en JSON
// Utilisée par le portfolio (GitHub Pages) pour afficher les articles avec son propre design
// CORS ouvert car appelée depuis un autre domaine (jaguarfbl.github.io)
router.get('/articles', async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    try {
        const [articles] = await db.query(
            'SELECT id, titre, slug, contenu, resume, categorie, date_publication FROM articles ORDER BY date_publication DESC LIMIT 50'
        );
        res.json({ articles });
    } catch (err) {
        console.error('Erreur API articles:', err);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// Route publique : renvoie un seul article (par son slug) + ses commentaires
router.get('/articles/:slug', async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    try {
        const [articleRows] = await db.query(
            'SELECT * FROM articles WHERE slug = ?',
            [req.params.slug]
        );

        if (articleRows.length === 0) {
            return res.status(404).json({ erreur: 'Article introuvable' });
        }

        const [commentaires] = await db.query(
            'SELECT nom_auteur, contenu, date_creation FROM commentaires WHERE article_id = ? AND approuve = TRUE ORDER BY date_creation DESC',
            [articleRows[0].id]
        );

        res.json({ article: articleRows[0], commentaires });
    } catch (err) {
        console.error('Erreur API article:', err);
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// Route appelée chaque jour par cron-job.org
// Protégée par une clé secrète passée en paramètre : /api/generate-article?cle=TA_CLE_SECRETE
router.get('/generate-article', async (req, res) => {
    const cleFournie = req.query.cle;
    const cleAttendue = process.env.CRON_SECRET_KEY;

    if (!cleAttendue || cleFournie !== cleAttendue) {
        return res.status(403).json({ erreur: 'Clé invalide' });
    }

    try {
        const resultat = await genererArticleDuJour();

        await db.query(
            'INSERT INTO log_generation (succes, message) VALUES (TRUE, ?)',
            [`Article généré : ${resultat.titre}`]
        );

        res.json({ succes: true, article: resultat });
    } catch (err) {
        console.error('Erreur génération article:', err);

        await db.query(
            'INSERT INTO log_generation (succes, message) VALUES (FALSE, ?)',
            [err.message]
        ).catch(() => {}); // on évite de crasher si même le log échoue

        res.status(500).json({ erreur: err.message });
    }
});

module.exports = router;
