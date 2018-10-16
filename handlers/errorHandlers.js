/**
 * @file Borrowed in part from Wes Bos' excellent Learn Node course:
 * https://learnnode.com/
 */

// For async/await. Use this instead of `try{} catch(e){}`.
// Wrap any function that is `async` in `catchErrors()` inside your routes.
// Passes any errors throw along to the `next()` middleware via Express.
exports.catchErrors = fn => {
  return function(req, res, next) {
    return fn(req, res, next).catch(next);
  };
};

// If we hit a route that is not found, mark it as 404 and pass it along to the
// next error handler to display via `next(err)`.
exports.notFound = (req, res, next) => {
  const err = new Error('404 Page Not Found!');
  err.status = 404;
  next(err);
};

// Detect if there are mongodb validation errors.
exports.flashValidationErrors = (err, req, res, next) => {
  if (!err.errors) return next(err);
  // Validation errors
  const errorKeys = Object.keys(err.errors);
  // Add the error to the flashes
  errorKeys.forEach(key => req.flash('error', err.errors[key].message));
  res.redirect('back'); // send the user back to the page where the error was thrown
};

// Very handy!
// Development error handling - shows useful errors while in development.
// Based on `app.get('env')`
exports.developmentErrors = (err, req, res, next) => {
  err.stack = err.stack || '';
  const errorDetails = {
    message: err.message,
    status: err.status,
    stackHighlighted: err.stack.replace(
      /[a-z_-\d]+.js:\d+:\d+/gi,
      '<mark>$&</mark>'
    )
  };
  res.status(err.status || 500);
  res.format({
    // Based on the `Accept` http header...
    'text/html': () => {
      // Probably a form submission, reload the page.
      res.render('error', errorDetails);
    },
    // An Ajax call, send JSON back.
    'application/json': () => res.json(errorDetails)
  });
};

// Uncomment the lines below if you'd like to see what kind of errors users
// while see in production while still in your development enviroment.
// ---------------- Remember to comment back out! : ) --------------------------
// exports.developmentErrors = (err, req, res, next) => {
//   res.status(err.status || 500);
//   res.render('error', {
//     message: err.message,
//     error: {}
//   });
// };

// Production error handling
exports.productionErrors = (err, req, res, next) => {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
};
