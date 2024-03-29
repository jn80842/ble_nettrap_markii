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

var myperipheral = null;
var myservice = null;
var droppedChrc = null;
var disarmedChrc = null;


server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));


io.on('connection', function (socket) {
  // start write ble function
  function write_ble(data) {

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
    
                        if (characteristic.properties.indexOf('write') !== -1) {
                          if (characteristic.uuid == NETTRAP_IS_NET_DISARMED_CHARACTERISTIC_UUID) {
                            var writeValue = new ArrayBuffer(1);
                            var writeBytes = new Uint8Array(writeValue);
                            writeBytes[0] = data.disarmed;

                            characteristic.write(writeValue,false,function(err) {
                              console.log("wrote to disarmed characteristic");
                            });                          
                          }
                          if (characteristic.uuid == NETTRAP_WAS_NET_DROPPED_CHARACTERISTIC_UUID) {
                            var writeValue = new ArrayBuffer(1);
                            var writeBytes = new Uint8Array(writeValue);
                            writeBytes[0] = data.dropped;
                            characteristic.write(writeValue,false,function(error) {
                              console.log("wrote to dropped characteristic");
                            })
                          }
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
             // peripheral.disconnect();
            }
          );
        });
      });
    }
  };
  //end write ble function
  // start read ble function
  function read_ble() {
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
                                disarmedChrc = characteristic;
                              }
                              if (characteristic.uuid == NETTRAP_WAS_NET_DROPPED_CHARACTERISTIC_UUID) {
                                console.log("dropped value is " + string);
                                chrcData.dropped = string;
                                droppedChrc = characteristic;
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
             // peripheral.disconnect();
             socket.emit("ready");
            }
          );
        });
      });
    } 
  }; //close read ble function

  socket.on('reset net', function(data) {
      console.log("client asked to reset net");
      var writeValue = new Buffer("f","ascii");
      droppedChrc.write(writeValue,false,function() {
        console.log("wrote to dropped " + writeValue.toString("ascii"));
        socket.emit('show armed');
      })
  });

  socket.on('disarm trap', function(data) {
    console.log("client asked to disarm trap");
    var writeValue = new Buffer("t","ascii");
    disarmedChrc.write(writeValue,false,function() {
      console.log("wrote to disarmed " + writeValue.toString("ascii"));
      socket.emit("show disarmed");
    })
  });

  socket.on('arm trap', function(data) {
    console.log("client asked to arm trap");
    var writeValue = new Buffer("f","ascii");
    disarmedChrc.write(writeValue,false,function() {
      console.log("wrote to disarmed" + writeValue.toString("ascii"));
      socket.emit("show armed");
    })
  });

  // when the client emits 'new message', this listens and executes
  socket.on('read ble', function (data) {
    read_ble();
  });

  socket.on('ble ready', function (data) {
    console.log("theoretically should be connected now");
    var chrcData = {};
    droppedChrc.on('notify',function(data) {
      socket.emit("show armed");
    });
    droppedChrc.read(function(err,data) {
      console.log("value of droppedChrc is " + data.toString('ascii'))
      chrcData.dropped = data.toString("ascii");
      disarmedChrc.read(function(err,data) {
        console.log("value of disarmedChrc is " + data.toString('ascii'));
        chrcData.disarmed = data.toString("ascii");
        console.log("ready to send data " + chrcData.disarmed + " " + chrcData.dropped);
        socket.emit('ble info',chrcData);
    });
    });

  })

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    console.log("socket is disconnected");
    //noble.stopScanning();
  });
});
