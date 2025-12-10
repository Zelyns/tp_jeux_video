const express = require('express');
const { ObjectId } = require('mongodb');
const { validateGame } = require('../utils/validation');
const router = express.Router();

const COLLECTION_NAME = "jeux";

router.get('/', async (req, res) => {
    try {
        const { genre, plateforme, search, sort } = req.query;
        let query = {};

        if (genre) {
            query.genre = genre;
        }
        if (plateforme) {
            query.plateforme = plateforme;
        }
        if (search) {
            query.titre = { $regex: search, $options: 'i' };
        }

        let cursor = req.db.collection(COLLECTION_NAME).find(query);

        if (sort) {
            const [field, order] = sort.split(':');
            cursor = cursor.sort({ [field]: order === 'desc' ? -1 : 1 });
        }

        const games = await cursor.toArray();
        res.json(games);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch games" });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const stats = await req.db.collection(COLLECTION_NAME).aggregate([
            {
                $group: {
                    _id: null,
                    totalGames: { $sum: 1 },
                    totalPlayTime: { $sum: "$temps_jeu_heures" },
                    averageMetacritic: { $avg: "$metacritic_score" },
                    completedGames: {
                        $sum: { $cond: [{ $eq: ["$termine", true] }, 1, 0] }
                    }
                }
            }
        ]).toArray();

        const genreStats = await req.db.collection(COLLECTION_NAME).aggregate([
            { $unwind: "$genre" },
            { $group: { _id: "$genre", count: { $sum: 1 } } }
        ]).toArray();

        res.json({
            global: stats[0] || { totalGames: 0, totalPlayTime: 0, averageMetacritic: 0, completedGames: 0 },
            byGenre: genreStats
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

router.get('/export', async (req, res) => {
    try {
        const games = await req.db.collection(COLLECTION_NAME).find().toArray();
        res.header('Content-Type', 'application/json');
        res.attachment('games_export.json');
        res.send(JSON.stringify(games, null, 2));
    } catch (err) {
        res.status(500).json({ error: "Failed to export data" });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }
        const game = await req.db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
        if (!game) {
            return res.status(404).json({ error: "Game not found" });
        }
        res.json(game);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch game" });
    }
});

router.post('/', async (req, res) => {
    try {
        const newGame = req.body;
        const validationErrors = validateGame(newGame);

        if (validationErrors.length > 0) {
            return res.status(400).json({ errors: validationErrors });
        }

        newGame.date_ajout = new Date();
        newGame.date_modification = new Date();

        if (!Array.isArray(newGame.genre)) newGame.genre = [newGame.genre];
        if (!Array.isArray(newGame.plateforme)) newGame.plateforme = [newGame.plateforme];

        const result = await req.db.collection(COLLECTION_NAME).insertOne(newGame);
        newGame._id = result.insertedId;

        res.status(201).json(newGame);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create game" });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }

        const updates = req.body;

        updates.date_modification = new Date();
        delete updates._id;

        const result = await req.db.collection(COLLECTION_NAME).updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Game not found" });
        }

        const updatedGame = await req.db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
        res.json(updatedGame);
    } catch (err) {
        res.status(500).json({ error: "Failed to update game" });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }
        const result = await req.db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Game not found" });
        }
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: "Failed to delete game" });
    }
});

router.post('/:id/favorite', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }

        const game = await req.db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
        if (!game) {
            return res.status(404).json({ error: "Game not found" });
        }

        const newStatus = !game.isFavorite;
        await req.db.collection(COLLECTION_NAME).updateOne(
            { _id: new ObjectId(id) },
            { $set: { isFavorite: newStatus } }
        );

        res.json({ isFavorite: newStatus });
    } catch (err) {
        res.status(500).json({ error: "Failed to toggle favorite" });
    }
});

module.exports = router;
