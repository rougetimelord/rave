var socket = io('/play');

var createBuffersource = (ctx, buffer) => {
    let source = ctx.createBufferSource();
        source.connect(ctx.destination);
        source.buffer = buffer;
        let duration = buffer.duration
        source.start(0);
        return duration
};

var main = () => {
    var audioContext = new AudioContext();
    var chunks = [];
    var started = false;

    var playNewChunk = () => {
        let dur = createBuffersource(audioContext, chunks.shift());
        setInterval(playNewChunk, dur);
    }

    socket.on('chunk', (data) => {
        let decoded = audioContext.decodeAudioData(data, (buf) => {
            chunks.push(buf);
        });
        if(data.length >= 60 && !started) {
            let dur = createBuffersource(audioContext, chunks.shift());
            setInterval(playNewChunk, dur);
            started = true;
        };
    });
};

document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", main);
});