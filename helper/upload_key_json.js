const {
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

// Define a function to check if an image file already exists in S3 bucket with same key
async function checkIfExists(client, key) {
  // Create head parameters
  const headParams = {
    Bucket: process.env.AWS_BUCKET,
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
    Bucket: process.env.AWS_BUCKET,
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
  try {
    const result = await upload.done();
    console.log(`File uploaded successfully. ETag: ${result.ETag}`);
    return result.ETag;
  } catch (error) {
    console.log(`Error uploading file: ${error}`);
  }
}

async function streamToString(stream) {
  let chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
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
  successfulWebpUploads,
  metadata,
  occasion,
  type
) => {
  try {
    let result = await checkIfExists(client, key);
    let new_obj = [];
    if (result) {
      console.log("Key.json File already exists, downloading it...");
      const data = await client.send(
        new GetObjectCommand({ Bucket: process.env.AWS_BUCKET, Key: key })
      );
      let buffer = data.Body;
      let json = JSON.parse(await streamToString(buffer));

      new_obj = metadata.map((photoData, index) => {
        const fileName = Object.keys(photoData)[0]; // get the file name
        const photo = successfulOriginalUploads.find(
          (photo) => photo.fileName === fileName
        );
        if (photo) {
          return {
            [fileName]: {
              ...photoData[fileName],
              occasion: occasion,
              type: type,
              url: photo.url,
              webp_url: successfulWebpUploads[index]?.url,
            },
          };
        }
        return photoData;
      });

      json = [...json, ...new_obj];

      const newBuffer = Buffer.from(JSON.stringify(json));

      await uploadToS3(client, newBuffer, key);
    } else {
      console.log("JSON File does not exist, creating it...");

      new_obj = metadata.map((photoData, index) => {
        const fileName = Object.keys(photoData)[0]; // get the file name
        const photo = successfulOriginalUploads.find(
          (photo) => photo.fileName === fileName
        );
        if (photo) {
          return {
            [fileName]: {
              ...photoData[fileName],
              occasion: occasion,
              type: type,
              url: photo.url,
              webp_url: successfulWebpUploads[index]?.url,
            },
          };
        }
        return photoData;
      });

      const newBuffer = Buffer.from(JSON.stringify(new_obj));

      await uploadToS3(client, newBuffer, key);

      console.log("JSON File created successfully.");
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// List of occasions
exports.add_index_json = async (client, key, occasion, name) => {
  try {
    var if_success = false;
    var result = await checkIfExists(client, key);
    if (result) {
      console.log("Index.json File already exists, downloading it...");
      await client
        .send(
          new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: key,
          })
        )
        .then(async (data) => {
          var buffer = data.Body;
          var json = JSON.parse(await streamToString(buffer));

          console.log("Parsing through JSON file and converting...");

          var new_obj = { [occasion]: name };
          Object.assign(json, new_obj);

          var newBuffer = Buffer.from(JSON.stringify(json));

          console.log("Uploading to S3...");

          var etag = await uploadToS3(client, newBuffer, key);

          if (etag) {
            console.log("JSON File updated successfully.");
            return (if_success = true);
          } else {
            console.log("JSON File failed to update.");
            return (if_success = false);
          }
        })
        .catch((error) => {
          console.log(error);
          return (if_success = false);
        });
    } else {
      console.log("JSON File does not exist, creating it...");
      var json = { [occasion]: name };
      var buffer = Buffer.from(JSON.stringify(json));

      await uploadToS3(client, buffer, key);

      console.log("JSON File created successfully.");
      return (if_success = true);
    }
    return if_success;
  } catch (error) {
    console.log(error);
    return false;
  }
};
