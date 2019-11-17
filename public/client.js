var socket = io('/play');
var paused = false;
var draw, logo, defaultR = 39.309525;
var samples = [0], animID = 0;

/**
 * A helper function that returns the average of an array.
 * 
 * @param {Number[]} arr The array of numbers to be averaged.
 */
let arrayAvg = arr => {
    let sum = arr.reduce(function(a, b) { return a + b; });
    return sum / arr.length;
};

/**
 * A helper function to batch add attributes to a node.
 * 
 * @param {HTMLElement|SVGElement} e The DOM or SVG node to add attributes 
 *                                   to
 * @param {Object.<string,string>} attrs An object of attribute names and 
 *                                       values
 */
var attachAttributes = (e, attrs) => {
    for(let key in attrs) {
        e.setAttribute(key, attrs[key]);
    }
}

/**
 * Updates and draws visuals.
 * 
 * @param {AnalyserNode} analyser The analyser node to get data from
 */
var analyserUpdate = (analyser) => {
    //Get the data needed
    let array = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(array);

    //Average the past and current data
    let avg = arrayAvg(array);
    let rollingAvg = arrayAvg(samples);

    //Calculate the face's new radius within bounds (25 - 43)
    let faceValue = 
        defaultR + ((avg == -Infinity) ? 0 : avg - rollingAvg) / 7.5;
    faceValue = (faceValue < 25) ? 25 : faceValue;
    faceValue = (faceValue > 43) ? 43 : faceValue;

    /* Change teeth to a different color if theres more than a 25% difference
    between now and the past */
    let teeth = logo.getElementsByClassName('tooth');
    if(Math.abs(
        ((avg == -Infinity) ? 0 : avg - rollingAvg) / rollingAvg
    ) > 0.25){
            for(let i = 0; i < teeth.length; i++){
                attachAttributes(teeth[i], {
                    'fill': '#ff4343',
                    'stroke': '#ff4343'
                });
            }
    } else {
            for(let i = 0; i < teeth.length; i++){
                attachAttributes(teeth[i], {
                    'fill': '#000',
                    'stroke': '#000'
                });
            }
    }

    //Change the radius
    let face = logo.getElementById('face');
    face.setAttribute('r', faceValue.toString());

    //Push this average on to the stack
    if(samples.push(avg) > 10){samples.shift()};

    //Call recursively
    draw = requestAnimationFrame(()=>{analyserUpdate(analyser)});
}

/**
 * Starts the web audio context and returns it for later.
 * 
 * @returns {{'analyser': AnalyserNode, 'element': HTMLAudioElement, 'src': String, 'context': AudioContext, 'source': MediaElementAudioSourceNode}} nodes
 */
var main = () => {
    let ctx = new AudioContext();

    let audioElement = new Audio();
    audioElement.crossOrigin = 'anonymous';

    let analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.3;

    //Set up literally all of the key value pairs that we need (just in case)
    return {'context': ctx, 'element': audioElement, 'analyser': analyser,
        'source': '', 'src': ''};
};

/**
 * Pauses and unpauses audio on click event.
 * 
 * This is wonky because it is a listener that is called initially with an
 * argument, which means that this function never gets called again (thanks 
 * wonkyevent listener syntax). So instead of getting called once, and only 
 * once I pass in pointers to everything audio related and return a function
 * that gets called for every event.
 * 
 * @param {{'analyser': AnalyserNode, 'element': HTMLAudioElement, 'src': String, 'context': AudioContext, 'source': MediaElementAudioSourceNode}} nodes 
 *          The collection of items needed to make stuff work.
 * 
 * @returns {Function} The actual stop button listener.
 */
let stopListener = (nodes) => {
    return () => {
        paused = !paused;
        document.getElementById('control').classList.add(
            (paused) ? 'playBtn' : 'stopBtn');
        document.getElementById('control').classList.remove(
            (paused) ? 'stopBtn' : 'playBtn')
        if(paused){
            nodes['element'].pause();
            nodes['element'].src = '';
            //Stop drawing visuals when nothing is playing.
            window.cancelAnimationFrame(draw);
        } else {
            nodes['element'].src = nodes['src'];
            nodes['element'].addEventListener('canplay',
                /**
                 * Resumes audio after pausing.
                 * 
                 * I remove the source of the element so that users don't get
                 * infinitely lagged during pauses.
                 */
                function resumeAudio(){
                    nodes['element'].removeEventListener('canplay', 
                        resumeAudio);
                    nodes['element'].play();
                    //Restart visuals
                    analyserUpdate(nodes['analyser']);
                }
            );
        }
    }
}

