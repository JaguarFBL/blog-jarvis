// Script de génération automatique du contenu quotidien : article principal,
// brefs (mini-actus), et chiffre du jour. Appelé chaque jour via cron-job.org

const db = require('../db/connection');
const { creerSlug } = require('../routes/blog');

// Nettoie le Markdown que l'IA pourrait avoir ajouté malgré la consigne
function nettoyerMarkdown(texte) {
    return texte
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/^[-*]\s+/gm, '— ')
        .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
        .trim();
}

// ============================================
// FONCTION D'APPEL À L'API IA — Mistral AI
// ============================================
async function genererTexteAvecIA(prompt) {
    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
        throw new Error('Clé API manquante. Ajoute AI_API_KEY dans les variables d\'environnement.');
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'mistral-small-latest',
            messages: [
                { role: 'user', content: prompt }
            ],
            max_tokens: 1800
        })
    });

    if (!response.ok) {
        const erreurTexte = await response.text();
        throw new Error(`Erreur API IA (${response.status}): ${erreurTexte}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// ============================================
// RECHERCHE D'UNE PHOTO LIBRE DE DROITS SUR UNSPLASH
// Renvoie null si pas de clé configurée ou si la recherche échoue
// ============================================
async function chercherImage(motCle) {
    const cleUnsplash = process.env.UNSPLASH_ACCESS_KEY;

    if (!cleUnsplash) {
        return null;
    }

    try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(motCle)}&per_page=1&orientation=landscape`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Client-ID ${cleUnsplash}` }
        });

        if (!response.ok) {
            console.error('Erreur recherche Unsplash:', response.status);
            return null;
        }

        const data = await response.json();
        const photo = data.results && data.results[0];

        if (!photo) {
            return null;
        }

        return {
            url: photo.urls.regular,
            photographe: photo.user.name,
            photographeUrl: photo.user.links.html + '?utm_source=lefil&utm_medium=referral'
        };
    } catch (err) {
        console.error('Erreur recherche image:', err);
        return null;
    }
}

// Recherche plusieurs images en parallèle à partir d'une liste de mots-clés
// Filtre les résultats null (échecs individuels n'empêchent pas les autres)
async function chercherPlusieursImages(motsCles) {
    const resultats = await Promise.all(motsCles.map(mc => chercherImage(mc)));
    return resultats.filter(r => r !== null);
}

// ============================================
// GÉNÉRATION DE L'ARTICLE PRINCIPAL DU JOUR
// ============================================
async function genererArticleDuJour() {
    const dateAujourdhui = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const prompt = `Tu es journaliste. Rédige un article de blog résumant l'actualité importante en France et dans le monde pour aujourd'hui (${dateAujourdhui}).

Consignes :
- Reste factuel et neutre, sans opinion personnelle
- Structure l'article en 3 PARTIES bien distinctes séparées par un saut de ligne double : une introduction, un développement sur la France, un développement sur l'international
- Longueur totale : environ 450-650 mots, réparti à peu près également entre les 3 parties
- N'invente pas de faits précis (chiffres, citations) que tu ne connais pas avec certitude
- IMPORTANT : écris en texte brut uniquement, SANS Markdown — pas d'astérisques, pas de #, pas de tirets de liste, pas de mise en forme

Format de réponse EXACT (respecte bien ces lignes, chaque IMAGE sur sa propre ligne) :
TITRE: [le titre, court et accrocheur]
IMAGE1: [1 à 2 mots-clés en anglais pour illustrer l'introduction/le sujet général, ex: "paris skyline"]
IMAGE2: [1 à 2 mots-clés en anglais pour illustrer la partie France, ex: "french parliament"]
IMAGE3: [1 à 2 mots-clés en anglais pour illustrer la partie internationale, ex: "united nations"]
PARTIE1: [l'introduction]
PARTIE2: [le développement France]
PARTIE3: [le développement international]`;

    const reponseIA = await genererTexteAvecIA(prompt);

    const titreMatch = reponseIA.match(/TITRE:\s*(.+)/);
    const image1Match = reponseIA.match(/IMAGE1:\s*(.+)/);
    const image2Match = reponseIA.match(/IMAGE2:\s*(.+)/);
    const image3Match = reponseIA.match(/IMAGE3:\s*(.+)/);
    const partie1Match = reponseIA.match(/PARTIE1:\s*([\s\S]*?)(?=PARTIE2:|$)/);
    const partie2Match = reponseIA.match(/PARTIE2:\s*([\s\S]*?)(?=PARTIE3:|$)/);
    const partie3Match = reponseIA.match(/PARTIE3:\s*([\s\S]+)/);

    const titre = nettoyerMarkdown(titreMatch ? titreMatch[1].trim() : `Actualités du ${dateAujourdhui}`);
    const partie1 = nettoyerMarkdown(partie1Match ? partie1Match[1].trim() : '');
    const partie2 = nettoyerMarkdown(partie2Match ? partie2Match[1].trim() : '');
    const partie3 = nettoyerMarkdown(partie3Match ? partie3Match[1].trim() : reponseIA);

    const motsClesImages = [
        image1Match ? image1Match[1].trim() : 'news',
        image2Match ? image2Match[1].trim() : 'france',
        image3Match ? image3Match[1].trim() : 'world'
    ];

    // Stocke les 3 parties séparément pour pouvoir intercaler les images entre elles à l'affichage
    const contenu = JSON.stringify([partie1, partie2, partie3]);
    const resume = partie1.substring(0, 200).trim() + '...';
    const slug = creerSlug(titre) + '-' + Date.now();

    const images = await chercherPlusieursImages(motsClesImages);

    await db.query(
        `INSERT INTO articles
            (titre, slug, contenu, resume, categorie, genere_par_ia, images)
         VALUES (?, ?, ?, ?, ?, TRUE, ?)`,
        [titre, slug, contenu, resume, 'France & Monde', JSON.stringify(images)]
    );

    return { titre, slug };
}

// ============================================
// GÉNÉRATION DES BREFS (mini-actus du jour)
// ============================================
async function genererBrefsDuJour() {
    const prompt = `Rédige 4 mini-actualités très courtes (1 phrase chacune, maximum 25 mots) résumant des informations factuelles et variées du jour (France et international). Pas de Markdown, pas de numérotation visible.

Format de réponse EXACT, une mini-actu par ligne :
BREF: [première mini-actu]
BREF: [deuxième mini-actu]
BREF: [troisième mini-actu]
BREF: [quatrième mini-actu]`;

    const reponseIA = await genererTexteAvecIA(prompt);
    const lignes = reponseIA.match(/BREF:\s*(.+)/g) || [];
    const brefs = lignes.map(l => nettoyerMarkdown(l.replace(/BREF:\s*/, '').trim()));

    for (const bref of brefs) {
        await db.query('INSERT INTO brefs (contenu) VALUES (?)', [bref]);
    }

    return brefs;
}

// ============================================
// GÉNÉRATION DU CHIFFRE DU JOUR
// ============================================
async function genererChiffreDuJour() {
    const prompt = `Donne un chiffre marquant et factuel lié à l'actualité récente ou à une statistique notable (France ou monde). Le chiffre doit être court (ex: "2,3M", "47%", "12 milliards €"). La légende explique le chiffre en une phorte courte phrase (max 20 mots). Pas de Markdown.

Format de réponse EXACT :
CHIFFRE: [le chiffre, très court]
LEGENDE: [la phrase d'explication]`;

    const reponseIA = await genererTexteAvecIA(prompt);
    const chiffreMatch = reponseIA.match(/CHIFFRE:\s*(.+)/);
    const legendeMatch = reponseIA.match(/LEGENDE:\s*(.+)/);

    const chiffre = nettoyerMarkdown(chiffreMatch ? chiffreMatch[1].trim() : '—');
    const legende = nettoyerMarkdown(legendeMatch ? legendeMatch[1].trim() : '');

    await db.query('INSERT INTO chiffre_du_jour (chiffre, legende) VALUES (?, ?)', [chiffre, legende]);

    return { chiffre, legende };
}

module.exports = {
    genererArticleDuJour,
    genererBrefsDuJour,
    genererChiffreDuJour,
    chercherImage
};
