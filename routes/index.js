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

router.get("/", (req, res) => {
    res.send("Hello world");
});

// Маршрут для отримання даних про товар за його ідентифікатором
router.get("/product/:id", (req, res) => {
    const productId = req.params.id;

    // Запит до бази даних для отримання даних про товар за його ідентифікатором
    connection.query('SELECT * FROM products WHERE id = ?', [productId], (error, results, fields) => {
        if (error) {
            console.error('Помилка при отриманні даних товару з бази даних:', error.message);
            res.status(500).send('Помилка сервера при отриманні даних товару');
            return;
        }

        if (results.length === 0) {
            // Якщо товар не знайдено, повертаємо помилку 404
            res.status(404).send('Товар не знайдено');
            return;
        }

        // Відправляємо дані товару клієнту
        res.status(200).json(results[0]);
    });
});

router.get("/products", (req, res) => {
    connection.query('SELECT * FROM products ORDER BY id DESC', (error, results, fields) => {
        if (error) throw error;
        res.send(results);
    });
});


// Додавання лайків до товарів
router.post("/like", authenticateToken, (req, res) => {
    const { productId } = req.body;

    // Extract the user ID from the decoded token
    const userId = req.user.userId;

    // Перевіряємо, чи користувач вже поставив лайк до цього товару
    connection.query('SELECT * FROM user_likes WHERE user_id = ? AND product_id = ?', [userId, productId], (error, results, fields) => {
        if (error) {
            console.error('Помилка при перевірці лайків: ' + error.message);
            res.status(500).send('Помилка сервера при додаванні лайка');
            return;
        }

        if (results.length > 0) {
            // Якщо користувач вже поставив лайк, видаляємо його
            connection.query('DELETE FROM user_likes WHERE user_id = ? AND product_id = ?', [userId, productId], (error, results, fields) => {
                if (error) {
                    console.error('Помилка при видаленні лайка: ' + error.message);
                    res.status(500).send('Помилка сервера при видаленні лайка');
                    return;
                }
                res.status(200).send('Лайк успішно видалено');
            });
        } else {
            // Якщо користувач ще не поставив лайк, додаємо його
            connection.query('INSERT INTO user_likes (user_id, product_id) VALUES (?, ?)', [userId, productId], (error, results, fields) => {
                if (error) {
                    console.error('Помилка при додаванні лайка: ' + error.message);
                    res.status(500).send('Помилка сервера при додаванні лайка');
                    return;
                }
                res.status(201).send('Лайк успішно додано');
            });
        }
    });
});

// Шлях на отримання лайків певного користувача
router.get("/user_likes", authenticateToken, (req, res) => {
    const userId = req.user.userId;

    connection.query('SELECT * FROM user_likes WHERE user_id = ?', [userId], (error, results, fields) => {
        if (error) {
            console.error('Помилка:', error.message);
            return res.status(500).json({ error: "Помилка на сервері" });
        }

        res.status(200).json(results);
    });
});

module.exports = router;