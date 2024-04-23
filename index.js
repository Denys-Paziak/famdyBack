const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');



const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());


const uuidv4 = require('uuid');
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

// Middleware для обробки даних JSON

// Middleware для обробки даних URL-кодування форми


const secretKey = 'denis';

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


// Middleware для перевірки токенів
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('Не вказаний токен');

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Невірний токен' });
        req.user = decoded;
        next();
    });
}

// Реєстрація нового користувача
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    // Перевіряємо, чи користувач вже зареєстрований
    connection.query('SELECT * FROM users WHERE username = ?', [username], (error, results, fields) => {
        if (error) {
            console.error('Помилка при пошуку користувача: ' + error.message);
            res.status(500).send('Помилка сервера при реєстрації користувача');
            return;
        }

        // Якщо користувач вже зареєстрований, повертаємо помилку
        if (results.length > 0) {
            res.status(400).send('Користувач з таким ім\'ям вже зареєстрований');
            return;
        }

        // Хешуємо пароль перед збереженням у базі даних
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Помилка при хешуванні пароля: ' + err.message);
                res.status(500).send('Помилка сервера при реєстрації користувача');
                return;
            }

            // Генеруємо унікальне user_id
            const userId = uuidv4.v4();

            // Додаємо нового користувача у базу даних
            connection.query('INSERT INTO users (id, username, password) VALUES (?, ?, ?)', [userId, username, hashedPassword], (error, results, fields) => {
                if (error) {
                    console.error('Помилка при реєстрації користувача: ' + error.message);
                    res.status(500).send('Помилка сервера при реєстрації користувача');
                    return;
                }

                // Після успішної реєстрації генеруємо та підписуємо токен
                const token = jwt.sign({ userId }, secretKey, { expiresIn: '160h' });
                res.status(201).json({ message: 'Користувач зареєстрований успішно', token });
            });
        });
    });
});


// Маршрут для отримання даних про товар за його ідентифікатором
app.get("/", (req, res) => {
    res.send("home");
});

// Маршрут для отримання даних про товар за його ідентифікатором
app.get("/product/:id", (req, res) => {
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


// Вхід користувача
app.post("/login", (req, res) => {
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
            const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn: '1h' });
            res.json({ message: "Успішний вхід користувача", token });
        });
    });
});

app.get("/products", (req, res) => {
    connection.query('SELECT * FROM products', (error, results, fields) => {
        if (error) throw error;
        res.send(results);
    });
});


// Додавання лайків до товарів
app.post("/like", authenticateToken, (req, res) => {
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
app.get("/user_likes", authenticateToken, (req, res) => {
    const userId = req.user.userId;

    connection.query('SELECT * FROM user_likes WHERE user_id = ?', [userId], (error, results, fields) => {
        if (error) {
            console.error('Помилка:', error.message);
            return res.status(500).json({ error: "Помилка на сервері" });
        }

        res.status(200).json(results);
    });
});
app.post("/cart", authenticateToken, (req, res) => {
    const { productId, quantity, size, price, sale, image } = req.body;

    // Extract the user ID from the decoded token
    const userId = req.user.userId;

    // Check if the product already exists in the user's cart
    connection.query('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId], (error, results, fields) => {
        if (error) {
            console.error('Помилка при перевірці товару у кошику:', error.message);
            res.status(500).send('Помилка сервера при додаванні товару до кошика');
            return;
        }

        if (results.length > 0) {
            // If the product already exists in the cart, update its quantity, size, price, sale, and image
            connection.query('UPDATE cart SET quantity = ?, size = ?, price = ?, sale = ?, image = ? WHERE user_id = ? AND product_id = ?', [quantity, size, price, sale, image, userId, productId], (error, results, fields) => {
                if (error) {
                    console.error('Помилка при оновленні кількості, розміру, ціни, знижки та зображення товару у кошику:', error.message);
                    res.status(500).send('Помилка сервера при оновленні товару у кошику');
                    return;
                }
                res.status(200).send('Товар успішно оновлено у кошику');
            });
        } else {
            // If the product does not exist in the cart, add it
            connection.query('INSERT INTO cart (user_id, product_id, quantity, size, price, sale, image) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, productId, quantity, size, price, sale, image], (error, results, fields) => {
                if (error) {
                    console.error('Помилка при додаванні товару до кошика:', error.message);
                    res.status(500).send('Помилка сервера при додаванні товару до кошика');
                    return;
                }
                res.status(201).send('Товар успішно додано до кошика');
            });
        }
    });
});

// Видалення товару з кошика
app.delete("/cart", authenticateToken, (req, res) => {
    const { productId } = req.body;

    // Витягнення ідентифікатора користувача з розкодованого токена
    const userId = req.user.userId;

    // Перевірка, чи існує товар у кошику користувача
    connection.query('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId], (error, results, fields) => {
        if (error) {
            console.error('Помилка при перевірці наявності товару в кошику:', error.message);
            res.status(500).send('Помилка сервера при видаленні товару з кошика');
            return;
        }

        if (results.length === 0) {
            // Якщо товару немає у кошику, повертаємо помилку
            res.status(404).send('Товар не знайдено в кошику користувача');
            return;
        }

        // Видалення товару з кошика
        connection.query('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId], (error, results, fields) => {
            if (error) {
                console.error('Помилка при видаленні товару з кошика:', error.message);
                res.status(500).send('Помилка сервера при видаленні товару з кошика');
                return;
            }
            res.status(200).send('Товар успішно видалено з кошика');
        });
    });
});


// Шлях на отримання лайків певного користувача
app.get("/user_cart", authenticateToken, (req, res) => {
    const userId = req.user.userId;

    connection.query('SELECT * FROM cart WHERE user_id = ?', [userId], (error, results, fields) => {
        if (error) {
            console.error('Помилка', error.message);
            return res.status(500).json({ error: "Помилка на сервері" });
        }

        res.status(200).json(results);
    });
});


// Ручка для надсилання листа на пошту
app.post('/send-email', (req, res) => {
    // Отримуємо дані з форми
    const { recipient, subject, text } = req.body;

    // Налаштовуємо транспортер для відправки листа
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'adriana.schamberger@ethereal.email',
            pass: 'DP9c1JYH1RuhdHcrvX'
        }
    });

    // Налаштовуємо дані для листа
    const mailOptions = {
        from: 'adriana.schamberger@ethereal.email',
        to: recipient,
        subject: subject,
        text: text
    };

    // Надсилаємо лист
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            res.send('Помилка під час відправлення листа');
        } else {
            console.log('Email sent: ' + info.response);
            res.send('Лист успішно надіслано');
        }
    });
});


app.get("/", (req, res) => {
    res.send("hello world");
});

app.listen(port, () => {
    console.log("server start")
})