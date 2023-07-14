const {
  S3Client,
  CopyObjectCommand,
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

exports.edit_occasion_name = async (req, res) => {
  const bucket_name = process.env.AWS_BUCKET;
  const oldPath = req.body.path;
  const newPath = req.body.new_path;
  const newOccasionName = req.body.new_occasion_name;

  const folderType = oldPath.split("/")[0];

  // Download the index.json file
  const getParams = {
    Bucket: bucket_name,
    Key: `${folderType}/index.json`,
  };

  const getObjectResponse = await client.send(new GetObjectCommand(getParams));
  const bodyContents = await streamToString(getObjectResponse.Body);
  const index = JSON.parse(bodyContents);

  // Update the index.json
  const oldOccasion = oldPath.split("/")[1];
  const newOccasion = newPath.split("/")[1];

  if (index[oldOccasion] && !index[newOccasion]) {
    index[newOccasion] = newOccasionName;
    delete index[oldOccasion];

    // Upload the modified index.json file
    const putParams = {
      Bucket: bucket_name,
      Key: `${folderType}/index.json`,
      Body: JSON.stringify(index),
      ACL: "public-read", // to make file public
    };

    await client.send(new PutObjectCommand(putParams));

    // Rename the folder
    await renameFolder(bucket_name, oldPath, newPath);

    res.status(200).send({
      success: true,
      message: "Folder and index modification completed",
    });
  } else if (!index[oldOccasion]) {
    res
      .status(404)
      .send({ success: false, message: "Original occasion not found" });
  } else {
    res
      .status(400)
      .send({ success: false, message: "New occasion name already exists" });
  }
};

async function renameFolder(bucket, oldFolderPath, newFolderPath) {
  const listParams = {
    Bucket: bucket,
    Prefix: oldFolderPath,
  };

  const listResponse = await client.send(new ListObjectsV2Command(listParams));
  const copyPromises = [];
  const deleteParams = {
    Bucket: bucket,
    Delete: {
      Objects: [],
      Quiet: false,
    },
  };

  for (const item of listResponse.Contents) {
    const copyParams = {
      Bucket: bucket,
      CopySource: `${bucket}/${item.Key}`,
      Key: item.Key.replace(oldFolderPath, newFolderPath),
    };

    copyPromises.push(client.send(new CopyObjectCommand(copyParams)));
    deleteParams.Delete.Objects.push({ Key: item.Key });
  }

  await Promise.all(copyPromises);
  await client.send(new DeleteObjectsCommand(deleteParams));
}
