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

async function streamToString(stream) {
  let chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

async function fetchJsonFile(key) {
  const data = await client.send(
    new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: key,
    })
  );
  var buffer = data.Body;
  var json = JSON.parse(await streamToString(buffer));
  return json;
}

exports.getIndexAndKeyJson = async (req, res) => {
  try {
    console.log("Bucket Name: " + process.env.AWS_BUCKET);
    let output_json_file = {
      concert: { index: {}, keys: {} },
      streetlandscape: { index: {}, keys: {} },
    };

    for (let phototype of Object.keys(output_json_file)) {
      //Grabs initial index concert and street json files
      output_json_file[phototype]["index"] = await fetchJsonFile(
        `${phototype}/index.json`
      );

      //Return a list of the object keys inside of output_json_file["concert"]["index"]
      // This is just a list of occasions
      var concert_keys = Object.keys(output_json_file[phototype]["index"]);

      //Loop through each key in concert_keys
      // output_json_file : {keys: {occasion: [<list of photo keys>]}}
      for (let occasion of concert_keys) {
        try {
          //For each key, fetch the json file from S3
          output_json_file[phototype]["keys"][occasion] = await fetchJsonFile(
            `${phototype}/${occasion}/keys.json`
          );
        } catch (err) {
          // If there's an error (the file is not found), assign an empty array
          output_json_file[phototype]["keys"][occasion] = [];
        }
      }
    }
    // console.log(concert_keys);
    res
      .status(200)
      .send({ message: "success", data: output_json_file, success: true });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .send({ message: "There has been an error", success: false });
  }
};
