const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({
            status: 'ok',
            database: 'connected'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: 'error',
            database: 'disconnected'
        });
    }
});

app.get('/todos', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM todos ORDER BY id DESC'
        );

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Failed to fetch todos'
        });
    }
});

app.post('/todos', async (req, res) => {
    try {
        const { title } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                error: 'Title is required'
            });
        }

        const [result] = await db.query(
            'INSERT INTO todos (title) VALUES (?)',
            [title.trim()]
        );

        const [rows] = await db.query(
            'SELECT * FROM todos WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Failed to create todo'
        });
    }
});

app.put('/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, completed } = req.body;

        await db.query(
            'UPDATE todos SET title = ?, completed = ? WHERE id = ?',
            [title, completed, id]
        );

        const [rows] = await db.query(
            'SELECT * FROM todos WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Todo not found'
            });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Failed to update todo'
        });
    }
});

app.delete('/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            'DELETE FROM todos WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Todo not found'
            });
        }

        res.json({
            message: 'Todo deleted successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Failed to delete todo'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});