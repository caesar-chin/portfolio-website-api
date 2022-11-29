require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

//parse requests of application/json
app.use(express.json());

//parse request of application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

require("./routes/routes.js")(app);

const PORT = process.env.PORT;

app.get("/", (req, res) => {
  res.json({ message: "Hello!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
