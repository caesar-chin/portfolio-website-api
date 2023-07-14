require("dotenv").config();

const {
  S3Client,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");

const JSZip = require("jszip");

const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
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
          ACL: 'public-read' // to make file public
        };

        const putObjectResponse = await client.send(
          new PutObjectCommand(putParams)
        );
        console.log(putObjectResponse);

        // Download the zip file
        const getZipParams = {
          Bucket: bucket_name,
          Key: occasion_name + "/" + occasion_name.split("/")[1] + ".zip",
        };
        const getZipResponse = await client.send(
          new GetObjectCommand(getZipParams)
        );
        const zipContents = await streamToBuffer(getZipResponse.Body);
        const zip = new JSZip();
        const zipData = await zip.loadAsync(new Uint8Array(zipContents));

        // Remove the unwanted files from the zip
        for (const keyToDelete of keys_to_delete) {
          zipData.remove(keyToDelete);
        }

        // Generate the new zip file content
        const newZipContent = await zipData.generateAsync({
          type: "nodebuffer",
        });

        // Upload the new zip file
        const putZipParams = {
          Bucket: bucket_name,
          Key: occasion_name + "/" + occasion_name.split("/")[1] + ".zip",
          Body: newZipContent,
          ACL: "public-read", // to make file public
        };
        await client.send(new PutObjectCommand(putZipParams));
      }
    }

    res
      .status(200)
      .send({ success: true, message: "Deletion operation completed" });
  } catch (err) {
    console.log(err);
    return res
      .status(400)
      .send({ message: "Error deleting files", error: err, success: false });
  }
};
