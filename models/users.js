const mongoose = require('mongoose');

const usersSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    apiRequests: Number,
    isAdmin: Boolean,
    callAPIRequests: Number,
    updateUserRequests: Number,
    deleteUserRequests: Number,
    loginRequests: Number,
    signupRequests: Number,
    getAdminPage: Number,
    getMembersPage: Number,
    getLogoutPage: Number,
    getMethod: String,
    getEndpoint: String,

});
const usersModel = mongoose.model('users', usersSchema);
module.exports = usersModel;