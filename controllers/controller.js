require("dotenv").config();

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
    to: "caesarportfolio1234@gmail.com",
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
