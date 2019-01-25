//Main code for the server

var express = require('express'), bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var env = process.env;
var fs = require('fs');
var crypto = require('crypto');
require('dotenv').load();

app.use(express.static('public'));
app.use(bodyParser.json());

var authorized = {};
var authID = {};

var authChannel = io.of('/auth');

authChannel.on('connection', (socket) => {
    console.log('auth endpoint hit');
    //generate an id
    let id = crypto.randomBytes(16).toString('hex');
    //store the id with an expiry date
    authID[id] = Date.now() + 1.2E5;

    
    fs.readFile("./hash.json", (err, data) => {
        if(err) {
            socket.disconnect(true);
            return;
        }
        
        let hashJSON = JSON.parse(data);
        if("hash" in hashJSON && "salt" in hashJSON) {
            console.log(socket.id + ' starting login process');
            socket.emit('auth', id);
        }
        else{
            console.log(socket.id + ' starting authentication setup');
            socket.emit('setup', id);
        }
    });
});

var broadcastChannel = io.of('/stream');

var currentBroadcast = null;
var authTokens = {};

var checkBroadcast = (socket, id, token) => {
    console.log('checking ' + id);

    if(id in authorized) {
        if(authorized[id] == token && Date.now() < authTokens[token]){
            var newToken = crypto.randomBytes(16).toString('hex');
            socket.emit('newToken', newToken);
            authorized[id] = newToken;
            authTokens[newToken] = Date.now() + 5000;
            console.log('passed');
            return true;
        } else {
            socket.disconnect(true);
            console.log('failed token');
            delete authorized[id];
            return false;
        }
    } else {
        socket.disconnect(true);
        console.log('failed id');
        return false;
    }
};

broadcastChannel.on('connection', (socket) => {
    console.log('stream connected');

    let id;

    socket.on('stream', (packet) => {
        console.log('got stream packet from ' + socket.id);
        
        id = (!id) ? packet.id : id;

        if(!checkBroadcast(socket, packet.id, packet.token)) {return;};

        if(currentBroadcast && socket.id == currentBroadcast) {
            listenChannel.emit('stream', packet.data);
        }
        else if(!currentBroadcast) {
            currentBroadcast = socket.id;
            listenChannel.emit('stream', packet.payload);
        }
        else {
            console.log('refused packet');
        }
    });

    socket.on('end', () => {
        console.log("Stream ended");
        authTokens[id] += 6E4;
        if(socket.id == currentBroadcast) {
            currentBroadcast = null;
        }
    });

    socket.on('disconnect', () => {
        console.log("Stream " + socket.id + " disconnected");
        if(socket.id == currentBroadcast) {
            currentBroadcast = null;
        }
    })
});

var listenChannel = io.of('/play');

app.get("/", (req, resp) => {
    resp.sendFile(__dirname + '/views/play.html');
});

app.get("/auth", (req, resp) => {
    resp.sendFile(__dirname + '/views/auth.html');
});

app.get("/stream", (req, resp) => {
    resp.sendFile(__dirname + "/views/stream.html");
});

app.post("/setup", (req, resp) => {
    let json = req.body;
    if(json.user in authID && Date.now() < authID[json.user]){
        let salt = crypto.randomBytes(128).toString('hex');
        let pwd = new Buffer.from(json.pass, 'base64').toString();
        let hash = crypto.createHmac('sha256', env.SECRET).update(pwd + salt).digest('hex');
        fs.writeFile('hash.json', JSON.stringify({'hash': hash, 'salt': salt}), 
            (err) => {
                if(err){
                    console.log('Oops');
                    throw err;
                }
            }
        )
        resp.status(200);
        resp.send("success");
    }
    else {
        resp.status(403);
        resp.send();
    }
});

app.post("/auth", (req, resp) => {
    let json = req.body;
    if(json.user in authID && Date.now() < authID[json.user]){
        let hashFile = fs.readFile("./hash.json", (err, data) => {
            if(err) {
                console.log('oops');
                throw err;
            }
            
            let hashJSON = JSON.parse(data);
            let pwd = new Buffer.from(json.pass, 'base64').toString();

            let generatedHash = crypto.createHmac('sha256', env.SECRET).update(pwd + hashJSON.salt).digest('hex');

            if(generatedHash === hashJSON.hash) {
                console.log('correct password');
                resp.status(200);
                let token = crypto.randomBytes(16).toString('hex');
                resp.send(token);
                authorized[json.user] = token;
                authTokens[token] = Date.now() + 6E4;
            }
            else{
                console.log('incorrect password');
                resp.status(401);
                resp.send();
            }
        });
        delete authID[json.user];
    }
    else {
        resp.status(401);
        resp.send();
    }
});

var listener = http.listen(env.PORT, () => {
    console.log("server listening on " + listener.address().port);
})