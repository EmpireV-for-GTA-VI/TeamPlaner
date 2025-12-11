const express = require('express');
const router = express.Router();
const { executeQuery } = require('../database');

// GET - Alle Team-Mitglieder abrufen
router.get('/', async (req, res) => {
    const result = await executeQuery('SELECT * FROM team_members ORDER BY name');
    if (result.success) {
        res.json({ success: true, data: result.data });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// GET - Ein Team-Mitglied nach ID abrufen
router.get('/:id', async (req, res) => {
    const result = await executeQuery('SELECT * FROM team_members WHERE id = ?', [req.params.id]);
    if (result.success && result.data.length > 0) {
        res.json({ success: true, data: result.data[0] });
    } else if (result.success) {
        res.status(404).json({ success: false, error: 'Team-Mitglied nicht gefunden' });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// POST - Neues Team-Mitglied erstellen
router.post('/', async (req, res) => {
    const { name, email, role } = req.body;
    const result = await executeQuery(
        'INSERT INTO team_members (name, email, role) VALUES (?, ?, ?)',
        [name, email, role]
    );
    if (result.success) {
        res.status(201).json({ success: true, data: { id: Number(result.data.insertId) } });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// PUT - Team-Mitglied aktualisieren
router.put('/:id', async (req, res) => {
    const { name, email, role } = req.body;
    const result = await executeQuery(
        'UPDATE team_members SET name = ?, email = ?, role = ? WHERE id = ?',
        [name, email, role, req.params.id]
    );
    if (result.success) {
        res.json({ success: true, data: { affectedRows: result.data.affectedRows } });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

// DELETE - Team-Mitglied löschen
router.delete('/:id', async (req, res) => {
    const result = await executeQuery('DELETE FROM team_members WHERE id = ?', [req.params.id]);
    if (result.success) {
        res.json({ success: true, data: { affectedRows: result.data.affectedRows } });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

module.exports = router;
