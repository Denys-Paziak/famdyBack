
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
router.delete("/cart", authenticateToken, (req, res) => {
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



router.post('/place-order', authenticateToken, (req, res) => {
    const { fullName, address, city, postalCode, phone, email, paymentMethod, totalAmount } = req.body;
    const userId = req.user.userId; // Assuming the user ID is available in req.user

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

        // Assuming you have a function to generate payment URL
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