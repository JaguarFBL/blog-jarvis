const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { exigerConnexion } = require('../middleware/auth');
const { creerSlug } = require('./blog');
const { chercherImage } = require('../scripts/generer-article');

// Page de connexion
router.get('/connexion', (req, res) => {
    if (req.session && req.session.connecte) {
        return res.redirect('/admin/nouvel-article');
    }
    res.render('admin-connexion', { erreur: null });
});

// Traitement du mot de passe
router.post('/connexion', (req, res) => {
    const motDePasseFourni = req.body.mot_de_passe;
    const motDePasseAttendu = process.env.ADMIN_PASSWORD;

    if (!motDePasseAttendu) {
        return res.render('admin-connexion', {
            erreur: 'ADMIN_PASSWORD non configuré sur le serveur. Ajoute cette variable d\'environnement.'
        });
    }

    if (motDePasseFourni === motDePasseAttendu) {
        req.session.connecte = true;
        return res.redirect('/admin/nouvel-article');
    }

    res.render('admin-connexion', { erreur: 'Mot de passe incorrect.' });
});

// Déconnexion
router.get('/deconnexion', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/connexion');
    });
});

// Page du formulaire de publication (protégée)
router.get('/nouvel-article', exigerConnexion, (req, res) => {
    res.render('admin-nouvel-article', { erreur: null, succes: null });
});

// Traitement de la publication
router.post('/nouvel-article', exigerConnexion, async (req, res) => {
    try {
        const { titre, contenu, categorie, mot_cle_image } = req.body;

        if (!titre || !contenu || titre.trim().length === 0 || contenu.trim().length === 0) {
            return res.render('admin-nouvel-article', {
                erreur: 'Le titre et le contenu sont obligatoires.',
                succes: null
            });
        }

        const resume = contenu.trim().substring(0, 200) + (contenu.length > 200 ? '...' : '');
        const slug = creerSlug(titre) + '-' + Date.now();

        const image = mot_cle_image && mot_cle_image.trim()
            ? await chercherImage(mot_cle_image.trim())
            : null;

        const images = image ? JSON.stringify([image]) : '[]';

        await db.query(
            `INSERT INTO articles
                (titre, slug, contenu, resume, categorie, genere_par_ia, images)
             VALUES (?, ?, ?, ?, ?, FALSE, ?)`,
            [
                titre.trim(), slug, contenu.trim(), resume, categorie || 'France & Monde',
                images
            ]
        );

        res.render('admin-nouvel-article', {
            erreur: null,
            succes: { titre, slug }
        });
    } catch (err) {
        console.error('Erreur publication manuelle:', err);
        res.render('admin-nouvel-article', {
            erreur: 'Erreur lors de la publication. Réessaie.',
            succes: null
        });
    }
});

module.exports = router;
