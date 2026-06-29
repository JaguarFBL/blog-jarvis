// Récupère les liens utiles à afficher dans le menu tiroir
// Utilisé sur toutes les pages publiques pour garder le menu cohérent

const db = require('./connection');

async function recupererLiensUtiles() {
    try {
        const [liens] = await db.query(
            'SELECT id, titre, url FROM liens_utiles ORDER BY ordre ASC, date_creation ASC'
        );
        return liens;
    } catch (err) {
        // Si la table n'existe pas encore, on ne casse pas la page : juste pas de liens affichés
        console.error('Erreur récupération liens utiles:', err.message);
        return [];
    }
}

module.exports = { recupererLiensUtiles };
