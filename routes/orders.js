const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');
const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'ni514080.mysql.tools',
    user: 'ni514080_famdy',
    password: 'ufX@7i!26K',
    database: 'ni514080_famdy',
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database: ' + err.stack);
        return;
    }
    console.log('Connected to database as ID ' + connection.threadId);
});

// Get all orders
router.get('/orders', authenticateToken, (req, res) => {
    const query = 'SELECT * FROM orders';

    connection.query(query, (error, results) => {
        if (error) {
            console.error('Помилка при отриманні замовлень:', error.message);
            return res.status(500).json({ error: 'Помилка на сервері' });
        }
        res.status(200).json(results);
    });
});

// Update order status
router.put('/orders/:id/status', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const query = 'UPDATE orders SET status = ? WHERE id = ?';
    const values = [status, id];

    connection.query(query, values, (error, results) => {
        if (error) {
            console.error('Помилка при оновленні статусу замовлення:', error.message);
            return res.status(500).json({ error: 'Помилка на сервері' });
        }
        res.status(200).json({ message: 'Статус замовлення успішно оновлено' });
    });
});

// Delete order
router.delete('/orders/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM orders WHERE id = ?';
    const values = [id];

    connection.query(query, values, (error, results) => {
        if (error) {
            console.error('Помилка при видаленні замовлення:', error.message);
            return res.status(500).json({ error: 'Помилка на сервері' });
        }
        res.status(200).json({ message: 'Замовлення успішно видалено' });
    });
});

module.exports = router;
