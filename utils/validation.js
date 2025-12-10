function validateGame(game) {
    const errors = [];

    if (!game.titre || typeof game.titre !== 'string' || game.titre.length < 1) {
        errors.push("Titre is required and must be a non-empty string.");
    }

    if (!game.genre || !Array.isArray(game.genre) || game.genre.length < 1) {
        errors.push("Genre must be an array with at least one item.");
    }

    if (!game.plateforme || !Array.isArray(game.plateforme) || game.plateforme.length < 1) {
        errors.push("Plateforme must be an array with at least one item.");
    }

    if (game.annee_sortie) {
        if (typeof game.annee_sortie !== 'number' || game.annee_sortie < 1970 || game.annee_sortie > new Date().getFullYear()) {
            errors.push(`Annee_sortie must be a number between 1970 and ${new Date().getFullYear()}.`);
        }
    }

    if (game.metacritic_score !== undefined) {
        if (typeof game.metacritic_score !== 'number' || game.metacritic_score < 0 || game.metacritic_score > 100) {
            errors.push("Metacritic_score must be a number between 0 and 100.");
        }
    }

    if (game.temps_jeu_heures !== undefined) {
        if (typeof game.temps_jeu_heures !== 'number' || game.temps_jeu_heures < 0) {
            errors.push("Temps_jeu_heures must be a positive number.");
        }
    }

    return errors;
}

module.exports = { validateGame };
