# Blizzard Judge

This is the source code for [BlizzardJudge.com](https://blizzardjudge.com), the web app that helps answer the age old question: "Which is the very best Dairy Queen® blizzard?"

Users can create an account and then start rating and reviewing blizzards. Users can also create their own custom blizzards and have others comment and review their creations. Photos are attached to reviews in order to document true blizzard verdicts.

After a blizzard has been reviewed 2 or more times, it will be added to the legendary [Top Ten List](https://blizzardjudge.com#top-ten).

## Developer Installation

1. Clone or download this repository.
1. `npm install`
1. Copy `./variables.example` to `./variables.env`
1. Configure your Mongo Database string inside `variables.env`
1. Configure your SMTP email server credentials and addresses/names inside `variables.env` (edit any key that begins with `MAIL_`)
1. Configure your [Cloudinary](https://cloudinary.com) API credentials inside `variables.env` (edit any key that begins with `CLOUDINARY_`)
1. Add a unique application `KEY` and `SECRET` to `variables.env`
1. `npm run dev`
1. Visit `http://localhost:4321` Party on Wayne.

You can seed the database with some live data from the Dairy Queen® Canada website by running `npm run load-dq-data`. This will check if the blizzards on [this page](https://www.dairyqueen.com/ca-en/Menu/Treats/) are already located in your database and, if not, add them to your blizzard collection.

### Tech Stack

Blizzard Judge uses the following:

- Node/ES6
- Express
- MongoDB
- Cloudinary (for image storage)
- Axios
- [Passport.js](http://www.passportjs.org/) (user authentication)
- Pug (for templating)
- Webpack

## Why?

I saw a need for something really important that didn't exist in our world so I built it.
