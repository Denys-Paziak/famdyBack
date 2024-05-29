const express = require('express');
const router = express.Router();
const multer = require('multer');

const authenticateToken = require('../middlewares/authenticateToken');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

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


router.get("/", authenticateToken, (req, res) => {
    const combinedQuery = `
        SELECT 
            p.*, 
            COALESCE(like_count, 0) AS like_count,
            (SELECT AVG(CAST(price AS DECIMAL(10, 2))) FROM products) AS average_price,
            (SELECT MIN(CAST(price AS DECIMAL(10, 2))) FROM products) AS min_price,
            (SELECT MAX(CAST(price AS DECIMAL(10, 2))) FROM products) AS max_price,
            (SELECT COUNT(*) FROM products) AS total_products,
            (SELECT COUNT(*) FROM products WHERE sale IS NOT NULL AND sale <> '') AS products_on_sale,
            (SELECT AVG(CAST(sale AS DECIMAL(10, 2))) FROM products WHERE sale IS NOT NULL AND sale <> '') AS average_sale,
            (SELECT COUNT(*) FROM products WHERE JSON_LENGTH(images) = 0) AS products_without_images,
            (SELECT SUM(like_count) FROM (SELECT COUNT(*) AS like_count FROM user_likes GROUP BY product_id) AS sub) AS total_likes,
            (SELECT product_id FROM user_likes GROUP BY product_id ORDER BY COUNT(*) DESC LIMIT 1) AS most_liked_product,
            (SELECT product_id FROM user_likes GROUP BY product_id ORDER BY COUNT(*) ASC LIMIT 1) AS least_liked_product,
            (SELECT COUNT(DISTINCT user_id) FROM user_likes) AS unique_likers,
            (SELECT AVG(like_count) FROM (SELECT COUNT(*) AS like_count FROM user_likes GROUP BY product_id) AS sub) AS average_likes_per_product,
            (SELECT COUNT(*) FROM users) AS total_users,
            (SELECT COUNT(*) FROM cart) AS total_cart_items,
            (SELECT COUNT(DISTINCT product_id) FROM cart) AS total_unique_products_in_cart,
            (SELECT SUM(quantity) FROM cart) AS total_quantity_in_cart,
            (SELECT SUM(price * quantity) FROM cart) AS total_value_in_cart,
            (SELECT COUNT(DISTINCT user_id) FROM cart) AS unique_users_with_cart,
            (SELECT product_id FROM cart GROUP BY product_id ORDER BY SUM(quantity) DESC LIMIT 1) AS most_popular_product_in_cart,
            category_stats.product_count,
            (SELECT COUNT(*) FROM orders) AS total_orders,
            (SELECT SUM(price * quantity) FROM cart) AS total_revenue,
            (SELECT AVG(total) FROM (SELECT SUM(price * quantity) AS total FROM cart GROUP BY user_id) AS subquery) AS average_order_value,
            (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending_orders,
            (SELECT COUNT(*) FROM orders WHERE status = 'confirmed') AS confirmed_orders,
            (SELECT COUNT(*) FROM orders WHERE status = 'shipped') AS shipped_orders,
            (SELECT COUNT(*) FROM orders WHERE status = 'delivered') AS delivered_orders,
            (SELECT COUNT(*) FROM orders WHERE status = 'cancelled') AS cancelled_orders
        FROM products p
        LEFT JOIN (
            SELECT product_id, COUNT(*) AS like_count
            FROM user_likes
            GROUP BY product_id
        ) l ON p.id = l.product_id
        LEFT JOIN (
            SELECT category, COUNT(*) AS product_count
            FROM products
            GROUP BY category
        ) category_stats ON p.category = category_stats.category;
    `;
    connection.query(combinedQuery, (error, results, fields) => {
        if (error) {
            console.error('Помилка', error.message);
            return res.status(500).json({ error: "Помилка на сервері" });
        }

        const products = results.map(row => ({
            id: row.id,
            name: row.name,
            images: row.images,
            price: row.price,
            sale: row.sale,
            description: row.description,
            category: row.category,
            like_count: row.like_count,
        }));

        const statistics = {
            average_price: results[0]?.average_price || 0,
            min_price: results[0]?.min_price || 0,
            max_price: results[0]?.max_price || 0,
            total_products: results[0]?.total_products || 0,
            products_on_sale: results[0]?.products_on_sale || 0,
            average_sale: results[0]?.average_sale || 0,
            products_without_images: results[0]?.products_without_images || 0,
            total_likes: results[0]?.total_likes || 0,
            most_liked_product: results[0]?.most_liked_product || null,
            least_liked_product: results[0]?.least_liked_product || null,
            unique_likers: results[0]?.unique_likers || 0,
            average_likes_per_product: results[0]?.average_likes_per_product || 0,
            total_users: results[0]?.total_users || 0,
            total_cart_items: results[0]?.total_cart_items || 0,
            total_unique_products_in_cart: results[0]?.total_unique_products_in_cart || 0,
            total_quantity_in_cart: results[0]?.total_quantity_in_cart || 0,
            total_value_in_cart: results[0]?.total_value_in_cart || 0,
            unique_users_with_cart: results[0]?.unique_users_with_cart || 0,
            most_popular_product_in_cart: results[0]?.most_popular_product_in_cart || null,
            total_orders: results[0]?.total_orders || 0,
            total_revenue: results[0]?.total_revenue || 0,
            average_order_value: results[0]?.average_order_value || 0,
            pending_orders: results[0]?.pending_orders || 0,
            confirmed_orders: results[0]?.confirmed_orders || 0,
            shipped_orders: results[0]?.shipped_orders || 0,
            delivered_orders: results[0]?.delivered_orders || 0,
            cancelled_orders: results[0]?.cancelled_orders || 0
        };

        const categoryCounts = results.reduce((acc, row) => {
            const category = row.category;
            const product_count = row.product_count;
            if (!acc.find(item => item.category === category)) {
                acc.push({ category, product_count });
            }
            return acc;
        }, []);

        res.status(200).json({
            products: products,
            statistics: statistics,
            categoryCounts: categoryCounts,
        });
    });
});


