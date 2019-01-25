var socket = io('/stream');

socket.on('newToken', (token) => {
    sessionStorage.setItem('token', token);
})

socket.on('disconnect', () => {
    alert("stream disconnected");
    location.replace('/auth');
});

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
            if(device.deviceId == "default" || device.deviceId =="communications") {
                option.text = device.deviceId;
            } else {
                option.text = device.label || "microphone " + (select.length + 1);
            }
            select.appendChild(option);
        }
    }
}

var gotStream = (stream) => {
    window.stream = stream;
    let mediaRecorder = new MediaRecorder(stream);
    window.recorder = mediaRecorder;

    var blobReader = new FileReader()
    blobReader.addEventListener("load", (e) => {
        let buffer = e.target.result;
        let payload = {
            'id': sessionStorage.getItem('id'),
            'data': buffer,
            'token': sessionStorage.getItem('token')
        }
        console.log(sessionStorage.getItem('id') ^ sessionStorage.getItem('token'))
        socket.emit('stream', payload)
    });

    mediaRecorder.ondataavailable = (e) => {
        blobReader.readAsArrayBuffer(e.data);
    }
}

var getStream = () => {
    let constraints = {
        audio: {
            deviceId: {exact: document.getElementById('sources').value}
        }
    };
    navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(errHandler);
}

if(gumCheck()){
    navigator.mediaDevices.enumerateDevices().then(listDevices).then(getStream).catch(errHandler);
}

var errHandler = (err) => {
    console.log("error: " + err);
}

document.addEventListener("DOMContentLoaded", () => {
    var streamOn = 0;
    document.getElementById("streamBtn").addEventListener("click", (e) => {
        e.preventDefault();
        if(streamOn === 0){
            window.recorder.start(1000);
            streamOn = !streamOn;
            document.getElementById("liveIndicator").classList.add('on');
            document.getElementById("liveIndicator").classList.remove('off');
            return;
        }
        streamOn = !streamOn;
        if(streamOn) {
            document.getElementById("liveIndicator").classList.add('on');
            document.getElementById("liveIndicator").classList.remove('off');
            window.recorder.resume();
            socket.emit('resume');
        }
        else {
            document.getElementById("liveIndicator").classList.add('off');
            document.getElementById("liveIndicator").classList.remove('on');
            window.recorder.pause();
            socket.emit('end');
        }
    });
})