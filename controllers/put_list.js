require("dotenv").config();
const { modify_string } = require("../helper/modify_string.js");

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

// Define a function to upload an image file to S3 bucket
async function uploadToS3(file, key) {
  // Create upload parameters
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET,
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

exports.add_new_occasion = async (req, res) => {
  const type = req.body.type;
  const occasion = req.body.occasion;
  var occasion_key = modify_string(req.body.occasion);

  // Check if occasion already exists
  const key = `${type}/${occasion_key}/`;
  const exists = await checkIfExists(key);
  if (exists) {
    res
      .status(400)
      .send({ success: false, message: "Occasion already exists" });
    return;
  }

  //Using this variable to download the index.json file and add occasion into the file
  //The file looks like this: {"weyes_blood_brooklyn_steel":"Weyes Blood, Brooklyn Steel"}
  //req.body.occasion will look more like "Weyes Blood, Brooklyn Steel", so we will need to get rid of every space and punctuation and add a underscore and make that the key
  var jsonfilekey = `${type}/index.json`;

  // Download index.json file from S3 bucket
  const downloadParams = {
    Bucket: process.env.AWS_BUCKET,
    Key: jsonfilekey,
  };

  var jsonfile;
  try {
    const response = await client.send(new GetObjectCommand(downloadParams));
    const stream = response.Body;
    jsonfile = await streamToBuffer(stream);
  } catch (err) {
    console.log(err);
  }

  console.log(jsonfile.toString());

  // Add occasion to json file
  jsonfile = JSON.parse(jsonfile.toString());

  console.log("Adding new occasion to json file");

  // console.log(occasion_key);
  jsonfile[`${occasion_key}`] = req.body.occasion;

  // Upload updated json file to S3 bucket and adds empty folder in s3 using occasion_key
  // Upload updated json file to S3 bucket and adds empty folder in s3 using occasion_key
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET,
    Key: jsonfilekey,
    Body: JSON.stringify(jsonfile),
    ContentType: "application/json",
    ACL: "public-read",
  };

  const upload = new Upload({
    client: client,
    params: uploadParams,
  });

  await upload
    .done()
    .then((result) => {
      return result.Location;
    })
    .catch((err) => {
      console.log(err);
    });

  // Upload empty folder to S3 bucket
  const uploadParams2 = {
    Bucket: process.env.AWS_BUCKET,
    Key: key,
    Body: "",
    ContentType: "application/json",
    ACL: "public-read",
  };

  const upload2 = new Upload({
    client: client,
    params: uploadParams2,
  });

  await upload2
    .done()
    .then((result) => {
      return result.Location;
    })
    .catch((err) => {
      console.log(err);
    });

  console.log("New occasion added");

  res.status(200).send({
    success: true,
    message: "New occasion added",
    occasion_key: occasion_key,
    occasion_name: req.body.occasion,
  });
};

exports.add_new_photo = async (req, res) => {};
