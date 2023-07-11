require("dotenv").config();

// import individual service
const { S3Client, ListObjectsCommand } = require("@aws-sdk/client-s3");

const client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS,
    secretAccessKey: process.env.AWS_SECRET,
  },
});

const nodemailer = require("nodemailer");

exports.send_email = (req, res) => {
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  let mailOptions = {
    from: req.body.email,
    to: "caesarportfolio1234@gmai l.com",
    subject: `Message from ${req.body.name} via caesarchin.com`,
    html: req.body.message,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      res.status(400).send({
        success: false,
        message: "Error sending email",
      });
      console.log(error);
    } else {
      res.status(200).send({
        success: true,
        message: "Email sent successfully",
      });
      console.log("Email sent: " + info.response);
    }
  });
};

exports.test_s3 = async (req, res) => {
  try {
    const command = new ListObjectsCommand({
      Bucket: process.env.AWS_BUCKET,
      Prefix: "concert/",
    });
    const data = await client.send(command);
    return res.status(200).send(data);
    // process data.
  } catch (error) {
    console.log(error);
    return res.status(400).send({});

    // error handling.
  }
};
