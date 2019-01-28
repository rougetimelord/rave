var socket = io('/play');


var main = () => {
    document.body.removeEventListener("click", main);
    var ctx = new AudioContext();
    var chunks = []
    var nextPlay = 0;
    var currentPlay = 0;

    socket.on('chunk', (data) => {
        console.log('got chunk');

        let channel0 = new Float32Array(data.left);
        let channel1 = new Float32Array(data.right);

        let buffer = ctx.createBuffer(2, channel0.length, 44000)

        let a = buffer.getChannelData(0);
        let b = buffer.getChannelData(1);
        for(let i = 0; i < channel0.length; i++){
            a[i] = channel0[i];
            b[i] = channel1[i];
        }

        chunks.push(buffer);

        if (chunks. length >= 25) {
            let bufferSource = ctx.createBufferSource()

            bufferSource.buffer = chunks.shift();

            bufferSource.connect(ctx.destination);

            bufferSource.start(ctx.currentTime + nextPlay);

            currentPlay = ctx.currentTime;
            nextPlay = buffer.duration;
        }
    });
};

document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", main);
});