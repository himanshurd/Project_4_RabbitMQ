const express = require('express')
const morgan = require('morgan')
const multer = require('multer')
const crypto = require('crypto');

const api = require('./api')
const { connectToDb } = require('./lib/mongo')

const app = express()
const port = process.env.PORT || 8000

const imageTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png'
};
const upload = multer({
  storage: multer.diskStorage({
    destination: `${__dirname}/uploads`,
    filename: (req, file, callback) => {
      const filename =
        crypto.pseudoRandomBytes(16).toString('hex');
      const extension = photoTypes[file.mimetype];
      callback(null, `${filename}.${extension}`);
    }
   }),
   fileFilter: (req, file, callback) => {
    callback(null, !!photoTypes[file.mimetype]);
   }
});

/*
 * Morgan is a popular logger.
 */
app.use(morgan('dev'))

app.use(express.json())
app.use(express.static('public'))

/*
 * All routes for the API are written in modules in the api/ directory.  The
 * top-level router lives in api/index.js.  That's what we include here, and
 * it provides all of the routes.
 */
app.use('/', api)

app.use('*', function (req, res, next) {
  res.status(404).json({
    error: "Requested resource " + req.originalUrl + " does not exist"
  })
})

connectToDb(function () {
  app.listen(port, function () {
    console.log("== Server is running on port", port)
  })
})
