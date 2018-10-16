require('dotenv').config({ path: `${__dirname}/../variables.env` });

const mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE);

const slug = require('slugs');
const fetch = require('cross-fetch');
const cheerio = require('cheerio');
const uuidv4 = require('uuid/v4');
const cloudinary = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUDNAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// Import *all* of our models manually
const User = require('../models/User');
const Blizzard = require('../models/Blizzard');
// We need this because we call `Review` inside aggregations on the Blizzard model
const Review = require('../models/Review');

// forEach promises:
// https://codeburst.io/javascript-async-await-with-foreach-b6ba62bbf404
const asyncForEach = async function(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

const getHtml = async function(
  Url = 'https://www.dairyqueen.com/ca-en/Menu/Treats/'
) {
  try {
    const response = await fetch(Url);
    if (response.status >= 400) {
      throw new Error(
        `Bad response from server: ${response.status} error code.`
      );
    }
    const html = await response.text();

    return html;
  } catch (err) {
    console.error(err);
    return false;
  }
};

const compileBlizzardsFromWeb = async function() {
  const blizzards = [];
  const DQhost = 'https://www.dairyqueen.com';
  const allBlizzardsHtml = await getHtml(`${DQhost}/ca-en/Menu/Treats/`);
  const author = await User.findOne({ email: 'jonathanbell.ca@gmail.com' });

  const $ = cheerio.load(allBlizzardsHtml);

  $('#category_1_list_container .menu-list li a').each(function(
    i,
    menuListItem
  ) {
    const b = {};

    const name = $(this)
      .children('strong')
      .first()
      .text()
      .trim()
      .replace(/®/g, '')
      .replace(/Blizzard Treat/g, '')
      .replace(/  /g, ' ')
      .replace(/Blizzard/g, '');

    // Blizzard name
    b.name = name;

    // Blizzard Official Url
    b.docsUrl = `${DQhost}${$(this).attr('href')}`;

    // Blizzard photo
    const photoUrlStr = `${DQhost}${$(this)
      .children('.item-container')
      .first()
      .children('img')
      .first()
      .attr('src')}`;
    b.dqphoto = photoUrlStr.substring(0, photoUrlStr.indexOf('?')); // remove query params

    // A single Blizzard tag
    b.tags = [
      $(this)
        .parent('li')
        .parent('.menu-list')
        .prev('.sub-title')
        .text()
        .trim()
    ];

    // Blizzard author
    b.author = author._id;

    // Blizzard slug
    b.slug = slug(name);

    blizzards.push(b);
  });

  await asyncForEach(blizzards, async blizzard => {
    console.log(
      `Getting the blizzard description for the ${blizzard.name} Blizzard.`
    );
    const blizzardDescHtml = await getHtml(blizzard.docsUrl);
    const $ = cheerio.load(blizzardDescHtml);
    blizzard.description =
      $('.product-desc')
        .first()
        .text()
        .trim()
        .replace(/®/g, '') || '';
  });

  return blizzards;
};

const uploadPhotoUrlToCloudinary = (
  photoUrl,
  options = {
    angle: -180,
    public_id: `${process.env.CLOUDINARY_FOLDER}/${uuidv4()}`
  }
) => {
  return new Promise((accept, reject) => {
    cloudinary.uploader.upload(photoUrl, accept, options);
  });
};

const populateDbWithLegitBlizzards = async function() {
  const blizzards = await compileBlizzardsFromWeb();

  await asyncForEach(blizzards, async blizzard => {
    const checkThisBlizzard = await Blizzard.find({ name: blizzard.name });
    if (!checkThisBlizzard.length) {
      console.log(`${blizzard.name} did not previously exist in the database.`);

      // Upload the blizzard photo to Cloudinary
      try {
        const blizzardphoto = await uploadPhotoUrlToCloudinary(
          blizzard.dqphoto
        );
        console.log(`Added the image ${blizzard.dqphoto} to Cloudinary.`);
        blizzard.cloudinaryId = blizzardphoto.public_id;
      } catch (err) {
        console.log(
          'Error while uploading blizzard photo to Cloudinary: ',
          err
        );
      }

      // Save the blizzard to the database
      const newBlizzard = new Blizzard(blizzard);
      await newBlizzard.save();
    } else {
      console.log(
        `${blizzard.name} already exists in database so no need to update.`
      );
    }
  });

  // TODO: We could probably use something like `await Blizzard.insertMany(blizzards);` above
  // but I don't think we can check if the record already exists if we use `.insertMany()`.

  console.log(
    'Blizzards from the web have been checked against our current database and inserted if needed.'
  );
};

const populateAllData = async function() {
  await populateDbWithLegitBlizzards();
  console.log('Blizzard update process complete.');
  process.exit();
};

populateAllData();
