//Examples https://gist.github.com/pedrouid/b4056fd1f754918ddae86b32cf7d803e#rsa-oaep---importkey

var imported_RSA_Keys = Array();

function generateRSA(keySize){
    let rsaPublicKey = sessionStorage.getItem("rsaPublicKey");
    let rsaPrivateKey = sessionStorage.getItem("rsaPrivateKey");

    //Check if keys are set
    if (rsaPublicKey != null && rsaPrivateKey != null){
        return;
    }

    window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: keySize, //e.g 1024, 2048, 3072, 4096
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    ).then((keyPair) => {
        window.crypto.subtle.exportKey("jwk", keyPair.publicKey).then(function (key) {
            sessionStorage.setItem("rsaPublicKey", JSON.stringify(key));
            console.log(JSON.stringify(key));
        });

        window.crypto.subtle.exportKey("jwk", keyPair.privateKey).then(function (key) {
            sessionStorage.setItem("rsaPrivateKey", JSON.stringify(key));
            console.log(JSON.stringify(key));
        });
    });
}

async function decryptMsgRSA(key, ciphertext){
    decrypted = await window.crypto.subtle.decrypt(
        {
            name: "RSA-OAEP"
        },
        key,
        str2ab(ciphertext)
    );
    return ab2str(decrypted);
}

async function encryptMsgRSA(key, plaintext){
    let ciphertext = await window.crypto.subtle.encrypt(
        {
            kty: "RSA",
            name: "RSA-OAEP"
        },
        key,
        str2ab(plaintext)
    );
    return ab2str(ciphertext);
}

function import_RSA_Public_Key(keyJson){
    let publicKeyPromise =  window.crypto.subtle.importKey(
        "jwk",
        JSON.parse(keyJson),
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        true,
        ["encrypt"]
    );
    publicKeyPromise.then(key => {
        imported_RSA_Keys.push(key);
    });
}

function import_RSA_Private_Key(key){
    return window.crypto.subtle.importKey(
        "jwk",
        key,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        true,
        ["decrypt"]
    );


}

//Ref https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
function ab2str(buf) {
    //return String.fromCharCode.apply(null, new Uint16Array(buf));
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function str2ab(str) {
    //var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
    var buf = new ArrayBuffer(str.length);
    //var bufView = new Uint16Array(buf);
    var bufView = new Uint8Array(buf);
    for (var i=0, strLen=str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}