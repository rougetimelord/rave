var socket = io('/play');


var main = () => {
    console.log('hit main');

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

        if (chunks.length >= 25 && ctx.state === 'running') {
            let bufferSource = ctx.createBufferSource()

            bufferSource.buffer = chunks.shift();

            bufferSource.connect(ctx.destination);
            
            bufferSource.start(ctx.currentTime + nextPlay);

            currentPlay = ctx.currentTime;
            nextPlay = buffer.duration;
        }

        return ctx;
    });
};

let clickListener = (ctx) => {
    return () => {
        document.removeEventListener("click", clickListener);

        let remove = document.getElementsByClassName('clickThrough');
        for(let i = 0; i < remove.length; i++) {
            remove[i].classList.add('hidden');
        }

        ctx.resume();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    let ctx = main();
    document.addEventListener("click", clickListener(ctx));
});