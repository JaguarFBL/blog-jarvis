// Authentification simple par mot de passe pour la zone privée de publication
// Pas de système de comptes complexe : un seul mot de passe, stocké dans les variables d'environnement
// Utilise une session en cookie pour rester connecté après la saisie du mot de passe

const session = require('express-session');

function configurerSession(app) {
    app.use(session({
        secret: process.env.SESSION_SECRET || 'change-moi-en-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
            httpOnly: true
        }
    }));
}

// Middleware qui bloque l'accès si non connecté
function exigerConnexion(req, res, next) {
    if (req.session && req.session.connecte) {
        return next();
    }
    res.redirect('/admin/connexion');
}

module.exports = { configurerSession, exigerConnexion };
