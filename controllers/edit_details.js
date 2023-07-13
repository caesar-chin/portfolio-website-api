require("dotenv").config();

const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");

const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

const client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS,
    secretAccessKey: process.env.AWS_SECRET,
  },
});

exports.edit_details = async (req, res) => {
  const bucket_name = process.env.AWS_BUCKET;

  let paths = req.body.path; // this should be an object of '/folder/occasion/file_name': {data}

  // Validate paths
  if (!paths || typeof paths !== "object") {
    return res
      .status(400)
      .send({ success: false, message: "Paths object is missing" });
  }

  try {
    for (let fullPath in paths) {
      // Extract directory path and file name from full path
      const pathParts = fullPath.split("/");
      const fileName = pathParts.pop();
      const dirPath = pathParts.join("/") + "/";

      // Get the keys.json file
      const getParams = {
        Bucket: bucket_name,
        Key: dirPath + "keys.json",
      };

      const getObjectResponse = await client.send(
        new GetObjectCommand(getParams)
      );
      const bodyContents = await streamToString(getObjectResponse.Body);
      const keys = JSON.parse(bodyContents);

      // Update the keys with the new data
      for (let keyObj of keys) {
        let keyFileName = Object.keys(keyObj)[0];
        if (keyFileName === fileName && paths[fullPath]) {
          keyObj[keyFileName].artist =
            paths[fullPath].artist || keyObj[keyFileName].artist;
          keyObj[keyFileName].venue =
            paths[fullPath].venue || keyObj[keyFileName].venue;
          keyObj[keyFileName].caption =
            paths[fullPath].caption || keyObj[keyFileName].caption;
          keyObj[keyFileName].date =
            paths[fullPath].date || keyObj[keyFileName].date;
        }
      }

      // Upload the keys.json file with updated data
      const putParams = {
        Bucket: bucket_name,
        Key: dirPath + "keys.json",
        Body: JSON.stringify(keys),
      };

      const putObjectResponse = await client.send(
        new PutObjectCommand(putParams)
      );
      console.log(putObjectResponse);
    }

    res.status(200).send({
      success: true,
      message: "keys.json files modification completed",
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send({
      success: false,
      message: "Error modifying keys.json files",
      error: err,
    });
  }
};
