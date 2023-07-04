const multer = require("multer");
const { ensureAuthenticated } = require("../middleware");

module.exports = (app, passport) => {
  //controller functions are objects (lowercase name)

  const controller = require("../controllers/send_email.js");
  const upload_controller = require("../controllers/upload.js");
  const auth_controller = require("../controllers/auth.js");
  const dashboard_controller = require("../controllers/dashboard.js");
  const put_list = require("../controllers/put_list.js");

  const upload = multer({ storage: multer.memoryStorage() });

  var router = require("express").Router();

  router.post("/send_email", controller.send_email);

  router.get("/test_aws_s3", controller.test_s3);

  router.post(
    "/upload",
    // ensureAuthenticated,
    upload.any("files"),
    upload_controller.upload_s3
  );

  router.get(
    "/get_index_and_key_json",
    dashboard_controller.getIndexAndKeyJson
  );

  router.get("/auth/github", auth_controller.auth_github(passport));

  router.get(
    "/auth/github/callback",
    auth_controller.auth_github_callback(passport)
  );

  router.get("/logout", auth_controller.github_logout);

  router.get(
    "/test_cookies",
    ensureAuthenticated,
    auth_controller.test_cookies
  );

  router.put("/add_occasion", put_list.add_new_occasion);

  app.use("/", router);
};
