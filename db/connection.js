// Connexion à la base de données PostgreSQL (hébergée sur Neon)
// Neon fournit une seule URL de connexion complète (DATABASE_URL), à mettre
// dans les variables d'environnement sur Render

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Neon exige une connexion SSL
});

// Petite couche de compatibilité pour garder la même syntaxe `db.query(sql, params)`
// utilisée partout dans le reste du code (évite de tout réécrire)
module.exports = {
    query: async (sql, params = []) => {
        // PostgreSQL utilise $1, $2... au lieu de ? pour les paramètres
        let index = 0;
        const sqlConverti = sql.replace(/\?/g, () => `$${++index}`);
        const resultat = await pool.query(sqlConverti, params);
        return [resultat.rows];
    }
};
