
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


router.get("/user_cart", authenticateToken, (req, res) => {
    const userId = req.user.userId;

    connection.query('SELECT * FROM cart WHERE user_id = ?', [userId], (error, results, fields) => {
        if (error) {
            console.error('Помилка', error.message);
            return res.status(500).json({ error: "Помилка на сервері" });
        }

        res.status(200).json(results);
    });
});

router.post("/cart", authenticateToken, (req, res) => {
    const { productId, quantity, size, price, sale, image } = req.body;
    const userId = req.user.userId;

    console.log("id який получає бекенд" + userId);

    // Перевірка, чи існує користувач з таким ID
    connection.query('SELECT id FROM users WHERE id = ?', [userId], (error, userResults, fields) => {
        if (error) {
            console.error('Помилка при перевірці існування користувача:', error.message);
            res.status(500).send('Помилка сервера при перевірці існування користувача');
            return;
        }

        if (userResults.length === 0) {
            console.error(`Користувач з ID ${userId} не існує`);
            res.status(400).send('Користувач не існує');
            return;
        }

        console.log("Користувач який є в базі даних ", userResults)

        // Перевірка, чи існує товар з таким ID
        connection.query('SELECT id FROM products WHERE id = ?', [productId], (error, productResults, fields) => {
            if (error) {
                console.error('Помилка при перевірці існування товару:', error.message);
                res.status(500).send('Помилка сервера при перевірці існування товару');
                return;
            }

            if (productResults.length === 0) {
                console.error(`Товар з ID ${productId} не існує`);
                res.status(400).send('Товар не існує');
                return;
            }

            // Перевірка, чи існує товар у кошику користувача
            connection.query('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId], (error, results, fields) => {
                if (error) {
                    console.error('Помилка при перевірці товару у кошику:', error.message);
                    res.status(500).send('Помилка сервера при додаванні товару до кошика');
                    return;
                }

                if (results.length > 0) {
                    // Якщо товар вже існує у кошику, оновлюємо його кількість, розмір, ціну, знижку та зображення
                    connection.query('UPDATE cart SET quantity = ?, size = ?, price = ?, sale = ?, image = ? WHERE user_id = ? AND product_id = ?', [quantity, size, price, sale, image, userId, productId], (error, results, fields) => {
                        if (error) {
                            console.error('Помилка при оновленні кількості, розміру, ціни, знижки та зображення товару у кошику:', error.message);
                            res.status(500).send('Помилка сервера при оновленні товару у кошику');
                            return;
                        }
                        res.status(200).send('Товар успішно оновлено у кошику');
                    });
                } else {
                    // Якщо товар не існує у кошику, додаємо його

                    console.log("дані яку я передаю", userId, productId, quantity, size, price, sale, image)

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
    });
});


router.delete("/cart", authenticateToken, (req, res) => {
    const { productId } = req.body;

    const userId = req.user.userId;

    connection.query('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId], (error, results, fields) => {
        if (error) {
            console.error('Помилка при перевірці наявності товару в кошику:', error.message);
            res.status(500).send('Помилка сервера при видаленні товару з кошика');
            return;
        }

        if (results.length === 0) {
            res.status(404).send('Товар не знайдено в кошику користувача');
            return;
        }

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



router.post('/place-order', authenticateToken, (req, res) => {
    const { fullName, address, city, postalCode, phone, email, paymentMethod, totalAmount } = req.body;
    const userId = req.user.userId;

    const orderQuery = `
        INSERT INTO orders (user_id, full_name, address, city, postal_code, phone, email, payment_method, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const orderValues = [userId, fullName, address, city, postalCode, phone, email, paymentMethod, 'pending'];

    connection.query(orderQuery, orderValues, (error, results) => {
        if (error) {
            console.error('Помилка при створенні замовлення:', error.message);
            return res.status(500).json({ error: 'Помилка на сервері' });
        }

        const orderId = results.insertId;


        const paymentUrl = generateFondyPaymentUrl(orderId, totalAmount);

        res.status(201).json({ message: 'Замовлення успішно створено', paymentUrl });
    });
});

function generateFondyPaymentUrl(orderId, amount) {
    // Implement your Fondy payment URL generation logic here
    // Example:
    return `https://checkout.fondy.eu/merchant?order_id=${orderId}&amount=${amount}`;
}

module.exports = router;