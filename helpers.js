// Helpful helper functions : )

const fs = require('fs');
const md5 = require('md5');

// Site details ----------------------------------------------------------------
exports.siteName = 'Blizzard Judge';
exports.siteDescription = 'Rate and review Dairy Queen® Blizzards online.';

// Moment JS - make dates and times look more human-readable
exports.moment = require('moment');

// "console.log" JSON objects out to the browser
exports.dump = obj => JSON.stringify(obj, null, 2);

// Get a Gravatar
exports.gravatar = email => {
  const hash = md5(email);
  return `https://gravatar.com/avatar/${hash}?s=200`;
};

// Insert a SVG inline
exports.svg = name => fs.readFileSync(`./public/images/icons/${name}.svg`);

// Make a Cloudinary URL
exports.cloudinary = (cloudinaryId, width = 800, flip = false) =>
  `${process.env.CLOUDINARY_HOST}/${
    process.env.CLOUDINARY_CLOUDNAME
  }/image/upload/${
    flip ? 'a_180,' : ''
  }f_auto,c_limit,w_${width}/${cloudinaryId}.jpg`;
