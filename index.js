var express = require("express");
var app = express();
var bodyParser = require('body-parser');
var util = require('./src/util.js');
var storage = require('./models/storage.js');
var view = require('./src/view.js');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/assets'));

var showNotFound = (res) => {
    res.status(404).end('404 Not Found');
}



app.get('/', function(req, res) {
   res.sendFile(__dirname + '/views/index.html') ;
});

app.post('/new', function(req, res) {
    var url = req.body.url;
    res.set('Content-Type', 'text/html');

    var showNew = url => {
        res.send(view.render(req.hostname + "/" + url.id));
    };

    storage.addURL(url).then(showNew);
    util.log("[SNIP] User posted to /new", "green");
});

app.get('/:id', function(req, res) {
   var id = req.params.id;
   storage.getURL(id).then(function(url) {
      if(!url) {
          showNotFound(res);
      } else {
          url.increment('visits', {by: 1});
          res.redirect(url.url);
          util.log("[SNIP] User redirected from /" + id, "green");
      }
   });
});

app.get('/:id/api', function(req, res) {
   var id = req.params.id;
   res.header('Content-Type', 'application/json');
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "X-Requested-With");

   storage.getURL(id).then(function(url) {
      if(!url) {
          res.send(JSON.stringify({error: "ENOTFOUND: The requested url is not valid, or is not found"}));
          util.log("[SNIP] ERR: Sending ENOTFOUND error", "yellow");
      } else {
          res.send(JSON.stringify({id: url.id, stats: { visits: url.visits}, snippedURL: req.protocol + '://' + req.hostname + "/" + url.id, longURL: url.url}));
          util.log("[SNIP] Sending API stats for /" + id, "green");
      }
   });
});

app.get('/:id/stats', function(req, res) {
   var id = req.params.id;
   storage.getURL(id).then(function(url) {
      if(!url) {
          showNotFound(res);
      } else {
          res.header('Content-Type', 'text/html');
          res.send(view.renderStats(url.visits));
          util.log("[SNIP] Sending web stats for /" + id, "green");
      }
   });
});

app.get("/shorten/v1", function(req, res) {
    var apiLongUrl = req.query.url;
    res.header('Content-Type', 'application/json');
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var sendApiResponse = url => {
        res.send(JSON.stringify({id: url.id, stats: { visits: url.visits}, snippedURL: req.protocol + '://' + req.hostname + "/" + url.id, longURL: url.url}));
    };

    storage.addURL(apiLongUrl).then(sendApiResponse);
    util.log("[SNIP] User submitted URL to be Snipped via API", "green");
});

app.get("/api/links", function(req, res) {
    res.header('Content-Type', 'application/json');
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    storage.getAllLinks(req).then(function(links) {
      res.end(links);
    });
});


app.listen(process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 3000, process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0", function (req, res) {
    if(process.argv.slice(2)[0] === ("seed" || "SEED")) {
      storage.seedDatabase();
    }
    util.log("[SNIP] Listening", "green");
});
