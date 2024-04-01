const messages = require('./en/lang/messages/user');
// Imports
const express = require('express');
const app = express();
app.set('view engine', 'ejs');
// TODO: For hashing passwords in the database
const bcrypt = require('bcrypt');
// TODO: Setup environment variables
const dotenv = require('dotenv');
dotenv.config();


// GET requests
app.get('/', (req, res) => {
    res.render('index', { title: 'Index' });
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

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const query = 'SELECT * FROM users WHERE email = ?';
        const row = await db.get(query, [email]);

        if (row === undefined) {
            return res.status(404).json({ error: messages.userNotFound });
        }

        const user = row;

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: messages.incorrectPassword });
        }

        const token = jwt.sign({ id: user.id }, process.env.SECRET_KEY, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true, secure: true });

        res.status(200).json({ message: messages.loginSuccessful, user });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: messages.loginError + error.message });
    }
});


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});