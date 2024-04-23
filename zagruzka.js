const fs = require('fs');
const mysql = require('mysql');

// Зчитуємо файл з об'єктом
const data = JSON.parse(fs.readFileSync('your_file.json', 'utf-8'));

// Підключаємося до бази даних
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'famdy',
    port: '8889'
});

connection.connect();

// Завантажуємо кожен об'єкт з файлу в базу даних
data.forEach(product => {
    // Перетворюємо масив images на JSON-строку
    const imagesJson = JSON.stringify(product.images);

    // Перетворюємо об'єкт description в JSON-строку та екрануємо спеціальні символи
    const descriptionJson = JSON.stringify(product.description).replace(/'/g, "\\'").replace(/"/g, '\\"');

    // Екрануємо апострофи у полі name
    const name = product.name.replace(/'/g, "\\'");

    // Формуємо SQL-запит з правильним форматом
    const sql = `INSERT INTO products SET 
        id = ${product.id}, 
        name = '${name}', 
        images = '${imagesJson}', 
        price = '${product.price}', 
        sale = '${product.sale}', 
        description = '${descriptionJson}',
        category = '${product.category}'`;

    // Виконуємо SQL-запит
    connection.query(sql, (error, results, fields) => {
        if (error) throw error;
        console.log('Inserted product with ID ' + results.insertId);
    });
});

connection.end();
