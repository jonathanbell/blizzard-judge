require('dotenv').config({ path: __dirname + '/../variables.env' });

const mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE);

const Review = require('../models/Review');
const Blizzard = require('../models/Blizzard');

async function deleteData() {
  await Blizzard.remove();
  await Review.remove();
  console.log("It's a fresh start. Data Deleted.");
  process.exit();
}

if (process.argv.includes('--absolute')) {
  console.log(
    'Now why would you wanna delete all that data? Well, here goes...'
  );
  deleteData();
} else {
  console.log(
    'You need to be absolutely sure! Pass the `--absolute` argument to this command.'
  );
}
