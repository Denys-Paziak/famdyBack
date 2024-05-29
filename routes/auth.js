const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const { v4: uuidv4 } = require('uuid');


const connection = mysql.createConnection({
    host: 'ni514080.mysql.tools',
    user: 'ni514080_famdy',
    password: 'ufX@7i!26K',
    database: 'ni514080_famdy',
});

const secretKey = 'denis';

// Реєстрація нового користувача
router.post("/register", (req, res) => {
    const { username, password } = req.body;

    // Перевіряємо, чи користувач вже зареєстрований
    connection.query('SELECT * FROM users WHERE username = ?', [username], (error, results, fields) => {
        if (error) {
            console.error('Помилка при пошуку користувача: ' + error.message);
            res.status(500).json({ error: 'Помилка сервера при реєстрації користувача' });
            return;
        }

        // Якщо користувач вже зареєстрований, повертаємо помилку
        if (results.length > 0) {
            res.status(400).json({ error: 'Користувач з таким ім\'ям вже зареєстрований' });
            return;
        }

        // Хешуємо пароль перед збереженням у базі даних 
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Помилка при хешуванні пароля: ' + err.message);
                res.status(500).json({ error: 'Помилка сервера при реєстрації користувача' });
                return;
            }

            // Генеруємо унікальне user_id
            const userId = uuidv4();

            // Додаємо нового користувача у базу даних
            connection.query('INSERT INTO users (id, username, password) VALUES (?, ?, ?)', [userId, username, hashedPassword], (error, results, fields) => {
                if (error) {
                    console.error('Помилка при реєстрації користувача: ' + error.message);
                    res.status(500).json({ error: 'Помилка сервера при реєстрації користувача' });
                    return;
                }

                // Після успішної реєстрації генеруємо та підписуємо токен
                const token = jwt.sign({ userId }, secretKey, { expiresIn: '2 days' });
                res.status(200).json({ message: 'Користувач зареєстрований успішно', token });
            });
        });
    });
});

// Вхід користувача
router.post("/login", (req, res) => {

    console.log("login")

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Введіть ім'я користувача та пароль" });
    }

    connection.query('SELECT * FROM users WHERE username = ?', [username], (error, results, fields) => {
        if (error) {
            console.error('Помилка при виборці користувача з бази даних: ' + error.stack);
            return res.status(500).json({ error: "Помилка на сервері" });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: "Користувача з таким ім'ям не знайдено" });
        }

        const user = results[0];
        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                console.error('Помилка при порівнянні паролів: ' + err.stack);
                return res.status(500).json({ error: "Помилка на сервері" });
            }
            if (!result) {
                return res.status(401).json({ error: "Неправильний пароль" });
            }

            // Успішний вхід користувача
            const token = jwt.sign({ userId: user.id, username: user.username }, secretKey, { expiresIn: '1h' });
            res.status(200).json({ message: "Успішний вхід користувача", token });
        });
    });
});


module.exports = router;
