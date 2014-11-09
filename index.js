// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

var async = require('async');
var noble = require('noble');

var NETTRAP_PERIPHERAL_UUID = '583c32cb9e4745dc88b3cf5e7f127d29';
var NETTRAP_SERVICE_UUID = '5794ba16ce6446e598046851f7b3a183';
var NETTRAP_WAS_NET_DROPPED_CHARACTERISTIC_UUID = 'fbb3136afe49445ba6122019d1b33a6c';
var NETTRAP_IS_NET_DISARMED_CHARACTERISTIC_UUID = 'f80fb0060e8e412c8a9219fe85328daa';


server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));


io.on('connection', function (socket) {
  var addedUser = false;

  socket.on('reset net', function(data) {

  };

  // when the client emits 'new message', this listens and executes
  socket.on('read ble', function (data) {

    noble.startScanning();

    noble.on('discover', function(peripheral) {
     console.log('peripheral with UUID ' + peripheral.uuid + ' found');
     if (peripheral.uuid == NETTRAP_PERIPHERAL_UUID) {
      explore(peripheral);
    }
    });

    function explore(peripheral) {
      console.log('services and characteristics:');
    
      var chrcData = {};
    
      peripheral.on('disconnect', function() {
        console.log("disarmed is " + chrcData.disarmed + " dropped is " + chrcData.dropped);
        socket.emit('ble info',chrcData);
        noble.stopScanning();
      });
    
      peripheral.connect(function(error) {
        peripheral.discoverServices([], function(error, services) {
          var serviceIndex = 0;
    
          async.whilst(
            function () {
              return (serviceIndex < services.length);
            },
            function(callback) {
              var service = services[serviceIndex];
              var serviceInfo = service.uuid;
    
              if (service.name) {
                serviceInfo += ' (' + service.name + ')';
              }
              console.log(serviceInfo);
    
              service.discoverCharacteristics([], function(error, characteristics) {
                var characteristicIndex = 0;
    
                async.whilst(
                  function () {
                    return (characteristicIndex < characteristics.length);
                  },
                  function(callback) {
                    var characteristic = characteristics[characteristicIndex];
                    var characteristicInfo = '  ' + characteristic.uuid;
    
                    if (characteristic.name) {
                      characteristicInfo += ' (' + characteristic.name + ')';
                    }
    
                    async.series([
                      function(callback) {
                            characteristicInfo += '\n    properties  ' + characteristic.properties.join(', ');
    
                        if (characteristic.properties.indexOf('read') !== -1) {
                          characteristic.read(function(error, data) {
                            if (data) {
                              var string = data.toString('ascii');
                              if (characteristic.uuid == NETTRAP_IS_NET_DISARMED_CHARACTERISTIC_UUID) {
                                console.log("disarmed value is " + string);
                                chrcData.disarmed = string;
                              }
                              if (characteristic.uuid == NETTRAP_WAS_NET_DROPPED_CHARACTERISTIC_UUID) {
                                console.log("dropped value is " + string);
                                chrcData.dropped = string;
                              }
    
                              characteristicInfo += '\n    value       ' + data.toString('hex') + ' | \'' + string + '\'';
                            }
                            callback();
                          });
                        } else {
                          callback();
                        }
                      },
                      function() {
                        console.log(characteristicInfo);
                        characteristicIndex++;
                        callback();
                      }
                    ]);
                  },
                  function(error) {
                    serviceIndex++;
                    callback();
                  }
                );
              });
            },
            function (err) {
              peripheral.disconnect();
            }
          );
        });
      });
    }
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      delete usernames[socket.username];
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
