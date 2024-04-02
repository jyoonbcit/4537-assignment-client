// Imports
const express = require('express');
const session = require('express-session');
const app = express();
app.set('view engine', 'ejs');
// TODO: For hashing passwords in the database
const bcrypt = require('bcrypt');
const usersModel = require('./models/users');
var MongoDBStore = require('connect-mongodb-session')(session);
// TODO: Setup environment variables
const dotenv = require('dotenv');
dotenv.config();

// TODO: Add input validation, maybe using Joi

// Setup session
app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        store: new MongoDBStore({
            uri: process.env.MONGODB_URI,
            collection: 'sessions'
        })
    }
));

// GET requests
app.get('/', (req, res) => {
    res.render('index', { title: 'Index'});
});

app.get('/signup', (req, res) => {
    res.render('signup', { title: 'Signup' });
});

app.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});

// POST requests
app.post('/signup', (req, res) => {
    // TODO: Connect this to a database
    res.send(`
        Signup successful
        <a href="/">Home</a>
    `);
});

app.post('/login', (req, res) => {
    // TODO: Do something with the cookie here
    res.send(`
        Signup successful
        <a href="/">Home</a>
    `);
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});