/**
 * Sends the chat message to the server.
 * 
 * @param {MouseEvent} event The event that got triggered.
 */
let sendMessage = (event) => {
    event.preventDefault();
    console.log(event)
    if(typeof(event.keyCode) == 'undefined' || event.keyCode === 13){
        let input = document.getElementById('msg');
        let message = input.value;
    
        if(message !== '') {
            socket.emit('msg', message);
    
            input.value = '';
        } else {
            input.classList.add('empty');
    
            setTimeout( () => {
                input.classList.remove('empty');
            }, 2000);
        }
    }
}

// Gotta wait for the DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    //The document starts with some elements with inline CSS, so get rid of that
    let removeStyle = document.getElementsByClassName('hidden');
    for(let i = 0; i < removeStyle.length; i++) {
        removeStyle[i].removeAttribute('style');
    }

    //Call our audio constructor
    let audioNodes = main();

    //Wait for user interaction.
    document.addEventListener('click',
        /**
         * This function is necessary so that we can pass chrome's autoplay
         * policy. It also changes element visibility from fresh load to 
         * playing.
         */
        function clickListener(){
            document.removeEventListener('click', clickListener);

            let remove = document.getElementsByClassName('clickThrough');
            for(let i = 0; i < remove.length; i++) {
                remove[i].classList.add('hidden', 'hide');
            }

            let add = document.getElementsByClassName('clickIn');
            for(let i = 0; i < add.length; i++) {
                add[i].classList.remove('hidden');
            }

            audioNodes['context'].resume();
            audioNodes['element'].play();

            logo = document.getElementById('logo').contentDocument;

            analyserUpdate(audioNodes['analyser']);
        }
    );

    //Register the stop button listener.
    document.getElementById('control').addEventListener('click', 
                                        stopListener(audioNodes));

    document.getElementById('send').addEventListener('click', sendMessage);
    document.getElementById('msg').addEventListener('keyup', sendMessage);

    //Wait for the stream address from the server
    socket.on('addr', 
        /**
         * Just grabs the address shoves it into the audio element and goes.
         * 
         * @param {String} data The address to get audio from.
         */
        (data) => {
            //We add all of this to bypass browser detection.
            let addr = data + '/;?type=http&nocache=3';

            /* //Testing code
            let addr = 'song.mp3';
            audioNodes['element'].loop = !0; */

            //Feed the audio element its source.
            audioNodes['src'] = addr;
            audioNodes['element'].src = addr;

            //Once the audio can play go through
            audioNodes['element'].addEventListener('canplay',
                /**
                 * Connects everything together and starts.
                 * 
                 * This function can only be called once, otherwise there's an
                 * error due to reattaching the same source node to the 
                 * destination.
                 */
                function startPlay() {
                    audioNodes['element'].removeEventListener(
                        'canplay', startPlay);

                    let audioSrc = 
                        audioNodes['context'].createMediaElementSource(
                            audioNodes['element']);

                    //Stow the source just in case.
                    audioNodes['source'] = audioSrc
                    
                    //Connect everything
                    audioSrc.connect(audioNodes['analyser']);
                    audioNodes['analyser'].connect(
                        audioNodes['context'].destination);
                }
            );
        }
    );

    socket.on('msg',
        /**
         * This is where I would put the cool effects if I had em.
         * 
         * @param {String} data The message sent.
         */
        (data) => {
            let message = document.createElement('div');
            message.classList.add('chat_msg', 'rtl');
            message.innerText = data;
            message.style.setProperty('--transition-time', (Math.random() * 7 + 3) + 's')
            message.style.setProperty('--chat-top', Math.floor(Math.random() * 55 + 5) + 'vh')
            message.style.setProperty('--chat-size', (Math.random() + 1.5) + 'rem')
            document.body.appendChild(message);
        }
    );
});