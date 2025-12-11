const express = require('express');
const router = express.Router();
const { executeQuery } = require('../database');

// GET - Alle Projekte abrufen
router.get('/', async (req, res) => {
    const result = await executeQuery('SELECT * FROM projects ORDER BY created_at DESC');
    if (result.success) {
        res.json({ success: true, data: result.data });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// GET - Ein Projekt nach ID abrufen
router.get('/:id', async (req, res) => {
    const result = await executeQuery('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (result.success && result.data.length > 0) {
        res.json({ success: true, data: result.data[0] });
    } else if (result.success) {
        res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// POST - Neues Projekt erstellen
router.post('/', async (req, res) => {
    const { name, description, start_date, end_date, status } = req.body;
    const result = await executeQuery(
        'INSERT INTO projects (name, description, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)',
        [name, description, start_date, end_date, status || 'active']
    );
    if (result.success) {
        res.status(201).json({ success: true, data: { id: Number(result.data.insertId) } });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// PUT - Projekt aktualisieren
router.put('/:id', async (req, res) => {
    const { name, description, start_date, end_date, status } = req.body;
    const result = await executeQuery(
        'UPDATE projects SET name = ?, description = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?',
        [name, description, start_date, end_date, status, req.params.id]
    );
    if (result.success) {
        res.json({ success: true, data: { affectedRows: result.data.affectedRows } });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// DELETE - Projekt löschen
router.delete('/:id', async (req, res) => {
    const result = await executeQuery('DELETE FROM projects WHERE id = ?', [req.params.id]);
    if (result.success) {
        res.json({ success: true, data: { affectedRows: result.data.affectedRows } });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

module.exports = router;
