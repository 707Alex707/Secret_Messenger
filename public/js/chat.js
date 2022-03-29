var loggedIn = false;
var socket = io();
var userList;
var aesKeys = {};
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
        let userMessage = input.value

        if (algorithm.value === "plain"){
            socket.emit('sendMessage', userMessage);
        } else if (algorithm.value === "rsa") {
            try{
                //Display the message locally
                appendMessage(userName + ": " + userMessage)

                //Send an encrypted rsa message
                for (let i = 0; i < userList.length; i++) {
                    import_RSA_Public_Key(JSON.parse(userList[i].rsaPublicKey)).then(publicKey => {
                        encryptMsgRSA(publicKey, userMessage).then(cipherText => {
                            console.log("Sent Plain: " + userMessage)
                            console.log("Sent: " + cipherText)
                            socket.emit("directMessage", {algorithm: "rsa", message: cipherText, socketID : userList[i].id})
                        })
                    })
                }
            } catch (e){
                console.log(e);
            }
        } else if (algorithm.value === "aes") {
            try {
                //Display the message locally
                appendMessage(userName + ": " + userMessage)

                //Send an encrypted aes message
                for (let i = 0; i < userList.length; i++) {
                    //Check if socket.id has corresponding aes_key
                    if (aesKeys[userList[i].id] === undefined) {
                        console.log("A User does not have AES key! Creating one")
                        generateAES().then(aesKey => {
                            export_AES_key(aesKey).then(exportedAesKey => {
                                import_RSA_Public_Key(JSON.parse(userList[i].rsaPublicKey)).then(publicKey => {
                                    encryptMsgRSA(publicKey, JSON.stringify(exportedAesKey)).then(cipherText => {
                                        console.log("Sent AES Key : " + JSON.stringify(exportedAesKey))
                                        socket.emit("directMessage", {algorithm: "aes-key", message: cipherText, socketID : userList[i].id})
                                        aesKeys[userList[i].id] = aesKey
                                        sendAESMessage(userMessage, userList[i].id)
                                    })
                                })
                            })
                        })
                    } else {
                        sendAESMessage(userMessage, userList[i].id)
                    }
                }


            } catch (e) {
                console.log(e)
            }
        }
        input.value = '';


    }
});

function sendAESMessage(msg, receiverSocketID){
    let iv = window.crypto.getRandomValues(new Uint8Array(16));
    encryptMsgAES(aesKeys[receiverSocketID], iv, msg).then(cipherText => {
        console.log("Sending encrypted AES Msg:" + ab2str(cipherText))
        socket.emit('directMessage', {algorithm: "aes", message: {msg: cipherText, iv: iv}, socketID : receiverSocketID})
    })

}

//Plain text
socket.on('message', function(msg) {
    appendMessage(msg.user + ": " + msg.text)
});

socket.on('receiveDirectMessage', ({ algorithm, message, user, senderID}) =>  {
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

    if (algorithm === "aes-key"){
        try {
            //Decrypt message with rsa
            let privateKey = import_RSA_Private_Key(JSON.parse(sessionStorage.getItem("rsaPrivateKey")));
            privateKey.then(jwk => {
                decryptMsgRSA(jwk, message).then(arrayBuff => {
                    let plain = ab2str(arrayBuff)
                    console.log("Got AES_Key")
                    console.log(plain)
                    import_AES_key(JSON.parse(plain)).then(aesKey => {
                        aesKeys[senderID] = aesKey
                        console.log("Imported AES key sucessfully")
                    })
                })
            });
        } catch (e){
            console.log(e)
        }
    }

    if (algorithm === "aes"){
        try {
            let iv = new Uint8Array(message.iv)
            if (aesKeys[senderID] === undefined){
                delay(1000).then(() => { //Race condition for key import
                    if (aesKeys[senderID] !== undefined){
                        decryptMsgAES(aesKeys[senderID], iv, message.msg).then(plainText => {
                            console.log("Decrypted aes msg: " + ab2str(plainText))
                            appendMessage(user + ": " + ab2str(plainText))
                        }).catch(e => console.log(e))
                    } else {
                        console.log("Failed to get aesKey within 1 second to decrypt message")
                    }
                });
            } else {
                decryptMsgAES(aesKeys[senderID], iv, message.msg).then(plainText => {
                    appendMessage(user + ": " + ab2str(plainText))
                    console.log("Decrypted aes msg: " + ab2str(plainText))
                }).catch(e => console.log(e))
            }
        } catch (e){
            console.log(e)
        }
    }

    if (algorithm === "rsa" || algorithm === "aes-key"){
        console.log("received direct message from " + user + " with  algorithm " + algorithm + " and contents: " + message);
    } else {
        console.log("received direct message from " + user + " with  algorithm " + algorithm + " and contents: " + ab2str(message.msg));
    }

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

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}
