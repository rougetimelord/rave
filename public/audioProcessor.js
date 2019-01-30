class audioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];

        this.port.postMessage({
            'left': input[0],
            'right': input[1],
            'full': input
        });

        return true;
    }
}

registerProcessor('streamGetter', audioProcessor);