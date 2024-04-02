// Imports
const messages = require('./en/lang/messages/user');
const express = require('express');
const session = require('express-session');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
// TODO: For hashing passwords in the database
const bcrypt = require('bcrypt');
const usersModel = require('./models/users');
var MongoDBStore = require('connect-mongodb-session')(session);
const mongoose = require('mongoose');
// TODO: Setup environment variables
const dotenv = require('dotenv');
dotenv.config();

// TODO: Add input validation, maybe using Joi

// Setup session
app.use(session({
        cookieName: 'session',
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        store: new MongoDBStore({
            uri: process.env.MONGODB_CONNECTION_STRING,
            collection: 'sessions'
        }),
        cookie: {
            maxAge: 60 * 60, // 1 hour
            httpOnly: true,
            secure: true,
            ephemeral: true
        }
    }
));

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

app.get('/admin', (req, res) => {
    res.render('admin', { title: 'Admin' });
});

app.get('/user', (req, res) => {
    res.render('admin', { title: 'Admin' });
});

//TODO increment api_usage in database when user uses api
app.get('/getAllUserAPI', async (req, res) => {
    try {
        // check if user is admin
        const { email } = req.body;
        const isAdminRow = await db.get('SELECT isAdmin FROM users WHERE email = ?', [email]);

        if (!isAdminRow || !isAdminRow.isAdmin) {
            return res.status(403).json({ error: messages.notAdmin });
        }

        const query = 'SELECT name, email, api_usage FROM users'; // add api_usage and name to database
        const allUsers = await db.all(query);

        res.json(allUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: messages.internalServerError + error.message });
    }
});



// POST requests
app.post('/signup', async (req, res) => {
    // TODO: Validation
    const { username, email, password } = req.body;
    try {
        const existingUser = await usersModel.findOne({ email: email }).exec();
        if (existingUser) {
            return res.status(409).json({ error: messages.userExists });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new usersModel({
            username,
            email,
            password: hashedPassword,
            isAdmin: false,
            api_requests: 0
        });
        await newUser.save();
        console.log("User saved successfully:", newUser);
        res.status(201).json({ message: messages.signupSuccessful });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: messages.insertionError + error.message });
    }
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


async function main() {
    await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
    console.log("Connected to db.");
    app.listen(process.env.PORT || 3000, () => {
        console.log('Server is running!')
    })
} main().catch(err => console.log(err));
