// Imports
const messages = require('./en/lang/messages/user');
const express = require('express');
const cookieParser = require('cookie-parser');
// TODO: For hashing passwords in the database
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usersModel = require('./models/users');
const sanitize = require('mongo-sanitize');
const mongoose = require('mongoose');
// TODO: Setup environment variables
const dotenv = require('dotenv');
dotenv.config();
const methodOverride = require('method-override');


const app = express();
app.use(express.static('public'));


// Middleware to log HTTP method
const logRequestMethod = (req, res, next) => {
    console.log(`Received ${req.method} request for ${req.url}`);
    next(); // Call next middleware/route handler
};

// Add middleware to log HTTP method
app.use(logRequestMethod);

const attachUserToViews = async (req, res, next) => {
    console.log("Middleware executing..."); // Debug log
    try {
        const token = req.cookies.jwt;
        if (!token) {
            console.log("No user token found."); // Debug log
            res.locals.user = null;
            return next();
        }
        const decoded = jwt.verify(token, process.env.SESSION_SECRET);
        const user = await usersModel.findOne({ email: decoded.email }).exec();
        res.locals.user = user;
        console.log("User found:", user); // Debug log
    } catch (error) {
        console.error('Error verifying JWT or fetching user:', error);
        res.locals.user = null;
    }
    next();
};

const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if (token) {
            const decoded = jwt.verify(token, process.env.SESSION_SECRET);
            const user = await usersModel.findOne({ email: decoded.email }).exec();
            if (!user) {
                return res.redirect('/');
            }
            req.user = user;
            next();
        } else {
            return res.redirect('/');
        }
    } catch (error) {
        console.error('Error verifying JWT or fetching user:', error);
        return res.redirect('/');
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        return res.redirect('/');
    }
};


// Middleware setup
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method')); // Use method-override middleware
app.set('view engine', 'ejs');
app.use(attachUserToViews);


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

app.get('/logout', isAuthenticated, async (req, res) => {
    try {
        // Increment counters
        req.user.getLogoutPage++;
        req.user.apiRequests++;
        await req.user.save(); // Save the changes to the user document
        res.clearCookie('jwt');
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: messages.internalServerError + error.message });
    }
});

app.get('/updateUserRole', (req, res) => {

});


// Use isAuthenticated middleware for routes that require authentication
app.get('/members', isAuthenticated, async (req, res) => {
    try {
        // Increment counters
        req.user.getMembersPage++;
        req.user.apiRequests++;
        await req.user.save(); // Save the changes to the user document
        res.render('members', {
            title: 'Members',
            user: req.user // Now directly using req.user set by the middleware
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: messages.internalServerError + error.message });
    }
});

// Use both isAuthenticated and isAdmin middleware for the admin route
app.get('/admin', isAuthenticated, isAdmin, async (req, res) => {
    try {
        // Increment counters
        req.user.getAdminPage++;
        req.user.apiRequests++;
        await req.user.save(); // Save the changes to the user document


        // Render the admin page template with the processed user data
        res.render('admin', {
            title: 'Admin',
            isAdmin: req.user.isAdmin, // req.user is guaranteed to be present and an admin
            users: await usersModel.find({}).exec()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: messages.internalServerError + error.message });

    };
});


app.get('/signup_success', (req, res) => {
    res.render('signup_success', { messages: messages });
});

// TODO: increment api_usage in database when user uses api
app.get('/getAllUserAPI', async (req, res) => {
    const { email } = req.body;
    const sanitizedEmail = sanitize(email);


    try {
        // check if user is admin
        const user = await usersModel.findOne({ email: sanitizedEmail }).exec();
        if (!user.isAdmin) {
            return res.status(403).json({ error: messages.notAdmin });
        }
        const allUsers = await usersModel.find({}).exec();

        res.json(allUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: messages.internalServerError + error.message });
    }
});


