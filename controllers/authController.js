const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const passwordValidator = require('password-validator');
const email = require('../handlers/email');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash:
    'Login failed! Please try again or <a href="/forgot">reset your password</a> if you forgot it.',
  successRedirect: '/',
  successFlash:
    'Right on! You are now logged in. You can now review <a href="/blizzards">all the blizzards</a>!'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You have been logged out. Goodbye!');
  res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    // Yup! : )
    return next();
  }
  req.flash(
    'error',
    'You must be logged in to do that. Please login or <a href="/become-a-blizzard-tester">signup</a>.'
  );
  res.redirect('/login');
};

exports.forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    req.flash(
      'error',
      'An error occured. Please try again or <a href="mailto:jonathanbell.ca@gmail.com">email us</a> for assistance.'
    );
    return res.redirect('back');
  }

  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.passwordResetExpires = Date.now() + 3600000; // 60 mins.
  await user.save();

  const resetUrl = `http://${req.headers.host}/account/reset/${
    user.resetPasswordToken
  }`;

  await email.send({
    user,
    subject: 'Blizzard Judge: Password Reset Request',
    resetUrl,
    // The Pug template that we will use for the actual email.
    filename: 'password-reset'
  });

  req.flash(
    'success',
    'Your password reset link has been sent via email. Please allow a few moments for it to arrive and check your spam folder if you do not see it.'
  );

  res.redirect('/login');
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    passwordResetExpires: { $gt: Date.now() }
  });
  if (!user) {
    req.flash('error', 'Password reset token is invalid.');
    return res.redirect('/login');
  }

  // Found a user that has a valid reset password token
  // Show the reset password form
  res.render('resetPassword', { title: 'Reset your password.' });
};

exports.confirmNewPassword = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) {
    // TODO: Move this and the code in `userController.validateRegistration()`
    // into their own middleware to validate passwords.
    const passwordSchema = new passwordValidator();

    passwordSchema
      .is()
      .min(6)
      .is()
      .max(100)
      .has()
      .uppercase()
      .has()
      .lowercase()
      .has()
      .digits()
      .has()
      .not()
      .spaces()
      .is()
      .not()
      .oneOf(['Passw0rd', 'Password123']);

    if (!passwordSchema.validate(req.body.password)) {
      req.flash(
        'error',
        'Password must contain at least one number, one uppercase character, and be at least 6 characters long.'
      );
      res.redirect('back');
      return;
    }

    // s'all good.
    return next();
  } else {
    req.flash('error', 'Passwords do not match.');
    res.redirect('back');
  }
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash('error', 'Your password reset token is invalid or has expired.');
    return res.redirect('/login');
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);

  // Setting these values to `undefined` will remove these fields from the user
  // in the DB.
  user.resetPasswordToken = undefined;
  user.passwordResetExpires = undefined;

  const updatedUser = await user.save();
  await req.login(updatedUser);
  req.flash('success', 'Your password has been reset. You are now logged in.');
  res.redirect('/');
};
