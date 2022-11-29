module.exports = (app) => {
  //controller functions are objects (lowercase name)
  const controller = require("../controllers/controller.js");

  var router = require("express").Router();

  router.post("/send_email", controller.send_email);

  app.use("/", router);
};
