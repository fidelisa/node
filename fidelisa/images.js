"use strict";
var
  pg = require('pg'),
  url = require('url'),
  sharp = require('sharp'),
  debug = require('debug')('closetome');

module.exports = function Images(env) {
  var connString = env.get('pg');
  debug('Connexion: '+connString)
  return {
    query: function(imageID, options, callback) {
      var image;
      debug('imageID'+imageID);
      if ( !imageID || imageID == "" ) {
          callback( null );
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
          callback( null );
          return true;
        };

        var handleEnd = function() {     
          if (image !== undefined && !options.static
            && image.content_type !== 'image/svg+xml' ) {

            var height = options.height ? parseInt(options.height) : undefined;
            var width = options.width ? parseInt(options.width) : undefined;

            var p = sharp(image.image);
            if (height || width) {
              p = p.resize(width, height);
            } 

            if (options.crop) {
              p = p.crop();
              //image = self.crop_size(width, height)                
            } else if (height && width) {
              p = p.ignoreAspectRatio();   //legacy             
            } 

            if (options.noalpha) {
              p = p.flatten();
            }

            p = p.toBuffer()
            .then( data => {
              image.content_type = image.content_type || 'image/*';     
              image.image = data;
              callback(image);
            } )
            .catch( err => {
              console.log(err);
              callback(undefined);
            } );                                                      
          } else {
            callback(image);
          }
          
          done();
        }

        var handleRow = function(row) {          
          image = row;
        }

        var sql = 'SELECT * FROM images WHERE uuid = $1 ';
          
        debug('query with '+imageID);
        debug(sql);
        var query = client.query(sql, [imageID]);
        query.on('error', handleError );
        query.on('row'  , handleRow );
        query.on('end'  , handleEnd );

      });
    },
    
  }    
}
