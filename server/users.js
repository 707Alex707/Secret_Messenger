//src https://raw.githubusercontent.com/AkileshRao/chat-server/master/users.js

const users = []

const addUser = (id, name, room, rsaPublicKey) => {
    const existingUser = users.find(user => user.name.trim().toLowerCase() === name.trim().toLowerCase())

    //if (existingUser) return { error: "Username has already been taken" }
    if (!name && !room) return { error: "Username and room are required" }
    if (!name) return { error: "Username is required" }
    if (!room) return { error: "Room is required" }
    if (!rsaPublicKey) return { error: "rsaPublicKey is required" }

    const user = { id, name, room, rsaPublicKey }
    users.push(user)
    return { user }
}

function getUser(id) {
    let user = users.find(user => user.id == id)
    return user
}

function deleteUser(id) {
    const index = users.findIndex((user) => user.id === id);
    if (index !== -1) return users.splice(index, 1)[0];
}

function getUsers(room) {
    return users.filter(user => user.room === room);
}

function getUsersInRoomExclusive(user){
    return getUsers(user.room).filter(filterUser => filterUser !== user)
}

module.exports = { addUser, getUser, deleteUser, getUsers, getUsersInRoomExclusive }