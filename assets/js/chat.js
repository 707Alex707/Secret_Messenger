var loggedIn = false;
var socket = io();
var userList;

//Get user list
socket.on('userList', function(users) {
    userList = users;
});

//Generate RSA keys then login
generateRSA(2048).then(() =>{
    login().then(() => {
        getUsersInRoom();
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
            input.value = '';
        } else if (algorithm.value === "rsa") {
            try{
                //Display the message locally
                var name = sessionStorage.getItem("username");
                appendMessage(name + ": " + input.value)

                //Send an encrypted rsa message
                for (let i = 0; i < userList.length; i++) {
                    import_RSA_Public_Key(JSON.parse(userList[i].rsaPublicKey)).then(publicKey => {
                        console.log(publicKey);
                        encryptMsgRSA(publicKey, input.value).then(cipherText => {
                            console.log("Sent Plain: " + input.value)
                            console.log("Sent: " + cipherText)
                            socket.emit("directMessage", {algorithm: "rsa", message: cipherText, socketID : userList[i].id})
                            input.value = '';
                        })
                    })
                }
            } catch (e){
                console.log(e);
            }
        }


    }
});

//Plain text
socket.on('message', function(msg) {
    appendMessage(msg.user + ": " + msg.text)
});

socket.on('receiveDirectMessage', ({ algorithm, message, user}) =>  {
    if (algorithm === "rsa"){
        try {
            console.log("private key")
            console.log(JSON.parse(sessionStorage.getItem("rsaPrivateKey")))
            let privateKey = import_RSA_Private_Key(JSON.parse(sessionStorage.getItem("rsaPrivateKey")));
            privateKey.then(jwk => {
                console.log(jwk)
                decryptMsgRSA(jwk, message).then(arrayBuff => {
                    plainText = ab2str(arrayBuff)
                    appendMessage(user + ": " + plainText)
                })
            });
        } catch (e){
            console.log(e);
        }


    }
    console.log("received direct message from " + user + " with  algorithm " + algorithm + " and contents: " + message);
})

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

function appendMessage(message){
    var item = document.createElement('li');
    item.textContent = message
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
}