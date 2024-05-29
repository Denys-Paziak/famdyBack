// Import required modules
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

// Create an Express application
const app = express();

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Define the port number
const port = 3000;

// Import route handlers
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const emailRouter = require('./routes/email');
const basketRouter = require('./routes/basket');
const adminRouter = require('./routes/admin');
const orderRouter = require('./routes/orders');

// Use route handlers
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/email', emailRouter);
app.use('/basket', basketRouter);
app.use('/admin', adminRouter);
app.use('/', orderRouter);

// Start the server
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
}); 