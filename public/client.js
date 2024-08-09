/*global io*/
let socket = io();

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('user', data => {
  $('#num-users').text(data.currentUsers + ' users online');
  console.log('this is what data looks like', data);
  let message =
    data.username + (data.connected ? ' has joined the chat.' : ' has left the chat.');
  $('#messages').append($('<li>').html('<b>' + message + '</b>'));
});

socket.on('chat message', data => {
  console.log('Received chat message');
  $('#messages').append($('<li>').text(`${data.username}: ${data.message}`));
});

$(document).ready(function () {
  $('form').submit(function () {
    var messageToSend = $('#m').val();  // Define messageToSend here
    socket.emit('chat message', messageToSend);  // Emit the message through the socket

    $('#m').val('');  // Clear the input field after sending the message
    return false;  // Prevent form submission from refreshing the page
  });
});
