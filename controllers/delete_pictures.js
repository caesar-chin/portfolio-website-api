require("dotenv").config();

const {
  S3Client,
  DeleteObjectsCommand,
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

exports.delete_files = async (req, res) => {
  const bucket_name = process.env.AWS_BUCKET;
  let keys_to_delete_array = req.body.keys || [];

  try {
    for (const keys_to_delete_object of keys_to_delete_array) {
      for (const occasion_name in keys_to_delete_object) {
        let keys_to_delete = keys_to_delete_object[occasion_name];

        // Delete the specified files
        const deleteParams = {
          Bucket: bucket_name,
          Delete: {
            Objects: keys_to_delete.flatMap((key) => {
              const webp_key = key.split(".")[0] + ".webp";

              return [
                { Key: occasion_name + "/original/" + key },
                { Key: occasion_name + "/webp/" + webp_key },
              ];
            }),
            Quiet: false,
          },
        };

        const deleteResponse = await client.send(
          new DeleteObjectsCommand(deleteParams)
        );
        console.log(deleteResponse);

        // Now, let's modify the keys.json file
        // Download the keys.json file
        const getParams = {
          Bucket: bucket_name,
          Key: occasion_name + "/keys.json",
        };

        const getObjectResponse = await client.send(
          new GetObjectCommand(getParams)
        );
        const bodyContents = await streamToString(getObjectResponse.Body);
        const keys = JSON.parse(bodyContents);

        // Modify the keys object
        for (const keyToDelete of keys_to_delete) {
          const index = keys.findIndex(
            (item) => Object.keys(item)[0] === keyToDelete
          );
          if (index !== -1) {
            keys.splice(index, 1);
          }
        }

        // Upload the keys.json file
        const putParams = {
          Bucket: bucket_name,
          Key: occasion_name + "/keys.json",
          Body: JSON.stringify(keys),
        };

        const putObjectResponse = await client.send(
          new PutObjectCommand(putParams)
        );
        console.log(putObjectResponse);
      }
    }

    res.status(200).send({ message: "Deletion operation completed" });
  } catch (err) {
    console.log(err);
    return res
      .status(400)
      .send({ message: "Error deleting files", error: err });
  }
};
