// Script de génération automatique d'un article résumant l'actualité France/Monde
// Appelé chaque jour via une requête HTTP déclenchée par cron-job.org

const db = require('../db/connection');
const { creerSlug } = require('../routes/blog');

// ============================================
// FONCTION D'APPEL À L'API IA
// Remplace le contenu de cette fonction selon l'API que tu utilises
// (OpenAI, Anthropic Claude, Mistral, etc.)
// ============================================
async function genererTexteAvecIA(prompt) {
    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
        throw new Error('Clé API manquante. Ajoute AI_API_KEY dans les variables d\'environnement.');
    }

    // --- Exemple avec OpenAI (à adapter si tu utilises une autre API) ---
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'user', content: prompt }
            ],
            max_tokens: 1200
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
// GÉNÉRATION DE L'ARTICLE DU JOUR
// ============================================
async function genererArticleDuJour() {
    const dateAujourdhui = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const prompt = `Tu es journaliste. Rédige un article de blog résumant l'actualité importante en France et dans le monde pour aujourd'hui (${dateAujourdhui}).

Consignes :
- Reste factuel et neutre, sans opinion personnelle
- Structure l'article avec une intro, puis les points clés (France, puis International)
- Longueur : environ 400-600 mots
- N'invente pas de faits précis (chiffres, citations) que tu ne connais pas avec certitude
- Termine par un titre court et accrocheur sur la première ligne, puis le contenu

Format de réponse :
TITRE: [le titre]
CONTENU: [le contenu de l'article]`;

    const reponseIA = await genererTexteAvecIA(prompt);

    // Extraction du titre et du contenu depuis la réponse de l'IA
    const titreMatch = reponseIA.match(/TITRE:\s*(.+)/);
    const contenuMatch = reponseIA.match(/CONTENU:\s*([\s\S]+)/);

    const titre = titreMatch ? titreMatch[1].trim() : `Actualités du ${dateAujourdhui}`;
    const contenu = contenuMatch ? contenuMatch[1].trim() : reponseIA;
    const resume = contenu.substring(0, 200).trim() + '...';
    const slug = creerSlug(titre) + '-' + Date.now();

    await db.query(
        'INSERT INTO articles (titre, slug, contenu, resume, categorie, genere_par_ia) VALUES (?, ?, ?, ?, ?, TRUE)',
        [titre, slug, contenu, resume, 'France & Monde']
    );

    return { titre, slug };
}

module.exports = { genererArticleDuJour };
