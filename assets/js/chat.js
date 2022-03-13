var socket = io();

login();
var loggedIn = false;

var messages = document.getElementById('messages');
var form = document.getElementById('form');
var input = document.getElementById('input');

form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (input.value && loggedIn) {
        socket.emit('sendMessage', input.value);
        input.value = '';
    }
});

socket.on('message', function(msg) {
    var item = document.createElement('li');
    item.textContent = msg.text;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

function login(){
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const name = urlParams.get('name');
    const room = urlParams.get('room');

    socket.emit('login', { name, room }, error => {
        if (error){
            console.log(error);
            window.alert("Login failure");
        } else {
            loggedIn = true;
        }
    });
}