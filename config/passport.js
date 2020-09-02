const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const User = require('../models/User');
const e = require('express');

// I have 3 types of users (admin, doctor, patient)
// In each login form i have a non-displayed preset field that sends the user's type alongside with username and password
// Here in the local strategy im getting as parameters (by default), the usernameField (username or email) and password
//By adding the passReqToCallBack: true i get the parameters from the request here
//So i can use in the findOne, as a parameter, the email and the user's type
//Then if a user has the same email i.e. as a doctor and as a patient, the strategy sees the type parameter from the login form and chooses which user type must login at that moment.

module.exports = function (passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'email', passReqToCallback: true }, (req, email, password, done) => {

            // Match user
            User.findOne({
                email: email,
                type: req.body.type
            }).then(user => {
                if (!user) {
                    return done(null, false, { message: 'That email is not registered' });
                }

                // Match password
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) throw err;
                    if (isMatch) {
                        if (user.banned === true) {
                            return done(null, false, { message: 'User is banned!' });
                        } if (user.authorized === false) {
                            return done(null, false, { message: "User is not authorized yet! Try again when you receive an email about the account's authorization." });
                        } else {
                            return done(null, user);
                        }
                    } else {
                        return done(null, false, { message: 'Password incorrect' });
                    }
                });
            });
        })
    );
};