const express = require('express');
const router = express.Router();
const { executeQuery } = require('../database');

// GET - Alle Tasks abrufen
router.get('/', async (req, res) => {
    const result = await executeQuery('SELECT * FROM tasks ORDER BY created_at DESC');
    if (result.success) {
        res.json({ success: true, data: result.data });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// GET - Einen Task nach ID abrufen
router.get('/:id', async (req, res) => {
    const result = await executeQuery('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (result.success && result.data.length > 0) {
        res.json({ success: true, data: result.data[0] });
    } else if (result.success) {
        res.status(404).json({ success: false, error: 'Task nicht gefunden' });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// POST - Neuen Task erstellen
router.post('/', async (req, res) => {
    const { title, description, status, assignee } = req.body;
    const result = await executeQuery(
        'INSERT INTO tasks (title, description, status, assignee) VALUES (?, ?, ?, ?)',
        [title, description, status || 'pending', assignee]
    );
    if (result.success) {
        res.status(201).json({ success: true, data: { id: Number(result.data.insertId) } });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// PUT - Task aktualisieren
router.put('/:id', async (req, res) => {
    const { title, description, status, assignee } = req.body;
    const result = await executeQuery(
        'UPDATE tasks SET title = ?, description = ?, status = ?, assignee = ? WHERE id = ?',
        [title, description, status, assignee, req.params.id]
    );
    if (result.success) {
        res.json({ success: true, data: { affectedRows: result.data.affectedRows } });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// DELETE - Task löschen
router.delete('/:id', async (req, res) => {
    const result = await executeQuery('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    if (result.success) {
        res.json({ success: true, data: { affectedRows: result.data.affectedRows } });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

module.exports = router;
