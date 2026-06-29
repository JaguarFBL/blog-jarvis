require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Moteur de templates EJS pour générer le HTML dynamiquement
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Fichiers statiques (CSS, images, JS frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Pour lire les données des formulaires (commentaires)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.use('/api', require('./routes/api'));
app.use('/', require('./routes/blog'));

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
