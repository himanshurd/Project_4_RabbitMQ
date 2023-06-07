/*
 * Photo schema and data accessor methods.
 */
const fs = require('fs');

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')
const { ObjectId, GridFSBucket } = require('mongodb')
/*
 * Schema describing required/optional fields of a photo object.
 */
const PhotoSchema = {
  businessId: { required: true },
  caption: { required: false }
}
exports.PhotoSchema = PhotoSchema

/*
 * Executes a DB query to insert a new photo into the database.  Returns
 * a Promise that resolves to the ID of the newly-created photo entry.
 */
async function insertNewPhoto(photo) {
  photo = extractValidFields(photo, PhotoSchema)
  photo.businessId = ObjectId(photo.businessId)
  const db = getDbReference()
  const collection = db.collection('photos')
  const result = await collection.insertOne(photo)
  return result.insertedId
}
exports.insertNewPhoto = insertNewPhoto

async function savePhotoFile(photo) {
  console.log("=== saving photo file: ", photo)
  return new Promise(function (resolve, reject) {
      const db = getDbReference()
      const bucket = new GridFSBucket(db, { bucketName: "photos" })
      const metadata = {
          contentType: photo.contentType,
          userId: photo.userId
      }
      const uploadStream = bucket.openUploadStream(
          photo.filename,
          { metadata: metadata }
      )
      fs.createReadStream(photo.path).pipe(uploadStream)
          .on("error", function (err) {
              reject(err)
          })
          .on("finish", function (result) {
              console.log("== write success, result:", result)
              resolve(result._id)
          })
  })
} 
exports.savePhotoFile = savePhotoFile

function removeUploadedFile(file) {
  return new Promise((resolve, reject) => {
    fs.unlink(file.path, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
exports.removeUploadedFile = removeUploadedFile
/*
 * Executes a DB query to fetch a single specified photo based on its ID.
 * Returns a Promise that resolves to an object containing the requested
 * photo.  If no photo with the specified ID exists, the returned Promise
 * will resolve to null.
 */
async function getPhotoById(id) {
  const db = getDbReference()
  const collection = db.collection('photos')
  if (!ObjectId.isValid(id)) {
    return null
  } else {
    const results = await collection
      .find({ _id: new ObjectId(id) })
      .toArray()
    return results[0]
  }
}
exports.getPhotoById = getPhotoById

async function getPhotoInfoById(id) {
  const db = getDbReference();
  const bucket = new GridFSBucket(db, { bucketName: 'photos' });  
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await bucket.find({ _id: new ObjectId(id) }).toArray();
    return results[0];
  }
}
exports.getPhotoInfoById = getPhotoInfoById

async function getDownloadStreamByFilename(filename) {
  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'photos' });
  return bucket.openDownloadStreamByName(filename);
};
exports.getDownloadStreamByFilename = getDownloadStreamByFilename

async function getDownloadStreamById(id) {
  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'photos' });
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    return bucket.openDownloadStream(new ObjectId(id));
  }
};
exports.getDownloadStreamById = getDownloadStreamById

async function updatePhotoSizeById(id, size) {
  const db = getDBReference();
  const collection = db.collection('photos.files');
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { "metadata.size": size }}
    );
    return result.matchedCount > 0;
  }
};
exports.updatePhotoSizeById = updatePhotoSizeById

async function saveThumbFile(thumb) {
  return new Promise((resolve, reject) => {
    const db = getDBReference();
    const bucket = new GridFSBucket(db, { bucketName: 'thumbs' });

    const metadata = {
      contentType: 'image/jpeg'
    };

    const uploadStream = bucket.openUploadStream(
      thumb.filename,
      { metadata: metadata }
    );

    fs.createReadStream(thumb.path)
      .pipe(uploadStream)
      .on('error', (err) => {
        reject(err);
      })
      .on('finish', (result) => {
        resolve(result._id);
      });
  });
};
exports.saveThumbFile = saveThumbFile

async function getThumbInfoById(id) {
  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'thumbs' });

  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await bucket
      .find({ _id: new ObjectId(id) })
      .toArray();
    return results[0];
  }
};
exports.getThumbInfoById = getThumbInfoById

async function getThumbDownloadStreamByFilename(filename) {
  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'thumbs' });
  return bucket.openDownloadStreamByName(filename);
};
exports.getThumbDownloadStreamByFilename = getThumbDownloadStreamByFilename

