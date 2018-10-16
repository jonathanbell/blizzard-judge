const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const xss = require('xss');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid Email Address'],
    required: 'Please provide an email address.'
  },
  name: {
    type: String,
    trim: true,
    required: 'Please provide your name.'
  },
  resetPasswordToken: String,
  passwordResetExpires: Date,
  favorites: [{ type: mongoose.Schema.ObjectId, ref: 'Blizzard' }]
});

userSchema.pre('save', async function(next) {
  // Strip any malicious `<scipt>` tags or html from our inputs
  this.name = xss(this.name);
  next();
});

// Exposes the `.register` method on the User model.
// Takes care of all of the lower level registration tasks (such as password
// hashing).
userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model('User', userSchema);
