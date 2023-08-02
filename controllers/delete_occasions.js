require("dotenv").config();

const {
  S3Client,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
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

exports.delete_occasions = async (req, res) => {
  const bucket_name = process.env.AWS_BUCKET;
  const folders_to_delete = req.body.occasion || [];
  console.log(req.body);
  try {
    for (const folder_to_delete of folders_to_delete) {
      const typeDirectory = folder_to_delete.split("/")[0] + "/";

      const listParams = {
        Bucket: bucket_name,
        Prefix: folder_to_delete,
      };

      const listResponse = await client.send(
        new ListObjectsV2Command(listParams)
      );

      // Check if there are contents in the listResponse before preparing for deletion
      if (listResponse.Contents && listResponse.Contents.length > 0) {
        const deleteParams = {
          Bucket: bucket_name,
          Delete: {
            Objects: listResponse.Contents.map((item) => ({ Key: item.Key })),
            Quiet: false,
          },
        };

        const deleteResponse = await client.send(
          new DeleteObjectsCommand(deleteParams)
        );
        console.log(deleteResponse);
      }

      const getParams = {
        Bucket: bucket_name,
        Key: typeDirectory + "index.json", // Change here
      };

      const getObjectResponse = await client.send(
        new GetObjectCommand(getParams)
      );
      const bodyContents = await streamToString(getObjectResponse.Body);
      const index = JSON.parse(bodyContents);

      delete index[folder_to_delete.split("/")[1]];

      const putParams = {
        Bucket: bucket_name,
        Key: typeDirectory + "index.json", // Change here
        Body: JSON.stringify(index),
        ACL: "public-read", // to make file public
      };

      const putObjectResponse = await client.send(
        new PutObjectCommand(putParams)
      );
      console.log(putObjectResponse);
    }

    res.status(200).send({
      message: "Folder and index modification completed",
      success: true,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send({
      message: "Error deleting folder or modifying index",
      error: err,
      success: false,
    });
  }
};