//PUT request
app.put('/updateUserRole', isAuthenticated, isAdmin, async (req, res) => {
    const selectedUserIds = req.body.selectedUsers;
    console.log(selectedUserIds);
    try {
        // Update roles for selected users
        await usersModel.updateMany(
            { _id: { $in: selectedUserIds } }, // Update all users where ID is in selectedUserIds array
            { isAdmin: true } // Set isAdmin to true for selected users
        ).exec();
        req.user.updateUserRequests++;
        req.user.apiRequests++;
        await req.user.save(); // Save the changes to the user document

        res.redirect('/admin'); // Redirect back to admin page after updating roles

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: messages.userToggleError + error.message });
    }
});

//DELETE request
app.delete('/deleteUser', isAuthenticated, isAdmin, async (req, res) => {
    const selectedUserIds = req.body.selectedUsers;
    console.log(selectedUserIds);
    try {
        // Delete selected users
        await usersModel.deleteMany(
            { _id: { $in: selectedUserIds } } // Delete all users where ID is in selectedUserIds array
        ).exec();
        req.user.deleteUserRequests++;
        req.user.apiRequests++;
        await req.user.save(); // Save the changes to the user document

        res.redirect('/admin'); // Redirect back to admin page after deleting users

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: messages.userDeleteError + error.message });
    }
});

// POST requests
app.post('/signup', async (req, res) => {
    // TODO: Validation
    const { username, email, password, } = req.body;
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
        const existingEmail = await usersModel.findOne({ email: sanitizedEmail }).exec();
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
            apiRequests: 0,
            callAPIRequests: 0,
            updateUserRequests: 0,
            deleteUserRequests: 0,
            loginRequests: 0,
            signupRequests: 0,
            getAdminPage: 0,
            getMembersPage: 0,
            getLogoutPage: 0,
        });
        newUser.signupRequests++;
        newUser.apiRequests++;
        await newUser.save();
        res.redirect('/signup_success');
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
    const sanitizedEmail = sanitize(email);
    const sanitizedPassword = sanitize(password);

    try {
        const user = await usersModel.findOne({ email: sanitizedEmail }).exec();
        console.log(user);
        if (user === null) {
            res.send(`
            <h1> ${messages.userNotFound} </h1>
            <a href='/login'> ${messages.tryAgain} </a>
        `);
        } else if (bcrypt.compareSync(sanitizedPassword, user?.password)) {
            // If password matches, generate JWT token
            const token = jwt.sign({
                email: sanitizedEmail,
                username: user.username,
                isAdmin: user.isAdmin
            }, process.env.SESSION_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

            user.loginRequests++;
            user.apiRequests++;
            await user.save(); // Save the changes to the user document
            // Set JWT token as a cookie
            res.cookie('jwt', token, { httpOnly: true, maxAge: 3600000 }); // Max age 1 hour
            console.log(user.isAdmin);
            if (user.isAdmin) {
                res.redirect('/admin');
            } else {
                res.redirect('/members'); // redirect to members page or change to whatever page you want
            }
        } else {
            res.send(`
            <h1> ${messages.incorrectPassword} </h1>
            <a href='/login'> ${messages.tryAgain} </a>
        `);
        }
    } catch (error) {
        console.log(error);
        res.send(`
        <h1> ${messages.loginError} </h1>
        `)
        return;
    }
});

app.post('/callAPI', async (req, res) => {
    const { apiInput } = req.body;

    try {
        const user = await usersModel.findOne({ email: jwt.verify(req.cookies.jwt, process.env.SESSION_SECRET).email }).exec();
        if (!user) {
            return res.status(403).json({ error: messages.userNotFound });
        }
        const output = await fetch(`https://4537-assignment-server.netlify.app/.netlify/functions/server?input=${apiInput}`, {
            method: 'GET',
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS, GET',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json',
            }
        });
        const jsonOutput = await output.json();
        user.callAPIRequests++;
        user.apiRequests++;
        await user.save();
        res.json({ jsonOutput });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: messages.internalServerError + error.message });
    }
});


async function main() {
    await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
    console.log("Connected to db.");
    const port = process.env.PORT || 3000; // Default port 3000
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
} main().catch(err => console.log(err));