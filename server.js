//Main code for the server
//Load up express server to serve files
var express = require('express'), bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
//Load up socket IO, which is important I guess
var io = require('socket.io')(http);
//Load more needed libs
var fs = require('fs');
var crypto = require('crypto');
//Load dot env for hash
require('dotenv').load();
var env = process.env;

//Set up js and css folder.
app.use(express.static('public'));

var backEndChannel = io.of('/backend');
var listenChannel = io.of('/play');

var currentBroadcast = null;
var authorized = {};

var totalListeners = 0;
var currentListeners = 0;

backEndChannel.on('connection', (socket) => {
    console.log('new connection to backend');

    fs.readFile('./hash.json', (err, data) => {
        if(err) {
            socket.disconnect(true);
            return;
        }
        
        let hashJSON = JSON.parse(data);
        if('hash' in hashJSON && 'salt' in hashJSON) {
            console.log(socket.id + ' starting login process');
            socket.emit('auth');
        }
        else{
            console.log(socket.id + ' starting authentication setup');
            socket.emit('setup');
        }
    });

    socket.on('auth', (inData, fn) => {
        fs.readFile('./hash.json', (err, data) => {
            if(err) {
                console.log('oops');
                throw err;
            }
            
            let hashJSON = JSON.parse(data);
            let pwd = new Buffer.from(inData, 'base64').toString();

            let generatedHash = crypto.createHmac('sha256', env.SECRET).update(pwd + hashJSON.salt).digest('hex');

            if(generatedHash === hashJSON.hash) {
                console.log('correct password');
                authorized[socket.id] = true;
                socket.emit('stats', currentListeners)
                fn({'stream-key': env.STREAMKEY, 'stream-addr': env.STREAMADDR});
                return;
            } else {
                console.log('incorrect password');
                fn(false);
                return;
            }
        });
    });

    socket.on('setup', (inData) => {
        let salt = crypto.randomBytes(128).toString('hex');
        let pwd = new Buffer.from(inData, 'base64').toString();
        let hash = crypto.createHmac('sha256', env.SECRET).update(pwd + salt).digest('hex');

        fs.readFile('./hash.json', (err, data) => {
            if(err) {
                console.log('oops');
                throw err;
            }

            let hashJSON = JSON.parse(data);
            
            if(!('hash' in hashJSON) && !('salt' in hashJSON)) {
                fs.writeFile('hash.json', JSON.stringify({'hash': hash, 'salt': salt}), (err) => {
                    if(err){
                        console.log('Oops');
                        throw err;
                    }
                });
            };
        });
    });
});

listenChannel.on('connect', (socket) => {
    socket.emit('addr', env.STREAMADDR)

    socket.on('msg', (data) => {
        console.log(socket.id + " said: " + data);
        listenChannel.emit('msg', data);
    });

    totalListeners++;
    currentListeners++;
    console.log('total listeners: ' + totalListeners + ' current listeners: ' + currentListeners);

    backEndChannel.emit('stats', currentListeners);

    socket.on('disconnect', () => {
        currentListeners--;
        backEndChannel.emit('stats', currentListeners);
    })
});

app.get('/', (req, resp) => {
    resp.sendFile(__dirname + '/views/play.html');
});

app.get('/backend', (req, resp) => {
    resp.sendFile(__dirname + '/views/backend.html');
});

app.get('/artist', (req, resp) => {
    resp.sendFile(__dirname + '/views/backend.html');
});

app.get('/play', (req, resp) => {
    resp.sendFile(__dirname + '/views/play.html');
});

app.get('/listen', (req, resp) => {
    resp.sendFile(__dirname + '/views/play.html');
});

var listener = http.listen(env.PORT,
    () => {
        console.log('server listening on ' + listener.address().address + ':' + listener.address().port);
    }
)