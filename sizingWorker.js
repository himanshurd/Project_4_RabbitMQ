
const sizeOf = require('image-size');

const { connectToDB } = require('./lib/mongo');
const { connectToRabbitMQ, getChannel } = require('./lib/rabbitmq');
const {
  getDownloadStreamById,
  updatePhotoSizeById
} = require('./models/photo');

async function main() {
    await connectToRabbitMQ('photos')
      .then(() => {
        const channel = getChannel();
        channel.consume('photos', (msg) => {
          if (msg) {
            const id = msg.content.toString();
            const downloadStream = getDownloadStreamById(id);
            const photoData = [];
            downloadStream.on('data', (data) => {
              photoData.push(data);
            });
            downloadStream.on('end', async () => {
              const dimensions = sizeOf(Buffer.concat(photoData));
              console.log("== dimensions:", dimensions);
              const result = await updatePhotoSizeById(id, dimensions);
              if (result) {
                console.log("== Size updated for photo:", id);
              }
            });
          }
          channel.ack(msg);
        });
      })
      .catch((err) => {
        console.error(err);
      });
  }
  
  connectToDB(main);
  