require("dotenv").config();

// import individual service
const {
  S3Client,
  ListObjectsV2Command,
  getObjectCommand,
} = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

const { add_key_json, add_index_json } = require("./key_json.js");

const JSZip = require("jszip");

const client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS,
    secretAccessKey: process.env.AWS_SECRET,
  },
});

const sharp = require("sharp");

// Define a function to convert an image file to webp format using sharp library
async function convertToWebp(file) {
  // Convert the file buffer to webp format and return it as a new buffer
  const webpBuffer = await sharp(file.buffer)
    .resize({
      // resize options
      width: 1920, // set width to 1920px
      fit: "contain", // preserve aspect ratio
    })
    .webp()
    .toBuffer();
  const stream = {
    buffer: webpBuffer,
    mimetype: "image/webp",
  };

  return stream;
}

// Define a function to upload an image file to S3 bucket
async function uploadToS3(file, key) {
  // Create upload parameters
  const uploadParams = {
    Bucket: "caesar-chin-photography",
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
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

// Define a function to check if an image file already exists in S3 bucket with same key
async function checkIfExists(key) {
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

exports.upload_s3 = async (req, res) => {
  const type = req.body.type;
  const occasion = req.body.occasion;
  const files = req.files;

  // Initialize an array of skipped files
  const skippedFiles = [];
  const successfulOriginalUploads = [];
  const successfulWebpUploads = [];

  var zipfileKey = `${type}/${occasion}/${occasion}.zip`;
  var zipFileName = `${occasion}.zip`;
  var zipFile = new JSZip();

  var zipFileLocation = "";

  console.log("Finding zip file");
  try {
    result = await checkIfExists(zipfileKey);
    if (result) {
      console.log(`File ${zipfileKey} already exists in S3 bucket.`);

      await client
        .send(
          new getObjectCommand({
            Bucket: "caesar-chin-photography",
            Key: zipfileKey,
          })
        )
        .then(async (data) => {
          var readStream = data.Body;
          console.log(readStream);
          return JSZip.loadAsync(readStream)
            .then((zip) => {
              zipFile = zip;
            })
            .catch((err) => {
              console.log(err);

              return res.status(400).send({
                message: "There has been an error reading the zip file",
              });
            });
        })
        .catch((error) => {
          console.log(error);
          res
            .status(400)
            .send({ message: "There has been an error getting the zip file" });
        });
    } else {
      console.log(
        `File ${zipfileKey} does not exist in S3 bucket. \nCreating new zip file.`
      );
    }
  } catch (error) {
    console.log(
      "Zip file already exists in S3 bucket, or there has been an error"
    );
  }

  // Loop through each file
  for (let file of files) {
    // Get the original key from the file name
    const originalKey = `${type}/${occasion}/original/${file.originalname}`;

    // Check if original file already exists in S3 bucket with same key
    try {
      result = await checkIfExists(originalKey);
      if (result) {
        console.log(`File ${file.originalname} already exists in S3 bucket.`);
        skippedFiles.push(file.originalname);
      } else {
        // Upload original file to S3 bucket under original object
        try {
          await uploadToS3(file, originalKey);
          var originalUrl = `https://caesar-chin-photography.s3.us-east-1.amazonaws.com/${originalKey}`;
          console.log(`File ${file.originalname} uploaded successfully.`);
          successfulOriginalUploads.push({
            fileName: file.originalname,
            url: originalUrl,
          });
        } catch (err) {
          console.error(`Error uploading ${file.originalname}: ${err.message}`);
          continue;
        }
      }
    } catch (err) {
      console.log(`File ${file.originalname} does not exist in S3 bucket.`);
    }

    // Convert original file to webp format
    try {
      // Get the webp key from the original key by replacing extension
      var webpfilename = file.originalname.replace(
        /\.(png|jpg|jpeg)$/i,
        ".webp"
      );
      webpKey = `${type}/${occasion}/webp/${webpfilename}`;

      // Check if webp file already exists in S3 bucket with same key
      try {
        result = await checkIfExists(webpKey);
        if (result) {
          console.log(`File ${file.originalname} already exists in S3 bucket.`);
          skippedFiles.push(webpKey);
          continue;
        } else {
          try {
            const webpFile = await convertToWebp(file);
            console.log(`File ${file.originalname} converted successfully.`);
            // Upload webp file to S3 bucket under webp object
            await uploadToS3(webpFile, webpKey);
            var webpUrl = `https://caesar-chin-photography.s3.us-east-1.amazonaws.com/${webpKey}`;
            console.log(
              `WebP version of ${file.originalname} uploaded successfully.`
            );
            successfulWebpUploads.push({
              fileName: webpfilename,
              url: webpUrl,
            });
            zipFile.file(file.originalname, file.buffer);
            console.log(`File ${file.originalname} added to zip file.`);
          } catch (err) {
            console.error(
              `Error converting ${file.originalname}: ${err.message}`
            );
            continue;
          }
        }
      } catch (err) {
        console.log(`File ${file.originalname} does not exist in S3 bucket.`);
      }
    } catch (err) {
      console.error(
        `Error converting or uploading WebP version of ${file.originalname}: ${err.message}`
      );
      continue;
    }
  }

  // Upload zip file to S3 bucket
  try {
    const zipFileBuffer = await zipFile.generateAsync({ type: "nodebuffer" });
    const zipFileBufferType = "application/zip";

    // Create upload parameters
    const uploadParams = {
      Bucket: "caesar-chin-photography",
      Key: zipfileKey,
      Body: zipFileBuffer,
      ContentType: zipFileBufferType,
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
        console.log(`Zip file ${zipFileName} uploaded successfully.`);
        zipFileLocation = result.Location;
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (err) {
    console.log(err);
    res
      .status(400)
      .send({ message: "There has been an error uploading zip file" });
  }

  if (
    add_index_json(client, `${type}/index.json`, occasion, req.body.caption) &&
    add_key_json(
      client,
      `${type}/${occasion}/keys.json`,
      successfulOriginalUploads,
      req.body
    )
  ) {
    console.log("Index and key files updated successfully.");
  } else {
    console.log("There has been an error updating index and key files.");
    return res
      .status(400)
      .send({ message: "There has been an error updating index" });
  }

  return res.status(200).json({
    success: 200,
    skippedFiles: skippedFiles,
    successfulOriginalUploads: successfulOriginalUploads,
    successfulWebpUploads: successfulWebpUploads,
    zipFileLocation: zipFileLocation,
  });
};
