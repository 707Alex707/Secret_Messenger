//Examples https://gist.github.com/pedrouid/b4056fd1f754918ddae86b32cf7d803e#rsa-oaep---importkey
function generateRSA(keySize){
    let waitGroup = []

    return new Promise(function(resolve, reject) {
        let rsaPublicKey = sessionStorage.getItem("rsaPublicKey");
        let rsaPrivateKey = sessionStorage.getItem("rsaPrivateKey");

        //Check if keys are set
        if (rsaPublicKey != null && rsaPrivateKey != null){
            resolve()
            return;
        }

        //Generate keys
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
            waitGroup.push(
                new Promise(function (resolve2, reject2) {
                    window.crypto.subtle.exportKey("jwk", keyPair.publicKey).then(function (key) {
                        sessionStorage.setItem("rsaPublicKey", JSON.stringify(key));
                        resolve2()
                    })
                })
            );

            waitGroup.push(
                new Promise(function (resolve3, reject3) {
                    window.crypto.subtle.exportKey("jwk", keyPair.privateKey).then(function (key) {
                        sessionStorage.setItem("rsaPrivateKey", JSON.stringify(key));
                        resolve3()
                    })
                })
            );
            Promise.all(waitGroup).then(() => {
                resolve();
            })
        });
    });
}

function generateAES(){
    return window.crypto.subtle.generateKey(
        {
            name: "AES-CBC",
            length: 128, //can be  128, 192, or 256
        },
        true, //whether the key is extractable (i.e. can be used in exportKey)
        ["encrypt", "decrypt"] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    )
}

function runCallback(callback){
    if (typeof callback === 'function') {
        console.log("Running callback");
        callback();
    }
}

async function decryptMsgRSA(key, ciphertext){
    let decrypted = window.crypto.subtle.decrypt(
        {
            name: "RSA-OAEP"
        },
        key,
        str2ab(ciphertext)
    );
    return decrypted;
}

async function decryptMsgAES(key, iv, data){
    let decrypted = window.crypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv: iv, //The initialization vector you used to encrypt
        },
        key, //from generateKey or importKey above
        data //ArrayBuffer of the data
    )
    return decrypted;
}

async function encryptMsgAES(key, iv , data){
    let encrypted = window.crypto.subtle.encrypt(
        {
            name: "AES-CBC",
            //Don't re-use initialization vectors!
            //Always generate a new iv every time your encrypt!
            iv: iv,
        },
        key, //from generateKey or importKey above
        str2ab(data) //ArrayBuffer of data you want to encrypt
    )
    return encrypted;
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

function import_RSA_Public_Key(key){
    let publicKeyPromise =  window.crypto.subtle.importKey(
        "jwk",
        key,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        true,
        ["encrypt"]
    );
    return publicKeyPromise;
}

function import_AES_key(key){
    return window.crypto.subtle.importKey(
        "jwk", //can be "jwk" or "raw"
        key,
        {
            name: "AES-CBC",
        },
        true, //whether the key is extractable (i.e. can be used in exportKey)
        ["encrypt", "decrypt"] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    )
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

function export_AES_key(key){
    return window.crypto.subtle.exportKey(
        "jwk", //can be "jwk" or "raw"
        key,
        {
            name: "AES-CBC",
        },
        true, //whether the key is extractable (i.e. can be used in exportKey)
        ["encrypt", "decrypt"] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    )
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