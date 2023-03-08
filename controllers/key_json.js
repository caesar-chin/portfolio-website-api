const { ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

// Define a function to check if an image file already exists in S3 bucket with same key
async function checkIfExists(client, key) {
  // Create head parameters
  const headParams = {
    Bucket: "caesar-chin-photography",
    Key: key,
  };

  // Check if object exists using promise method
  try {
    const response = await client.send(new ListObjectsV2Command(headParams));
    const objects = response.Contents;
    for (let obj of objects) {
      if (obj.Key === key) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.log(err);
  }
}

async function uploadToS3(client, file, key) {
  // Create upload parameters
  const uploadParams = {
    Bucket: "caesar-chin-photography",
    Key: key,
    Body: file,
    ContentType: "application/json",
    ACL: "public-read",
  };

  const upload = new Upload({
    client: client,
    params: uploadParams,
  });

  // Upload file to S3 bucket using promise methocd
  await upload
    .done()
    .then((result) => {
      return result.Location;
    })
    .catch((err) => {
      console.log(err);
    });
}

// Keys for photos
// [
//   {successfulOriginalUploads[i].fileName: {
//     "occasion" : body occasion,
//     "date": body date,
//     artist: body artist,
//     venue: body venue,
//     caption: body caption,
//     date: body date,
//     type: body type,
//     url: successfulOriginalUploads[i].url
//   }},
// ]
exports.add_key_json = async (
  client,
  key,
  successfulOriginalUploads,
  request_body
) => {
  try {
    result = await checkIfExists(client, key);
    if (result) {
      console.log("Key.json File already exists, downloading it...");
      await client
        .send(
          new getObjectCommand({ Bucket: "caesar-chin-photography", Key: key })
        )
        .then(async (data) => {
          var buffer = data.Body;
          var json_array = JSON.parse(buffer.toString());
          var new_obj = [];

          successfulOriginalUploads.forEach((photo) => {
            var photo_obj = {
              [photo.fileName]: {
                occasion: str(request_body.occasion),
                type: str(request_body.type),
                date: str(request_body.date),
                artist: str(request_body.artist),
                venue: str(request_body.venue),
                caption: str(request_body.caption),
                url: str(photo.url),
              },
            };
            new_obj.push(photo_obj);
          });

          json_array = json.concat(new_obj);

          var newBuffer = Buffer.from(JSON.stringify(json_array));

          await uploadToS3(client, newBuffer, key);

          return { success: true };
        })
        .catch((error) => {
          console.log(error);
          res.status(400).send({ message: "Error downloading JSON file." });
          return false;
        });
    } else {
      console.log("JSON File does not exist, creating it...");
      var new_obj = [];

      successfulOriginalUploads.forEach((photo) => {
        var photo_obj = {
          [photo.fileName]: {
            occasion: request_body.occasion,
            date: request_body.date,
            artist: request_body.artist,
            venue: request_body.venue,
            caption: request_body.caption,
            type: request_body.type,
            url: photo.url,
          },
        };
        new_obj.push(photo_obj);
      });

      var newBuffer = Buffer.from(JSON.stringify(new_obj));

      await uploadToS3(client, newBuffer, key);

      return { success: true };
    }
  } catch (error) {
    console.log(error);
    res.status(400).send({ message: "Error uploading JSON file." });
    return false;
  }
};

// List of occasions
exports.add_index_json = async (client, key, occasion, name) => {
  try {
    result = await checkIfExists(client, key);
    if (result) {
      console.log("Index.json File already exists, downloading it...");
      await client
        .send(
          new getObjectCommand({
            Bucket: "caesar-chin-photography",
            Key: key,
          })
        )
        .then(async (data) => {
          var buffer = data.Body;
          var json = JSON.parse(buffer.toString());
          var new_obj = { [occasion]: name };

          Object.assign(json, new_obj);

          var newBuffer = Buffer.from(JSON.stringify(json));

          await uploadToS3(client, newBuffer, key);

          return { success: true };
        })
        .catch((error) => {
          console.log(error);
          res.status(400).send({ message: "Error downloading JSON file." });
          return false;
        });
    } else {
      console.log("JSON File does not exist, creating it...");
      var json = { [occasion]: name };
      var buffer = Buffer.from(JSON.stringify(json));

      await uploadToS3(client, buffer, key);

      return { success: true };
    }
  } catch (error) {
    console.log(error);
  }
};
