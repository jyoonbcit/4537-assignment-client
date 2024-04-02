// Imports
const messages = require('./en/lang/messages/user');
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
// TODO: For hashing passwords in the database
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usersModel = require('./models/users');
const sanitize = require('mongo-sanitize');
const mongoose = require('mongoose');
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

app.get('/admin', (req, res) => {
    res.render('admin', { title: 'Admin' });
});

app.get('/loginsuccess', (req, res) => {
    res.render('loginsuccess', { messages: messages });
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
    const sanitizedUsername = sanitize(username);
    const sanitizedEmail = sanitize(email);
    const sanitizedPassword = sanitize(password);

    try {
        const existingUser = await usersModel.findOne({ user: sanitizedUsername }).exec();
        if (existingUser) {
            return res.send(`
                <h1> ${messages.userExists} </h1>
            `);
        }
        const existingEmail = await users.Model.findOne({ email: sanitizedEmail }).exec();
        if (existingEmail) {
            return res.send(`
                <h1> ${messages.emailExists} </h1>
            `);
        }
        const hashedPassword = await bcrypt.hash(sanitizedPassword, 10);
        const newUser = new usersModel({
            username: sanitizedUsername,
            email: sanitizedEmail,
            password: hashedPassword,
            isAdmin: false,
            api_requests: 0
        });
        await newUser.save();
        res.redirect('/loginsuccess');
    } catch (error) {
        console.error(error);
        res.send(`
        <h1> ${messages.insertionError} ${error.message}</h1>
        `)
        return;
    }
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await usersModel.findOne({ email: req.body.email });
        console.log(result);
        if (result === null) {
            res.send(`
            <h1> ${messages.userNotFound} </h1>
            <a href='/login'> ${messages.tryAgain} </a>
        `);
        } else if (bcrypt.compareSync(req.body.password, result?.password)) {
            // If password matches, generate JWT token
            const token = jwt.sign({
                email: req.body.email,
                name: result.name,
                type: result.type
            }, secret, { expiresIn: '1h' }); // Token expires in 1 hour

            // Set JWT token as a cookie
            res.cookie('jwt', token, { httpOnly: true, maxAge: 3600000 }); // Max age 1 hour

            res.redirect('/members'); // redirect to members page or change to whatever page you want
        } else {
            res.send(`
            <h1> ${messages.incorrectPassword} </h1>
            <a href='/login'> ${messages.tryAgain} </a>
        `);
        }
    } catch (error) {
        console.log(err);
        res.send(`
        <h1> ${messages.loginError} ${error.message}</h1>
        `)
        return;


    }
});


async function main() {
    await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
    console.log("Connected to db.");
    app.listen(process.env.PORT || 3000, () => {
        console.log('Server is running!')
    })
} main().catch(err => console.log(err));
