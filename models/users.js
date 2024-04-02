const mongoose = require('mongoose');

const usersSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    api_requests: Number,
    isAdmin: Boolean
});
const usersModel = mongoose.model('users', usersSchema);

module.exports = usersModel;