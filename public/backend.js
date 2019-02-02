var socket = io('/backend');

//Sets up password field
var input = document.createElement('input');
input.type = 'password';
input.placeholder = 'password';

//Sets up the button to submit the password
var button = document.createElement('input');
button.type = 'button';

//Set up div for auth input
var authDiv = document.createElement('div');
authDiv.appendChild(input);
authDiv.appendChild(button);
authDiv.id = "authDiv";

/* Handles password setup
*/
socket.on('setup', ()=>{
    button.value = "set pass";
    document.body.appendChild(authDiv);

    button.addEventListener("click", ()=>{
        socket.emit('setup', window.btoa(input.value));
        location.reload();
    });
});

/* Handles password
*/
socket.on('auth', ()=>{
    button.value = "login"
    document.body.appendChild(authDiv);

    button.addEventListener("click", ()=>{
        socket.emit('auth', window.btoa(input.value), (data) => {
            if(data){
                document.getElementById('streamControls').classList.remove('hidden');
                authDiv.classList.add('hidden');
            } else {
                alert("wrong password, don't be a 1337 haxor pls");
            }
        })
    });
});

var streamOn = 0;

/**
 * Checks for GUM support
 */
var gumCheck = () => {
    return !!(navigator.mediaDevices.getUserMedia && navigator.mediaDevices);
}

/**
 * List all of the inputs in the dropdown
 * 
 * @param {MediaDeviceInfo} devices 
 */
var listDevices = (devices) => {
    
    let select = document.getElementById('sources');
    for(let i = 0; i < devices.length; i++) {
        let device = devices[i];
        if(device.kind === "audioinput"){
            let option = document.createElement("option");
            option.value = device.deviceId;
            option.text = device.label || "microphone " + (select.length + 1);
            select.appendChild(option);
        }
    }
}

/**
 * The call back that gets called after getUserMedia resolves.
 * 
 * This is super janky, I definitely want to move to not using a 
 * ScriptProcessor and only collecting information every second or 
 * so. Might move over to the MediaRecorder API.
 * 
 * @param {MediaStream} stream 
 */
var gotStream = (stream) => {
    let ctx = new AudioContext();
    //Create an input stream.
    let input = ctx.createMediaStreamSource(stream);
    
    if(ctx.audioWorklet) {
        ctx.audioWorklet.addModule('audioProcessor.js').then(() => {
            let recorder = new AudioWorkletNode(ctx, 'streamGetter');

            let chunks = [[],[]]
            recorder.port.onmessage = (e) => {
                chunks[0].push(e.left);
                chunks[1].push(e.right);

                if(chunks[0].length > 172 && streamOn){
                    console.log('sending packet');

                    let payload = {
                        'left':  new Float32Array(chunks[0]).buffer,
                        'right': new Float32Array(chunks[1]).buffer
                    };
                    socket.emit('stream', payload);
                    chunks = [[],[]];
                }
            }

            input.connect(recorder);
            recorder.connect(ctx.destination);
        });
    }
    else {
        //Create the actual recorder.
        let recorder = ctx.createScriptProcessor(16384, 2, 2);

        //Send off the data ever 16384 samples
        recorder.onaudioprocess= (e) => {
            if(streamOn) {
                let left = e.inputBuffer.getChannelData(0);
                let right = e.inputBuffer.getChannelData(1);
                let payload = {
                    'left':  left.buffer,
                    'right': right.buffer
                };
                socket.emit('stream', payload);
            }
        }

        //Connect everything, recorder has to connected for some reason
        input.connect(recorder);
        recorder.connect(ctx.destination);
    }
}

/**
 * Gets the media stream and calls gotStream.
 */
var getStream = () => {
    let constraints = {
        audio: {
            deviceId: {exact: document.getElementById('sources').value},
            channelCount: {ideal: 2},
            echoCancellation: {exact: false},
            noiseSuppression: {exact: false},
            sampleRate: {min: 20000, ideal: 40000, max: 44000}, 
            sampleSize: {ideal: 16},
            latency: 0.001,
            autoGainControl: false,
        },
    };
    navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(errHandler);
}

//Check GUM then list all of the devices
if(gumCheck()){
    navigator.mediaDevices.enumerateDevices().then(listDevices).catch(errHandler);
}

/**
 * Handles errors.
 * 
 * @param {*} err 
 */
var errHandler = (err) => {
    console.log("error: " + err);
}

//Does everything (like handling stream status)
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("streamBtn").addEventListener("click", (e) => {
        e.preventDefault();
        if(streamOn === 0){
            socket.emit('stream-start', (data) => {
                if(data === true){
                    streamOn = true;
                    getStream();
                    document.getElementById("liveIndicator").classList.add('on');
                    document.getElementById("liveIndicator").classList.remove('off');
                    return;
                }
                else{
                    return;
                }
            });
            return;
        }
        if(!streamOn) {
            document.getElementById("liveIndicator").classList.add('on');
            document.getElementById("liveIndicator").classList.remove('off');
            socket.emit('stream-start', (data) => {
                if(data === true){
                    streamOn = true;
                    document.getElementById("liveIndicator").classList.add('on');
                    document.getElementById("liveIndicator").classList.remove('off');
                    return;
                }
                else{
                    return;
                }
            });
        }
        else {
            document.getElementById("liveIndicator").classList.add('off');
            document.getElementById("liveIndicator").classList.remove('on');
            socket.emit('stream-end')
            streamOn = false;
        }
    });
});

socket.on('stats', (data) => {
    document.getElementById('listeners').innerText = data;
});