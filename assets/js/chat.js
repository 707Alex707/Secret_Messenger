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
    item.textContent = msg.user + ": " + msg.text;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

function login(){
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const room = urlParams.get('room');
    let name = sessionStorage.getItem("username");

    //Set random name if none set
    if (name == null){
        let names = ["Smith", "Wright", "Lloyd", "Fowler", "Harper", "Elliott", "Farrell", "Allen", "Wells", "Owens", "Anderson"];
        name = names[getRndInteger(0, names.length)]
    }

    socket.emit('login', { name, room }, error => {
        if (error){
            console.log(error);
            window.alert("Login failure");
        } else {
            loggedIn = true;
        }
    });
}

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
}