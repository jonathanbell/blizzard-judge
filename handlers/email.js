const nodemailer = require('nodemailer');
const pug = require('pug');
const juice = require('juice');
const htmlToText = require('html-to-text');

const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const generateHTML = (filename, options = {}) => {
  const html = pug.renderFile(
    `${__dirname}/../views/email/${filename}.pug`,
    options
  );
  return juice(html);
};

exports.send = async options => {
  const html = generateHTML(options.filename, options);
  const text = htmlToText.fromString(html);
  const mailOptions = {
    from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_ADDRESS}>`,
    to: options.user.email,
    subject: options.subject,
    html,
    text
  };

  return transport.sendMail(mailOptions, function(err) {
    if (err) {
      console.error(
        `There was an error while sending an email to ${mailOptions.to}. ${err}`
      );
    } else {
      console.log(`Email sent to ${mailOptions.to}`);
    }
  });
};
