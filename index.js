const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Route principale
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ error: 'Fichier index.html non trouvé' });
    }
});

// Route de téléchargement
app.post('/download', async (req, res) => {
    const { platform, url } = req.body;

    if (!url || !platform) {
        return res.status(400).json({ error: 'Veuillez fournir une plateforme et une URL valides' });
    }

    try {
        const downloadUrl = await getMediaUrl(platform, url);
        res.json({ downloadUrl });
    } catch (error) {
        console.error(`Erreur avec ${platform} :`, error.message);
        res.status(500).json({ error: `Impossible de récupérer le média : ${error.message}` });
    }
});

// Fonction pour obtenir le lien de téléchargement
async function getMediaUrl(platform, url) {
    let resolvedUrl = url;

    // Gérer les liens courts TikTok
    if (platform === 'tiktok' && (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com'))) {
        try {
            console.log('Résolution du lien court TikTok:', url);
            const response = await axios.get(url, { maxRedirects: 10 });
            resolvedUrl = response.request.res.responseUrl || response.request.responseURL;
            console.log('URL résolue TikTok:', resolvedUrl);
        } catch (error) {
            throw new Error('Impossible de résoudre le lien court TikTok');
        }
    }

    // Gérer les liens de partage Facebook
    if (platform === 'facebook' && url.includes('/share/r/')) {
        try {
            console.log('Résolution du lien de partage Facebook:', url);
            const response = await axios.get(url, { maxRedirects: 10 });
            resolvedUrl = response.request.res.responseUrl || response.request.responseURL;
            console.log('URL résolue Facebook:', resolvedUrl);
        } catch (error) {
            throw new Error('Impossible de résoudre le lien de partage Facebook');
        }
    }

    // Sélectionner la bonne fonction selon la plateforme
    switch (platform.toLowerCase()) {
        case 'tiktok':
            return await getTikTokMedia(resolvedUrl);
        case 'instagram':
            return await getInstagramMedia(resolvedUrl);
        case 'twitter':
            return await getTwitterMedia(resolvedUrl);
        case 'facebook':
            return await getFacebookMedia(resolvedUrl);
        case 'snapchat':
            return await getSnapchatMedia(resolvedUrl);
        default:
            throw new Error('Plateforme non supportée');
    }
}

// Fonction TikTok (inchangée, fonctionne bien)
async function getTikTokMedia(url) {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
    try {
        const response = await axios.get(apiUrl);
        console.log('Réponse TikTok API:', response.data);
        if (response.data?.data?.play) {
            return response.data.data.play;
        }
        throw new Error('Aucun média TikTok trouvé');
    } catch (error) {
        throw new Error('Erreur TikTok : ' + error.message);
    }
}

// Fonction Instagram (alternative)
async function getInstagramMedia(url) {
    const apiUrl = `https://snapinsta.app/action2.php`;
    try {
        const response = await axios.post(apiUrl, new URLSearchParams({ url }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        console.log('Réponse Instagram API:', response.data);
        const match = response.data.match(/"(https:\/\/[^"]+\.(mp4|jpg|jpeg|png))"/);
        if (match) {
            return match[1];
        }
        throw new Error('Aucun média Instagram trouvé');
    } catch (error) {
        throw new Error('Erreur Instagram : ' + error.message);
    }
}

// Fonction Twitter (alternative)
async function getTwitterMedia(url) {
    const apiUrl = `https://twitsave.com/info?url=${encodeURIComponent(url)}`;
    try {
        const response = await axios.get(apiUrl);
        console.log('Réponse Twitter API:', response.data);
        const match = response.data.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
        if (match) {
            return match[1];
        }
        throw new Error('Aucun média Twitter trouvé');
    } catch (error) {
        throw new Error('Erreur Twitter : ' + error.message);
    }
}

// Fonction Facebook (inspirée de getmyfb.com)
async function getFacebookMedia(url) {
    const apiUrl = `https://getmyfb.com/api/download?url=${encodeURIComponent(url)}`; // Hypothétique, à valider
    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        console.log('Réponse Facebook API:', response.data);
        // Hypothèse : l'API renvoie un JSON avec un champ comme "download_url"
        if (response.data?.download_url) {
            return response.data.download_url;
        }
        // Fallback : si c'est du HTML, chercher un lien MP4
        const match = response.data.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
        if (match) {
            return match[1];
        }
        throw new Error('Aucun média Facebook trouvé');
    } catch (error) {
        throw new Error('Erreur Facebook : ' + error.message);
    }
}

// Fonction Snapchat (inchangée)
async function getSnapchatMedia(url) {
    throw new Error('Snapchat ne permet pas le téléchargement public de vidéos.');
}

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur en ligne sur le port ${PORT}`));