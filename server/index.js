const fs = require('fs')
const express = require('express');
const { Server } = require("socket.io");

//SSL Configuration
let sslConfig = {}
sslConfig.publicKeyPath = "./server/certs/public.crt"
sslConfig.privateKeyPath = "./server/certs/private.key"
if (fs.existsSync(sslConfig.publicKeyPath) && fs.existsSync(sslConfig.privateKeyPath)){
    sslConfig.publicKey = fs.readFileSync(sslConfig.publicKeyPath)
    sslConfig.privateKey = fs.readFileSync(sslConfig.privateKeyPath)
} else {
    console.log("Public and/or private keys not found")
    process.exit(1)
}
sslConfig.options = {
    key: sslConfig.privateKey,
    cert: sslConfig.publicKey,
}

//Redirect http to https
const redirectApp = express()
redirectApp.get("*", function(req, res, next) {
    res.redirect("https://" + req.headers.host + req.path);
});

//Create http server
let http = require('http').createServer(redirectApp)
http.listen(80, function () {
    console.log('Server listening on port 80')
})

//Create main app
const app = express();

//Serve home page
app.get('/', (req, res) => {
    res.sendFile(  __dirname + '/pages/index.html');
});

//Serve chat page
app.get('/chat', (req, res) => {
    res.sendFile(__dirname + '/pages/chat.html');
});

//Serve files in assets folders
app.use('/public', express.static('public'));

//Create https server
let httpsServer = require('https').createServer(sslConfig.options, app)
httpsServer.listen(8443, function () {
    console.log('Server listening on port 8443')
})

//Socket IO user message handling
const io = new Server(httpsServer);
const { addUser, getUser, deleteUser, getUsers, getUsersInRoomExclusive } = require('./users')


io.on('connection', (socket) => {
    socket.on('login', ({ name, room, rsaPublicKey }, callback) => {
        const { user, error } = addUser(socket.id, name, room, rsaPublicKey)
        if (error) return callback(error)
        socket.join(user.room)
        sendUserListUpdate(user)
        //socket.broadcast.to(user.room).emit('userList',getUsers(user.room)) //Everyone but joiner
        callback()
    })

    socket.on('sendMessage', message => {
        const user = getUser(socket.id)
        io.in(user.room).emit('message', { user: user.name, text: message });
    })

    socket.on('directMessage', ({ message, algorithm, socketID}) => {
        try {
            const recipient = getUser(socketID);
            const sender = getUser(socket.id)
            if (getUsersInRoomExclusive(sender).some(filterUser => filterUser === recipient) === true){
                io.to(socketID).emit('receiveDirectMessage', {algorithm: algorithm, message: message, user: sender.name, senderID: socket.id})
            }
        } catch (e) {
            console.log(e)
        }
    })

    socket.on("disconnect", () => {
        const user = deleteUser(socket.id)
        if (user) {
            sendUserListUpdate(user)
        }
    })
});


//Send the updated user list to everyone but don't include recipient user
function sendUserListUpdate(user){
    for (let i = 0; i < getUsers(user.room).length; i++) {
        io.to(getUsers(user.room)[i].id).emit('userList', getUsersInRoomExclusive(getUsers(user.room)[i]))
    }
}
