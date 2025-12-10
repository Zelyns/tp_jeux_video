const API_URL = 'http://localhost:3000/api/games';

const gameGrid = document.getElementById('gameGrid');
const modal = document.getElementById('gameModal');
const gameForm = document.getElementById('gameForm');
const addGameBtn = document.getElementById('addGameBtn');
const closeModalBtn = document.querySelector('.close-modal');
const searchInput = document.getElementById('searchInput');
const genreFilter = document.getElementById('genreFilter');
const platformFilter = document.getElementById('platformFilter');
const sortOrder = document.getElementById('sortOrder');
const exportBtn = document.getElementById('exportBtn');

let isEditing = false;
let currentFilters = {};

const statTotalGames = document.getElementById('statTotalGames');
const statTotalHours = document.getElementById('statTotalHours');
const statAvgScore = document.getElementById('statAvgScore');
const statCompleted = document.getElementById('statCompleted');

document.addEventListener('DOMContentLoaded', () => {
    fetchGames();
    fetchStats();
});

addGameBtn.addEventListener('click', () => openModal());
closeModalBtn.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

gameForm.addEventListener('submit', handleFormSubmit);
searchInput.addEventListener('input', debounce(() => updateFilters({ search: searchInput.value }), 300));
genreFilter.addEventListener('change', (e) => updateFilters({ genre: e.target.value }));
platformFilter.addEventListener('change', (e) => updateFilters({ plateforme: e.target.value }));
sortOrder.addEventListener('change', (e) => updateFilters({ sort: e.target.value }));
exportBtn.addEventListener('click', handleExport);

function updateFilters(newFilters) {
    currentFilters = { ...currentFilters, ...newFilters };
    fetchGames();
}

async function fetchGames() {
    try {
        const queryParams = new URLSearchParams(currentFilters).toString();
        const res = await fetch(`${API_URL}?${queryParams}`);
        const games = await res.json();
        renderGames(games);
    } catch (err) {
        console.error('Error fetching games:', err);
    }
}

async function fetchStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        const data = await res.json();
        const global = data.global;

        statTotalGames.textContent = global.totalGames;
        statTotalHours.textContent = `${global.totalPlayTime}h`;
        statAvgScore.textContent = Math.round(global.averageMetacritic);
        statCompleted.textContent = global.completedGames;

        populateGenreFilter(data.byGenre);
    } catch (err) {
        console.error('Error fetching stats:', err);
    }
}

function populateGenreFilter(genres) {
    const currentVal = genreFilter.value;
    genreFilter.innerHTML = '<option value="">Tous les Genres</option>';
    genres.forEach(g => {
        const option = document.createElement('option');
        option.value = g._id;
        option.textContent = `${g._id} (${g.count})`;
        genreFilter.appendChild(option);
    });
    genreFilter.value = currentVal;
}