router.get("/users", authenticateToken, (req, res) => {
    const Query = 'SELECT * FROM `users`';

    connection.query(Query, (error, users, fields) => {
        if (error) {
            console.error('Помилка', error.message);
            return res.status(500).json({ error: "Помилка на сервері" });
        }

        res.status(200).json(users);
    });
});

router.post('/products', authenticateToken, upload.array('images', 10), (req, res) => {
    if (!req.files) {
        return res.status(400).json({ error: 'Файли не завантажені' });
    }

    console.log("ssss")

    let { name, price, sale, description, category } = req.body;

    price = price + " грн";
    sale = sale + " грн";

    description = description.text

    const imagePaths = req.files.map(file => `${req.protocol}://${req.get('host')}/${file.path}`);
    console.log(imagePaths)
    console.log("ssss")


    const query = 'INSERT INTO products (name, images, price, sale, description, category) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [name, JSON.stringify(imagePaths), price, sale, description, category];

    connection.query(query, values, (error, results) => {
        if (error) {
            console.error('Помилка при додаванні товару:', error.message);
            return res.status(500).json({ error: 'Помилка на сервері' });
        }
        res.status(201).json({ message: 'Товар успішно доданий', productId: results.insertId });
    });
});

router.put('/products/:id', authenticateToken, upload.array('images', 10), (req, res) => {
    const { id } = req.params;
    const { name, price, sale, description, category } = req.body;
    let imagePaths = [];

    console.log(description.text)

    if (req.files && req.files.length > 0) {
        imagePaths = req.files.map(file => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`);
    }

    const query = `
        UPDATE products
        SET name = ?, price = ?, sale = ?, description = ?, category = ?, images = COALESCE(?, images)
        WHERE id = ?`;
    const values = [name, price, sale, description, category, JSON.stringify(imagePaths), id];

    connection.query(query, values, (error, results) => {
        if (error) {
            console.error('Помилка при оновленні товару:', error.message);
            return res.status(500).json({ error: 'Помилка на сервері' });
        }
        res.status(200).json({ message: 'Товар успішно оновлений' });
    });
});

router.delete('/products/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM products WHERE id = ?';
    const values = [id];

    connection.query(query, values, (error, results) => {
        if (error) {
            console.error('Помилка при видаленні товару:', error.message);
            return res.status(500).json({ error: 'Помилка на сервері' });
        }
        res.status(200).json({ message: 'Товар успішно видалений' });
    });
});



module.exports = router;
