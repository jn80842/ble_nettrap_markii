$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize varibles
  var $window = $(window);

  var $disarmedDiv = $('#net-disarmed');
  var $droppedDiv = $('#net-dropped');
  var $armedDiv = $('#net-armed');
  var $unconnectedDiv = $('#cant-connect');

  var socket = io();

  function init() {
    console.log("called to init");
    socket.emit("read ble");
  }

  function populateBleInfo(data) {
    console.log("triggered populate ble info function");
    console.log("disarmed " + data.disarmed + " dropped " + data.dropped);
    if (data.disarmed == 't') {
      $disarmedDiv.append("<p>YES</p>");
      $armedDiv.append("<p>NO</p>");
    } else {
      $disarmedDiv.append("<p>NO</p>");
      $armedDiv.append("<p>YES</p>");
    }
    if (data.dropped == 't') {
      $droppedDiv.append("<p>YES</p>");
    } else {
      $droppedDiv.append("<p>NO</p>");
    }
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  // Socket events

  socket.on('ble info', function (data) {
    console.log("main js got ble info event");
    populateBleInfo(data);
  });

  socket.on('ready', function(data) {
    console.log("we are ready!");
    socket.emit('ble ready');
  })

  $(document).ready(function() {
    console.log("okay set stuff up")
    init();
  });

});

