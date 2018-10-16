const mongoose = require('mongoose');
const User = mongoose.model('User');
const Blizzard = mongoose.model('Blizzard');
const passwordValidator = require('password-validator');

exports.loginForm = (req, res) => {
  if (typeof req.user == 'undefined') {
    res.render('login', { title: 'Login' });
  } else {
    req.flash('info', 'You are logged in.');
    res.redirect('/');
  }
};

exports.signupForm = (req, res) => {
  res.render('signup', { title: 'Sign Up' });
};

exports.forgotPasswordForm = (req, res) => {
  res.render('forgotPassword', { title: 'Forgot your password?' });
};

exports.validateRegistration = (req, res, next) => {
  // Firstly, just validate the supplied password
  const passwordSchema = new passwordValidator();

  passwordSchema
    .is()
    .min(6) // Minimum length 6
    .is()
    .max(100) // Maximum length 100
    .has()
    .uppercase() // Must have uppercase letters
    .has()
    .lowercase() // Must have lowercase letters
    .has()
    .digits() // Must have digits
    .has()
    .not()
    .spaces() // Should not have spaces
    .is()
    .not()
    .oneOf(['Passw0rd', 'Password123']); // Blacklist these values

  if (!passwordSchema.validate(req.body.password)) {
    req.flash(
      'error',
      'Password must contain at least one number, one uppercase character, and be at least 6 characters long.'
    );
    res.render('signup', {
      title: 'Sign Up',
      body: req.body,
      flashes: req.flash()
    });
    return;
  }

  // Now validate all of the other fields
  req.sanitizeBody('name');

  req.checkBody('name', 'Please supply a name.').notEmpty();
  req
    .checkBody('email', 'That is not a valid email address.')
    .notEmpty()
    .isEmail();
  req.sanitizeBody('email').normalizeEmail({
    gmail_remove_dots: false,
    remove_extension: false
  });
  req.checkBody('password', 'Password cannot be blank!').notEmpty();
  req
    .checkBody('confirm-password', 'Confirmed password cannot be blank!')
    .notEmpty();
  req
    .checkBody('confirm-password', 'Passwords do not match.')
    .equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('error', errors.map(error => error.msg));
    res.render('signup', {
      title: 'Sign Up',
      body: req.body,
      flashes: req.flash()
    });
    return;
  }

  next();
};

exports.register = async (req, res, next) => {
  const user = new User({
    email: req.body.email,
    name: req.body.name
  });

  User.register(user, req.body.password, function(err, user) {
    if (err) {
      req.flash(
        'error',
        `${err.message ||
          'There was an error during user registration. Please try again.'}`
      );
      res.render('signup', { title: 'Signup', flashes: req.flash() });
      return;
    }

    // No errors so pass request along to `authController.login()`
    next();
  });
};

exports.updateForm = async (req, res) => {
  const blizzards = await Blizzard.find({ author: req.user._id }).sort({
    name: 1
  });
  res.render('account', { title: 'Your Account', blizzards });
};

exports.update = async (req, res) => {
  const updates = {
    name: req.body.name,
    email: req.body.email
  };

  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: updates },
    { new: true, runValidators: true, context: 'query' }
  );

  req.flash('success', 'Successfully updated your account.');
  res.redirect('/login');
};
