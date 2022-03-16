const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const { addUser, getUser, deleteUser, getUsers, getUsersInRoomExclusive } = require('./users')

//Serve home page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

//Serve chat page
app.get('/chat', (req, res) => {
    res.sendFile(__dirname + '/chat.html');
});

//Serve files in assets folders
app.use('/assets', express.static('assets'));

server.listen(8080, () => {
    console.log('listening on *:8080');
});


io.on('connection', (socket) => {
    socket.on('login', ({ name, room, rsaPublicKey }, callback) => {
        const { user, error } = addUser(socket.id, name, room, rsaPublicKey)
        if (error) return callback(error)
        socket.join(user.room)

        //Send the updated user list to everyone but don't include recipient user
        for (let i = 0; i < getUsers(user.room).length - 1; i++) {
            io.to(getUsers(user.room)[i].id).emit('userList', getUsersInRoomExclusive(getUsers(user.room)[i]))
        }
        //socket.broadcast.to(user.room).emit('userList',getUsers(user.room)) //Everyone but joiner
        callback()
    })

    socket.on('sendMessage', message => {
        const user = getUser(socket.id)
        io.in(user.room).emit('message', { user: user.name, text: message });
    })

    socket.on('getUsers', message => {
        const callingUser = getUser(socket.id)
        socket.emit('userList', getUsersInRoomExclusive(callingUser));
    })

    socket.on("disconnect", () => {
        console.log("User disconnected");
        const user = deleteUser(socket.id)
        if (user) {
            io.in(user.room).emit('notification', { title: 'Someone just left', description: `${user.name} just left the room` })
            io.in(user.room).emit('users', getUsers(user.room))
        }
    })
});