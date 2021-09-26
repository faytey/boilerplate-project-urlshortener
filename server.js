// setup server
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const dns = require('dns');

// setup mongoose
const mongoose = require("mongoose");
const { Schema } = mongoose;

// basic configuration
const port = process.env.PORT || 3000;

// init mongodb connection
mongoose.connect(process.env["DATABASE_URL"], {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// checking connection
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Database connected");
});

// init cors and body parser
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// request logger
app.use(function (req, res, next) {
  var log = req.method + " " + req.path + " - " + req.ip;
  console.log(log);
  next();
});

// serve public as static files
app.use("/public", express.static(`${process.cwd()}/public`));

// serve home page
app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Setup mongoose schema and model
const shortUrlSchema = new Schema({
  originalUrl: String,
  shortUrl: String,
});

const ShortUrl = mongoose.model("ShortUrl", shortUrlSchema);

// function to generate random shorturl
function makeid(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// url shortener api
app.post("/api/shorturl", function (req, res) {
  const urlParam = req.body.url;
  const lookupParam = urlParam.replace(/^https?:\/\//i, "");
  // const options = { all: true };

  dns.lookup(lookupParam, (err, addresses) => {
    if (err) {
      res.json({ error: 'invalid url' });
    } else {
      const newUrl = new ShortUrl({
        originalUrl: urlParam,
        shortUrl: makeid(8),
      });

      newUrl.save(function (err, newUrl) {
        if (err) return console.error(err);
        res.json({
          original_url: newUrl.originalUrl,
          short_url: newUrl.shortUrl,
        });
      });
    }
  });
});

// redirect shorturl api
app.get("/api/shorturl/:short_url", function (req, res) {
  const shorturlParam = req.params.short_url;
  
  const query = ShortUrl.findOne({ shortUrl: shorturlParam });
  query.select("originalUrl");

  query.exec(function (err, shorturl) {
    if (err) return console.error(err);

    if (!shorturl) {
      res.json({ error: 'url not found' });
    } else {
      const redirectUrl = shorturl.originalUrl.match(/^https?:\/\//i) ?
      shorturl.originalUrl :
      "https://" + shorturl.originalUrl;
      res.redirect(301, redirectUrl);
    }
  });
});

// listen to port
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
