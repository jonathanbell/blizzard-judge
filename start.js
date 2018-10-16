const mongoose = require('mongoose');

// Import environmental variables from our variables.env file
require('dotenv').config({ path: 'variables.env' });

// Connect to our Database and handle any bad connections.
mongoose.connect(process.env.DATABASE);

// Tell Mongoose to use ES6 promises.
mongoose.Promise = global.Promise;

// Log database errors to the console.
mongoose.connection.on('error', err => {
  console.error(`Database connection error: ${err.message}`);
});

// Import all mongoDB models:
require('./models/Blizzard');
require('./models/User');
require('./models/Review');

// Require our Express app
const app = require('./app');
app.set('port', process.env.PORT || 4321);

// Start the app!
const server = app.listen(app.get('port'), () => {
  console.log(`Blizzard Judge running on port ${server.address().port}`);
});
