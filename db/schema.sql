-- Schéma de la base de données du blog (syntaxe PostgreSQL, pour Neon)
-- À exécuter une seule fois via la console SQL de Neon

CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    contenu TEXT NOT NULL,
    resume VARCHAR(500),
    categorie VARCHAR(50) DEFAULT 'France',
    genere_par_ia BOOLEAN DEFAULT TRUE,
    date_publication TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_date ON articles (date_publication);
CREATE INDEX IF NOT EXISTS idx_slug ON articles (slug);

CREATE TABLE IF NOT EXISTS commentaires (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    nom_auteur VARCHAR(100) NOT NULL,
    contenu TEXT NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approuve BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_article ON commentaires (article_id);

-- Table pour suivre les générations automatiques
CREATE TABLE IF NOT EXISTS log_generation (
    id SERIAL PRIMARY KEY,
    date_execution TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    succes BOOLEAN,
    message TEXT
);
