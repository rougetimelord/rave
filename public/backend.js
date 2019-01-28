var socket = io('/backend');

var input = document.createElement('input');
input.type = 'password';
input.placeholder = 'password';

var button = document.createElement('input');
button.type = 'button';

var authDiv = document.createElement('div');
authDiv.appendChild(input);
authDiv.appendChild(button);
authDiv.id = "authDiv";

socket.on('setup', ()=>{
    button.value = "set pass";
    document.body.appendChild(authDiv);

    button.addEventListener("click", ()=>{
        socket.emit('setup', window.btoa(input.value));
        location.reload();
    });
});

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

var gumCheck = () => {
    return !!(navigator.mediaDevices.getUserMedia && navigator.mediaDevices);
}

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

var gotStream = (stream) => {
    let ctx = new AudioContext();
    let input = ctx.createMediaStreamSource(stream);
    let recorder = ctx.createScriptProcessor(16384, 2, 2);

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

    input.connect(recorder);
    recorder.connect(ctx.destination);
}

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

if(gumCheck()){
    navigator.mediaDevices.enumerateDevices().then(listDevices).catch(errHandler);
}

var errHandler = (err) => {
    console.log("error: " + err);
}

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
})