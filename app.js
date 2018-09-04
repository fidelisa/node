/*jslint node: true */
'use strict';

var
  express = require('express'),
  app = express(),
  http = require('http').Server(app),
  io = require('socket.io'),
  habitat = require('habitat');

habitat.load();

var
  env = new habitat('fidelisa'),
  closeToMe = require('./fidelisa/closetome.js')(env),
  images = require('./fidelisa/images.js')(env),

  debug = require('debug')('app');

app.set('views', './views');
app.set('view engine', 'pug');

// config routes
app.use('/api/customers/closetome', function(req, res, next) {
  var id = req.headers ? req.headers["fidelisa_apiuser"] : req.param("id", "");
  closeToMe.query(id, function(result) {
    res.json({ customers : result });
  })
});

app.use('/api/images/:id', function(req, res, next) {
  var id = req.params.id;  
  images.query(id, req.query, function(result) {
    if (result) {
      res.type(result.content_type);
      res.end(result.image, 'binary');
    } else {
      res.json({ ok: "ok" });
    }    
  })
});

app.use('/images/:id', function(req, res, next) {
  res.render('image', { image: '/api'+req.originalUrl });
});


app.use('/test', express.static('web-test'));

app.use('/health', function(req, res, next) {
  res.json({ health : "OK" });
});

app.use('/', function(req, res, next) {
  res.json({ });
});


// start server
var port = env.get('port') || 5672;

var server = app.listen(port, function () {

  var host = server.address().address;
  var port = server.address().port;

  debug('http://127.0.0.1:'+port);

});

closeToMe.socket(server);
