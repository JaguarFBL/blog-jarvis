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
    images JSONB,
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

-- Table pour les mini-actus "brefs" (en plus de l'article principal du jour)
CREATE TABLE IF NOT EXISTS brefs (
    id SERIAL PRIMARY KEY,
    contenu VARCHAR(300) NOT NULL,
    date_publication TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brefs_date ON brefs (date_publication);

-- Table pour le chiffre du jour
CREATE TABLE IF NOT EXISTS chiffre_du_jour (
    id SERIAL PRIMARY KEY,
    chiffre VARCHAR(50) NOT NULL,
    legende VARCHAR(300) NOT NULL,
    date_publication TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chiffre_date ON chiffre_du_jour (date_publication);

-- Si tu as déjà créé la table articles avant cette mise à jour, exécute ceci
-- pour migrer sans perdre tes articles existants :
-- ALTER TABLE articles DROP COLUMN IF EXISTS image_url;
-- ALTER TABLE articles DROP COLUMN IF EXISTS image_photographe;
-- ALTER TABLE articles DROP COLUMN IF EXISTS image_photographe_url;
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS images JSONB;

-- Table pour les liens utiles affichés dans le menu (gérable depuis l'admin)
CREATE TABLE IF NOT EXISTS liens_utiles (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    ordre INTEGER DEFAULT 0,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Liens de départ (à exécuter une seule fois, ou ignorer si tu préfères les ajouter depuis l'admin)
INSERT INTO liens_utiles (titre, url, ordre) VALUES
    ('Portfolio', 'https://jaguarfbl.github.io/folio/', 1),
    ('GitHub', 'https://github.com/JaguarFBL', 2)
ON CONFLICT DO NOTHING;
