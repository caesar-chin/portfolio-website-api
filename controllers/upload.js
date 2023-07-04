require("dotenv").config();

// import individual service
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

const {
  add_key_json,
  add_index_json,
} = require("../helper/upload_key_json.js");

const JSZip = require("jszip");

const client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS,
    secretAccessKey: process.env.AWS_SECRET,
  },
});

const sharp = require("sharp");

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

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
  occasionObject = JSON.parse(req.body.occasionObject);
  metadata = JSON.parse(req.body.metadata);

  const type = occasionObject.selectedOccasionType;
  const occasion = occasionObject.selectedOccasionKey;

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
    const result = await checkIfExists(zipfileKey);

    if (result) {
      console.log(`File ${zipfileKey} already exists in S3 bucket.`);

      const headParams = {
        Bucket: "caesar-chin-photography",
        Key: zipfileKey,
      };

      const objectCommand = new GetObjectCommand(headParams);

      try {
        const data = await client.send(objectCommand);
        const readStream = data.Body;

        try {
          const buffer = await streamToBuffer(readStream);
          zipFile = await JSZip.loadAsync(buffer);
        } catch (error) {
          console.log(error);
          return res.status(400).send({
            message: "There has been an error reading the zip file",
          });
        }
      } catch (error) {
        console.log(error);
        return res
          .status(400)
          .send({ message: "There has been an error getting the zip file" });
      }
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

    try {
      const exists = await checkIfExists(originalKey);

      if (exists) {
        console.log(`File ${file.originalname} already exists in S3 bucket.`);
        skippedFiles.push(file.originalname);
        continue;
      }

      try {
        await uploadToS3(file, originalKey);
      } catch (err) {
        console.error(`Error uploading ${file.originalname}: ${err.message}`);
        continue;
      }

      const originalUrl = `https://caesar-chin-photography.s3.us-east-1.amazonaws.com/${originalKey}`;
      console.log(`File ${file.originalname} uploaded successfully.`);
      successfulOriginalUploads.push({
        fileName: file.originalname,
        url: originalUrl,
      });
    } catch (err) {
      console.log(`Failed to handle original file ${file.originalname}.`);
      continue;
    }

    // Convert original file to webp format
    const webpFilename = file.originalname.replace(
      /\.(png|jpg|jpeg)$/i,
      ".webp"
    );
    const webpKey = `${type}/${occasion}/webp/${webpFilename}`;

    try {
      const exists = await checkIfExists(webpKey);

      if (exists) {
        console.log(`File ${webpFilename} already exists in S3 bucket.`);
        skippedFiles.push(webpFilename);
        continue;
      }

      let webpFile;

      try {
        webpFile = await convertToWebp(file);
      } catch (err) {
        console.error(`Error converting ${file.originalname}: ${err.message}`);
        continue;
      }

      console.log(`File ${file.originalname} converted successfully.`);

      try {
        await uploadToS3(webpFile, webpKey);
      } catch (err) {
        console.error(
          `Error uploading converted ${file.originalname}: ${err.message}`
        );
        continue;
      }

      const webpUrl = `https://caesar-chin-photography.s3.us-east-1.amazonaws.com/${webpKey}`;
      console.log(
        `WebP version of ${file.originalname} uploaded successfully.`
      );
      successfulWebpUploads.push({
        fileName: webpFilename,
        url: webpUrl,
      });

      zipFile.file(file.originalname, file.buffer);
      console.log(`File ${file.originalname} added to zip file.`);
    } catch (err) {
      console.error(
        `Failed to handle webp conversion or upload for ${file.originalname}.`
      );
      continue;
    }
  }

  // Upload zip file to S3 bucket
  try {
    const zipFileBuffer = await zipFile.generateAsync({ type: "nodebuffer" });
    const zipFileBufferType = "application/zip";
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
    const result = await upload.done();
    console.log(`Zip file ${zipFileName} uploaded successfully.`);
    zipFileLocation = result.Location;
  } catch (err) {
    console.log(err);
    return res
      .status(400)
      .send({ message: "There has been an error uploading zip file" });
  }

  // var result = await add_index_json(
  //   client,
  //   `${type}/index.json`,
  //   occasion,
  //   req.body.caption
  // );

  if (
    await add_key_json(
      client,
      `${type}/${occasion}/keys.json`,
      successfulOriginalUploads,
      successfulWebpUploads,
      metadata,
      occasion,
      type
    )
  ) {
    console.log("Key file updated successfully.");
  } else {
    console.log("There has been an error updating key files.");
    return res
      .status(400)
      .send({ message: "There has been an error updating key" });
  }

  console.log("Finished uploading files.");

  return res.status(200).json({
    success: 200,
    skippedFiles: skippedFiles,
    successfulOriginalUploads: successfulOriginalUploads,
    successfulWebpUploads: successfulWebpUploads,
    zipFileLocation: zipFileLocation,
  });
};
