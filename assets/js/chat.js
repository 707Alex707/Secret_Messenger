var loggedIn = false;
var socket = io();
var userList;
var userName;

var messages = document.getElementById('messages');
var form = document.getElementById('form');
var input = document.getElementById('input');
var algorithm = document.getElementById('algorithm');
var userListDiv = document.getElementById('userListDiv');

//Get user list
socket.on('userList', function(users) {
    userList = users;
    updateUserList()
});

//Generate RSA keys then login
generateRSA(2048).then(() =>{
    login().then(() => {
        //Do stuff
    }).catch(error => {
        console.log(error);
    });
});

form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (input.value && loggedIn) {
        if (algorithm.value === "plain"){
            socket.emit('sendMessage', input.value);
            input.value = '';
        } else if (algorithm.value === "rsa") {
            try{
                //Display the message locally
                appendMessage(userName + ": " + input.value)

                //Send an encrypted rsa message
                for (let i = 0; i < userList.length; i++) {
                    import_RSA_Public_Key(JSON.parse(userList[i].rsaPublicKey)).then(publicKey => {
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
            let privateKey = import_RSA_Private_Key(JSON.parse(sessionStorage.getItem("rsaPrivateKey")));
            privateKey.then(jwk => {
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
        userName = sessionStorage.getItem("username");
        const rsaPublicKey = sessionStorage.getItem("rsaPublicKey");

        //Set random name if none set
        if (userName == null){
            let names = ["Smith", "Wright", "Lloyd", "Fowler", "Harper", "Elliott", "Farrell", "Allen", "Wells", "Owens", "Anderson"];
            userName = names[getRndInteger(0, names.length)]
        }

        //Login
        let name = userName;
        socket.emit('login', { name, room, rsaPublicKey}, error => {
            if (error){
                window.alert("Login failure");
                reject("Login failure: " + error);
            } else {
                resolve();
                loggedIn = true;
            }
        })
    });

}

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
}


//UI
function appendMessage(message){
    var item = document.createElement('div');
    item.className = "bubble";
    item.textContent = message
    messages.appendChild(item);
    item.scrollIntoView();
}

//UI
function updateUserList(){
    let html;

    html = `<table><tr><th>Members - ${userList.length + 1}</th></tr><tr><td>${userName} (You)</td></tr>`
    for (let i = 0; i < userList.length; i++) {
        html += `<tr><td>${userList[i].name}</td></tr>`
    }
    html += "</table>"
    userListDiv.innerHTML = html
}
