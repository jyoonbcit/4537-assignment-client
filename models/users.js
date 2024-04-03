const mongoose = require('mongoose');

const usersSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    apiRequests: Number,
    isAdmin: Boolean
});
const usersModel = mongoose.model('users', usersSchema);

module.exports = usersModel;