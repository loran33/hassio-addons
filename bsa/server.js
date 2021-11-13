const express = require("express");
const rp = require("request-promise");
const parseString = require("xml2js").parseString;
const xml2js = require("xml2js");
const multer = require("multer");
const upload = multer();
const fs = require("fs");
const http = require("http");
const https = require("https");
const privateKey = fs.readFileSync("localhost.key", "utf8");
const certificate = fs.readFileSync("localhost.crt", "utf8");
const credentials = { key: privateKey, cert: certificate };

const app = express();
http.createServer(app).listen(3002);
https.createServer(credentials, app).listen(3001);
app.use(express.static("client"));

var HassEnv = false;

if (HassEnv === true) {
  var options = require("./options");
  app.set("options", options);
}
if (HassEnv === false) {
  var options = require("./client/js/options.json");
}

let speakers = [];
let channelName;
let currentVolume;
let source;
let ContentItem;

//discover speakers
var counter = 0;
function speakerDiscovery() {
  var bonjour = require("bonjour")();
  bonjour.find({ type: "soundtouch" }, function(service) {
    var myObj = {
      name: service.name,
      ip: service.referer.address,
      mac: service.txt.mac
    };
    //fill or update array only when necessary
    var objIndex = speakers.findIndex(x => x.name == myObj.name);
    if (objIndex === -1) {
      speakers.push(myObj);
      console.log("new speaker added");
    }
    if (objIndex !== -1) {
      if (speakers[objIndex].ip != myObj.ip) {
        speakers[objIndex].ip = myObj.ip;
        console.log("existing speaker ip updated");
      }
    }
  });
  //initially run bonjour find function every 5 seconds
  if (counter < 10) {
    setTimeout(speakerDiscovery, 5000);
    counter++;
  }
  //after that repeat every 15 minutes in case new speakers are added or their ip changes
  if (counter === 10) {
    setInterval(speakerDiscovery, 900000);
    counter++;
  }
}
speakerDiscovery();

//make speaker-array available to client
app.get("/api/devices", function(req, res) {
  res.status(200).json(speakers);
});

// make user's options available to client
app.get("/api/options", function(req, res) {
  res.status(200).json(options);
});

