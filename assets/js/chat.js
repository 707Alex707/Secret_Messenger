var loggedIn = false;
var socket = io();

//Get user list
socket.on('userList', function(userList) {
    console.log(userList);
});

//Generate RSA keys then login
generateRSA(2048).then(() =>{
    console.log("Keys generated");
    login().then(() => {
        console.log("Logged in");
        getUsersInRoom();
        console.log("Got users");
    });
});





var messages = document.getElementById('messages');
var form = document.getElementById('form');
var input = document.getElementById('input');
var algorithm = document.getElementById('algorithm');

form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (input.value && loggedIn) {
        if (algorithm.value === "plain"){
            socket.emit('sendMessage', input.value);
        } else if (algorithm.value === "rsa") {
            try{
                /*encryptMsgRSA(myKeyPairRSA.publicKey, input.value).then(cipherText => {
                    socket.emit('sendMessageRSA', cipherText);
                });*/
            } catch (e){
                console.log(e);
            }
        }
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
    return new Promise((resolve, reject) => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const room = urlParams.get('room');
        var name = sessionStorage.getItem("username");
        const rsaPublicKey = sessionStorage.getItem("rsaPublicKey");

        //Set random name if none set
        if (name == null){
            let names = ["Smith", "Wright", "Lloyd", "Fowler", "Harper", "Elliott", "Farrell", "Allen", "Wells", "Owens", "Anderson"];
            name = names[getRndInteger(0, names.length)]
        }

        //Login
        socket.emit('login', { name, room, rsaPublicKey}, error => {
            if (error){
                window.alert("Login failure");
                console.log(error);
                reject("Login failure");
            } else {
                loggedIn = true;
            }
        })

        resolve();
    });

}

function getUsersInRoom(){
    return socket.emit('getUsers', error => {
        if (error){
            console.log(error);
        }
    });
}

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
}