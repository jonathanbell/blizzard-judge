const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');
const promisify = require('es6-promisify');
const flash = require('connect-flash');
const expressValidator = require('express-validator');
const routes = require('./routes/index');
const helpers = require('./helpers');
const errorHandlers = require('./handlers/errorHandlers');
require('./handlers/passport');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Don't minify html.
app.locals.pretty = true;

app.use(express.static(path.join(__dirname, 'public')));

// Adds request properties available on `req.body`
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Exposes a bunch of methods for validating data.
app.use(expressValidator());

// Populate `req.cookies` with any cookies that came along with the request.
app.use(cookieParser());

// Sessions: keeps users logged in and allows us to send flash messages on a
// single request.
app.use(
  session({
    secret: process.env.SECRET,
    key: process.env.KEY,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  })
);

// Initialize Passport JS
app.use(passport.initialize());
app.use(passport.session());

// Use session flashes.
app.use(flash());

// Passes variables to our templates and *all requests*.
app.use((req, res, next) => {
  res.locals.helpers = helpers;
  res.locals.flashes = req.flash();
  res.locals.user = req.user || null; // `user` will be available on every request if possible
  res.locals.currentPath = req.path;
  next();
});

// Promisify callback based login.
app.use((req, res, next) => {
  req.login = promisify(req.login, req);
  next();
});

// Redirect from www to non-www inside Zeit `now` service:
// https://zeit.co/docs/guides/redirect#2.-redirect-inside-your-app
app.use((req, res, next) => {
  // If the request doesn't come from blizzardjudge.com or from the Zeit deployment URL:
  if (req.hostname !== process.env.APPHOST && req.hostname !== 'localhost') {
    // Redirect to blizzardjudge.com keeping the pathname and querystring intact.
    return res.redirect(`https://${process.env.APPHOST}${req.originalUrl}`);
  }

  next();
});

// Handle all of our own routes.
app.use('/', routes);

// Routes above^^^ didn't work. Probably a 404. Call `errorHandlers.notFound`
app.use(errorHandlers.notFound);

// Flashes errors back to the session.
app.use(errorHandlers.flashValidationErrors);

// Really bad error... : |
if (app.get('env') === 'development') {
  // Development error handler
  app.use(errorHandlers.developmentErrors);
}

// Production error handler
app.use(errorHandlers.productionErrors);

module.exports = app;