function renderGames(games) {
    gameGrid.innerHTML = '';

    if (games.length === 0) {
        gameGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Aucun jeu trouvé.</div>';
        return;
    }

    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        const genres = Array.isArray(game.genre) ? game.genre : [game.genre];
        const platforms = Array.isArray(game.plateforme) ? game.plateforme : [game.plateforme];

        const scoreClass = game.metacritic_score >= 80 ? 'score-high' : game.metacritic_score >= 50 ? 'score-med' : 'score-low';

        card.innerHTML = `
            <div class="game-header">
                <div class="game-badges">
                    ${genres.map(g => `<span class="badge badge-genre">${g}</span>`).join('')}
                    ${platforms.map(p => `<span class="badge badge-platform">${p}</span>`).join('')}
                </div>
                <div class="game-title">${game.titre}</div>
            </div>
            <div class="game-meta">
                <div class="meta-row">
                    <span>Année</span>
                    <span class="meta-value">${game.annee_sortie || 'N/A'}</span>
                </div>
                <div class="meta-row">
                    <span>Metacritic</span>
                    <span class="meta-value ${scoreClass}">${game.metacritic_score || 'N/A'}</span>
                </div>
                <div class="meta-row">
                    <span>Temps Jeu</span>
                    <span class="meta-value">${game.temps_jeu_heures}h</span>
                </div>
                <div class="meta-row">
                    <span>Terminé</span>
                    <span class="meta-value" style="color: ${game.termine ? 'var(--success)' : 'var(--text-secondary)'}">
                        ${game.termine ? '<i class="fa-solid fa-check"></i> Oui' : '<i class="fa-solid fa-clock"></i> Non'}
                    </span>
                </div>
            </div>
            <div class="game-actions">
                <button class="action-btn btn-fav ${game.isFavorite ? 'active' : ''}" onclick="toggleFavorite('${game._id}')" title="Favori">
                    <i class="fa-solid fa-heart"></i>
                </button>
                <button class="action-btn" onclick='prepareEdit(${JSON.stringify(game).replace(/'/g, "&#39;")})' title="Modifier">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="action-btn btn-delete" onclick="deleteGame('${game._id}')" title="Supprimer">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        gameGrid.appendChild(card);
    });
}

function openModal(game = null) {
    modal.classList.add('active');
    isEditing = !!game;
    document.getElementById('modalTitle').textContent = isEditing ? 'Modifier le Jeu' : 'Ajouter un Jeu';

    if (game) {
        document.getElementById('gameId').value = game._id;
        document.getElementById('titre').value = game.titre;
        document.getElementById('genre').value = Array.isArray(game.genre) ? game.genre.join(', ') : game.genre;
        document.getElementById('plateforme').value = Array.isArray(game.plateforme) ? game.plateforme.join(', ') : game.plateforme;
        document.getElementById('editeur').value = game.editeur || '';
        document.getElementById('developpeur').value = game.developpeur || '';
        document.getElementById('annee_sortie').value = game.annee_sortie || '';
        document.getElementById('metacritic_score').value = game.metacritic_score || '';
        document.getElementById('temps_jeu_heures').value = game.temps_jeu_heures || 0;
        document.getElementById('termine').checked = game.termine || false;
    } else {
        gameForm.reset();
        document.getElementById('gameId').value = '';
    }
}

function closeModal() {
    modal.classList.remove('active');
}

window.prepareEdit = function (game) {
    openModal(game);
}

window.deleteGame = async function (id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce jeu ?')) return;

    try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        fetchGames();
        fetchStats();
    } catch (err) {
        console.error('Error deleting game:', err);
    }
}

window.toggleFavorite = async function (id) {
    try {
        await fetch(`${API_URL}/${id}/favorite`, { method: 'POST' });
        fetchGames();
    } catch (err) {
        console.error('Error toggling favorite:', err);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        titre: document.getElementById('titre').value,
        genre: document.getElementById('genre').value.split(',').map(s => s.trim()).filter(Boolean),
        plateforme: document.getElementById('plateforme').value.split(',').map(s => s.trim()).filter(Boolean),
        editeur: document.getElementById('editeur').value,
        developpeur: document.getElementById('developpeur').value,
        annee_sortie: parseInt(document.getElementById('annee_sortie').value) || undefined,
        metacritic_score: parseInt(document.getElementById('metacritic_score').value) || undefined,
        temps_jeu_heures: parseFloat(document.getElementById('temps_jeu_heures').value) || 0,
        termine: document.getElementById('termine').checked
    };

    const id = document.getElementById('gameId').value;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/${id}` : API_URL;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (res.ok) {
            closeModal();
            fetchGames();
            fetchStats();
        } else {
            const err = await res.json();
            alert('Erreur: ' + (err.errors ? err.errors.join('\n') : err.error));
        }
    } catch (err) {
        console.error('Error saving game:', err);
    }
}

async function handleExport() {
    try {
        window.location.href = `${API_URL}/export`;
    } catch (err) {
        console.error('Error exporting:', err);
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
