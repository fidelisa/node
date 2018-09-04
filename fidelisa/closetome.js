"use strict";
var
  pg = require('pg'),
  url = require('url'),
  debug = require('debug')('closetome');

module.exports = function CloseToMe(env) {
  var connString = env.get('pg');
  debug('Connexion: '+connString)
  return {
    query: function(vendorID, callback) {
      var rows = []
      debug('VendorId'+vendorID);
      if ( !vendorID || vendorID == "" ) {
          callback( rows );
          return
      }

      // get a pg client from the connection pool
      pg.connect(connString, function(err, client, done) {

        if(err) {
          return console.error('error fetching client from pool', err);
        }

        var handleError = function(err) {
          // no error occurred, continue with the request
          if(!err) return false;

          done(client);
          debug(err);
          callback( rows );
          return true;
        };

        var handleEnd = function() {
          callback( rows );
          done();
        }

        var handleRow = function(row) {
          rows.push(row);
        }

        var sql = 'SELECT DISTINCT customers.uuid, first_name, last_name, customers.updated_at AT TIME ZONE \'UTC\''
          +' FROM customers'
          +' INNER JOIN vendors ON vendors.account_id = customers.account_id'
          +' WHERE vendors.uuid = $1 '
          +' AND ( customers.present_at >  (CURRENT_TIMESTAMP AT TIME ZONE \'UTC\' - INTERVAL \'1 hour\') )'
          +' AND ( customers.longitude BETWEEN vendors.longitude - 0.005 AND vendors.longitude + 0.005 )'
          +' AND ( customers.latitude BETWEEN vendors.latitude - 0.005 AND vendors.latitude + 0.005 )'
          +' ORDER BY customers.updated_at AT TIME ZONE \'UTC\' DESC LIMIT 5 OFFSET 0';

        debug('query with '+vendorID);
        debug(sql);
        var query = client.query(sql, [vendorID]);
        query.on('error', handleError );
        query.on('row'  , handleRow );
        query.on('end'  , handleEnd );

      });
    },

    queryBackgroundProcess: function(backgroundProcessID, callback) {
      if ( !backgroundProcessID || backgroundProcessID == "" ) {
          callback( null );
          return
      }

      // get a pg client from the connection pool
      pg.connect(connString, function(err, client, done) {

        var sql = 'SELECT * FROM background_processes where uuid = $1 limit 1';

        debug('query with '+backgroundProcessID)
        var query = client.query(sql, [backgroundProcessID], function(err, result) {

          done();

          if(err) {
            callback( null );
          }

          callback(result.rows[0]);
        });
      });
    },

    socket: function(server) {
      debug('start socket server');
      var sockets = require('socket.io')(server);
      var base = this;

      sockets.on('connection', function (client) {
        var intervalID =  null;
        var vendorID = null;
        var backgroundProcessID = null;
        var result = [];
        var resBP = {} ;

        var verify = function() {

          debug("vendorID = "+vendorID)
          if (vendorID) {
            base.query(vendorID, function(res){
              if (result == null || res.length!=result.length || (res.length>0 && res[0].updated_at!=result[0].updated_at)) {
                result = res ;
                client.emit('closetome_changed', { customers: result });
              }
            });
          }

          debug("backgroundProcessID = "+backgroundProcessID )
          if (backgroundProcessID) {
            base.queryBackgroundProcess(backgroundProcessID, function(res){
              debug(resBP.updated_at + " = " + res.updated_at);
              if (resBP === undefined || JSON.stringify(res.updated_at) != JSON.stringify(resBP.updated_at)) {
                resBP = res ;
                debug("res = "+res);
                client.emit('backgroundProcess_changed', res );
              }
            });
          }

          if (intervalID == null ) {
            intervalID = setInterval(verify, 3000);
          }

        }

        client.on('closetome_init', function(vendor) {
          debug('init vendor '+vendor);
          vendorID = vendor.uuid;
          verify();
        });

        client.on('backgroundProcess_init', function(backgroundProcess) {
          debug('init backgroundProcessID '+backgroundProcess);
          backgroundProcessID = backgroundProcess;
          verify();
        });

        client.on('closetome_end', function() {
          clearInterval(intervalID);
          intervalID = null;
        });

        client.on('backgroundProcess_end', function() {
          clearInterval(intervalID);
          intervalID = null;
        });

        client.on('disconnect', function() {
          clearInterval(intervalID);
          intervalID = null;
        });
      });


    }
  }
}
