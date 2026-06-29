// Menu tiroir : s'ouvre via le bouton hamburger (méthode fiable, fonctionne
// même dans les navigateurs kiosque comme Fully Kiosk qui peuvent intercepter
// les gestes de swipe). Le swipe reste actif en complément, pour les navigateurs
// classiques.

document.addEventListener('DOMContentLoaded', () => {
    const tiroir = document.getElementById('tiroir-menu');
    const fond = document.getElementById('tiroir-fond');

    if (!tiroir || !fond) return;

    function ouvrirTiroir() {
        tiroir.classList.add('ouvert');
        fond.classList.add('ouvert');
    }

    function fermerTiroir() {
        tiroir.classList.remove('ouvert');
        fond.classList.remove('ouvert');
    }

    // Détection du swipe : départ proche du bord gauche, déplacement horizontal net
    let xDepart = null;
    let yDepart = null;

    document.addEventListener('touchstart', (e) => {
        const toucher = e.touches[0];
        if (toucher.clientX < 40) {
            xDepart = toucher.clientX;
            yDepart = toucher.clientY;
        } else {
            xDepart = null;
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (xDepart === null) return;
        const toucher = e.touches[0];
        const deltaX = toucher.clientX - xDepart;
        const deltaY = Math.abs(toucher.clientY - yDepart);

        // Swipe net vers la droite, peu de mouvement vertical (pas un scroll)
        if (deltaX > 60 && deltaY < 50) {
            ouvrirTiroir();
            xDepart = null;
        }
    }, { passive: true });

    // Swipe vers la gauche sur le tiroir lui-même pour le refermer
    let xDepartFermeture = null;

    tiroir.addEventListener('touchstart', (e) => {
        xDepartFermeture = e.touches[0].clientX;
    }, { passive: true });

    tiroir.addEventListener('touchmove', (e) => {
        if (xDepartFermeture === null) return;
        const deltaX = e.touches[0].clientX - xDepartFermeture;
        if (deltaX < -50) {
            fermerTiroir();
            xDepartFermeture = null;
        }
    }, { passive: true });

    fond.addEventListener('click', fermerTiroir);

    const boutonOuvrir = document.getElementById('bouton-menu');
    if (boutonOuvrir) {
        boutonOuvrir.addEventListener('click', ouvrirTiroir);
    }
});
