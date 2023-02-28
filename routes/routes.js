const multer = require("multer");

module.exports = (app) => {
  //controller functions are objects (lowercase name)

  const controller = require("../controllers/controller.js");
  const upload_controller = require("../controllers/upload.js")

  const upload = multer({ storage: multer.memoryStorage() });

  var router = require("express").Router();

  router.post("/send_email", controller.send_email);

  router.get("/test_aws_s3", controller.test_s3);

  router.post("/upload", upload.any("files"), upload_controller.upload_s3);

  app.use("/", router);
};
