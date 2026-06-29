const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { genererArticleDuJour } = require('../scripts/generer-article');

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
