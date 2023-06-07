/*
 * API sub-router for businesses collection endpoints.
 */

const { Router } = require('express')
const { validateAgainstSchema } = require('../lib/validation')

const { getChannel} = require('../lib/rabbitmq')
const router = Router()


const {
  PhotoSchema,
  photoTypes,
  getPhotoInfoById,
  removeUploadedFile,
  savePhotoFile,
} = require('../models/photo')

/*
 * GET /media/photos/{filename} - Route to fetch file data for photos
 */
router.get('/media/:filename', (req, res, next) => {
  const downloadStream = getDownloadStreamByFilename(req.params.filename);
  downloadStream
    .on('file', (file) => {
      res.status(200).type(file.metadata.contentType);
      downloadStream.pipe(res);
    })
    .on('error', (err) => {
      try {
        if (err.code === 'ENOENT') {
          throw err;
        } else {
          throw new Error(err);
        }
      } catch (err) {
        next(err);
      }
    });
});

/*
 * GET /photos/thumbs/{id} - Route to fetch info about a specific thumbnail.
 */
router.get('/thumbs/:id', (req, res, next) => {
  try {
    getThumbInfoById(req.params.id, (err, thumb) => {
      if (err) {
        console.error(err);
        res.status(500).send({
          error: "An error occurred. Try again later"
        });
      } else if (thumb) {
        delete thumb.path;
        const responseBody = {
          _id: thumb._id,
          url: `/photos/media/thumbs/${thumb.filename}`
        };
        res.status(200).send(responseBody);
      } else {
        next();
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "An error occurred. Try again Later."
    });
  }
});

/*
 * GET /media/thumbs/{filename} - Route to fetch file data for thumbnails.
 */
router.get('/media/thumbs/:filename', (req, res, next) => {
  try {
    const downloadStream = getThumbDownloadStreamByFilename(req.params.filename);
    downloadStream.on('file', (file) => {
        res.status(200).type(file.metadata.contentType);
      })
      .on('error', (err) => {
        if (err.code === 'ENOENT') {
          next();
        } else {
          next(err);
        }
      })
      .pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "An error occurred. Try again Later."
    });
  }
});

/*
 * POST /photos - Route to create a new photo.
 */
router.post('/', upload.single('photo'), async (req, res, next) => {
  const body = JSON.parse(req.body.data)
  if (validateAgainstSchema(body, PhotoSchema) && req.file) {
    try {
      const photo = {
        contentType: req.file.mimetype,
        filename: req.file.filename,
        path: req.file.path,
        userId: body.userId
      }
      const id = await savePhotoFile(photo)
      const channel = getChannel();
      channel.sendToQueue('photos', Buffer.from(id.toString()));
      await removeUploadedFile(photo)
      res.status(200).send({
        id: id,
        links: {
          photo: `/photos/${id}`,
          business: `/businesses/${body.businessId}`
        }
      })
    } catch (err) {
      console.error(err)
      res.status(500).send({
        error: "Error inserting photo into DB.  Try again Later."
      })
    }
  } else {
    res.status(400).send({
      error: "Request body is not a valid photo object with UserId"
    })
  }
})

/*
 * GET /photos/{id} - Route to fetch info about a specific photo.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const photo = await getPhotoinfoById(req.params.id)
    if (photo) {
      delete photo.path;
      const resBody = {
        _id: photo._id,
        url: `/media/photos/${photo._id}.${photoTypes[photo.metadata.contentType]}`,
        contentType: photo.metadata.contentType,
        userId: photo.metadata.userId,
        dimensions: photo.metadata.dimensions
      }
      res.status(200).send(resBody)
    } else {
      next()
    }
  } catch (err) {
    console.error(err)
    res.status(500).send({
      error: "Unable to fetch photo.  Try again Later."
    })
  }
})

module.exports = router
