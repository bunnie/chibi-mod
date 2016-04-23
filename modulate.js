var baudrate; // initialized to 1200 by UI
var encoder, decoder;
var audioCtx = new AudioContext();
var speakerSampleRate = audioCtx.sampleRate;
var inputSampleRate;
var afskNode, audioSource, micStream;
var inputURL; // microphone, if not set
var saveState;
console.log("speakerSampleRate is " + speakerSampleRate);

function stahhhhp() {
    console.log("stopping");
    if (afskNode) {
	afskNode.removeEventListener("audioprocess", onAudioProcess);
	afskNode.disconnect();
    }
    if (micStream)
	micStream.stop();
    if (audioSource)
	audioSource.disconnect();
    
    afskNode = micStream = audioSource = null;
}

function runModem(text) {
    var dataBuffer;
    
    var mode = ui.mode;
    
    this.baudrate = "1200";
    //    dataBuffer = modulateData(text, speakerSampleRate, null);
    dataBuffer = modulateData(text, speakerSampleRate);
    
    var b = dataBuffer.getChannelData(0);
    drawWaveformToCanvas(b, 0);
    
    playAudioBuffer(dataBuffer);
    
    if( this.saveState ) {
	exportMonoWAV(dataBuffer.getChannelData(0), dataBuffer.length);
    }
}


function onAudioProcess(event) {
    var buffer = event.inputBuffer;
    var samplesIn = buffer.getChannelData(0);
    console.log("-- audioprocess data (" + samplesIn.length + " samples) --");
    
    // Can't really get at input file/microphone sample rate until first data.
    if (!decoder) {
	inputSampleRate = buffer.sampleRate;
	console.log("input sample rate is: " + inputSampleRate);
	decoder = new AfskDecoder(inputSampleRate, baudrate, onDecoderStatus);
    }
    
    decoder.demodulate(samplesIn);
    
    // Copy input to output (needed to hear input files)
    if (inputURL) {
	var samplesOut = event.outputBuffer.getChannelData(0);
	samplesOut.set(samplesIn);
    }
}

// XXX this seems to be completely broken in Firefox. The audioprocess events
// start firing, but there is no data (silence). Tried waiting for the element
// to fire loadeddata, no joy. Verified that the element can play an example
// input, it just never starts playing with this code.
// XXX Works great in Chrome!
function startAudioFile(inputURL) {
    var inputAudio = document.getElementById("inputAudio");
    
    inputAudio.addEventListener("error", onInputAudioError);
    inputAudio.addEventListener("ended", function() {
	setTimeout(function() { ui.onPowerButton();}, 500 );
    });
    inputAudio.pause();
    //inputAudio.currentTime = 0;
    inputAudio.setAttribute("src", inputURL);
    
    var audioSource = audioCtx.createMediaElementSource(inputAudio);
    
    afskNode = audioCtx.createScriptProcessor(8192); // buffersize, input channels, output channels;
    // XXX is there a gecko bug here if numSamples not evenly divisible by buffersize?
    audioSource.connect(afskNode);
    afskNode.addEventListener("audioprocess", onAudioProcess);
    // XXX Chrome seems to require connecting to a destination, or else
    // audiodata events don't fire (the script processor needs to be created
    // with output channels too)
    afskNode.connect(audioCtx.destination);
    
    inputAudio.play();
    console.log("startAudioFile playing " + inputURL);
}

function onInputAudioError(e) {
    console.log("inputAudio error: " + e);
}

function modulateData(data, samplerate) {
    var timeStart = performance.now();
    
    encoder = new FskEncoder(data, samplerate);

    var numSamples = encoder.numSamplesRequired;
    
    var dataBuffer = audioCtx.createBuffer(1, numSamples, samplerate);
    var samples = dataBuffer.getChannelData(0);
    
    encoder.modulate(samples, samplerate);
    
    var timeEnd = performance.now();
    var timeElapsed = timeEnd - timeStart;
    console.log("Rendered " + data.length + " data bytes in " +
		timeElapsed.toFixed(2) + "ms");
    return dataBuffer;
}

// Due to webaudio constraints, we're encoding the entire output buffer in
// one call. But I'm limiting that assumption to this function, so that in
// the future it can modulate on-the-fly (ie, with small buffer that may
// not begin/end exactly where a bit's sample's do!)
function modulateAfskData(data, sampleRate, completeCallback) {
    var timeStart = performance.now();
    
    var chunkSize = 4096; //number of samples to generate at a time
    
    encoder = new AfskEncoder(data, sampleRate, baudrate);
    
    var numSamples = encoder.numSamplesRequired;
    //console.log("numSamplesRequired: " + numSamples);
    
    var dataBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
    var samples = dataBuffer.getChannelData(0);
    
    var numChunks = Math.ceil(numSamples / chunkSize);
    for (var c = 0; c < numChunks; c++) {
	var begin = c * chunkSize;
	var end   = begin + chunkSize;
	// subarray() will clamp end for the last chunk if needed.
	var view = samples.subarray(begin, end);
	encoder.modulate(view);
    }
    
    var timeEnd = performance.now();
    var timeElapsed = timeEnd - timeStart;
    console.log("Rendered " + data.length + " data bytes in " +
		timeElapsed.toFixed(2) + "ms");
    return dataBuffer;
}

function playAudioBuffer(buffer) {
    console.log("-- playAudioBuffer --");
    // var audioCtx = new AudioContext();
    var bufferNode = audioCtx.createBufferSource();
    bufferNode.buffer = buffer;
    bufferNode.connect(audioCtx.destination); // Connect to speakers
    bufferNode.start(0); // play immediately
}

function exportMonoWAV(buffer, length){
    var saveData = (function () {
	var a = document.createElement("a");
	document.body.appendChild(a);
	a.style = "display: none";
	return function (data, fileName) {
            url = window.URL.createObjectURL(data);
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
	};
    }());
    
    var type = 'audio/wav';
    var dataview = encodeWAV(buffer, true);
    var audioBlob = new Blob([dataview], { type: type });
    
    saveData(audioBlob, 'modulated.wav');
}

function mergeBuffers(recBuffers, recLength){
    var result = new Float32Array(recLength);
    var offset = 0;
    for (var i = 0; i < recBuffers.length; i++){
	console.log(recBuffers[i]);
	result.set(recBuffers[i], offset);
	offset += recBuffers[i].length;
    }
    return result;
}

function floatTo16BitPCM(output, offset, input){
    for (var i = 0; i < input.length; i++, offset+=2){
	var s = Math.max(-1, Math.min(1, input[i]));
	output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function writeString(view, offset, string){
    for (var i = 0; i < string.length; i++){
	view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function encodeWAV(samples, mono){
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);
    
    sampleRate = 48000;
    
    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 32 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, mono?1:2, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 4, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 4, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);
    
    floatTo16BitPCM(view, 44, samples);
    
    return view;
}


/* ============================================================ */

function drawWaveformToCanvas(buffer, start) {
    console.log("-- drawWaveformToCanvas --");
    var canvas = document.getElementById('wavStrip');
    var strip = canvas.getContext('2d');
    
    var h = strip.canvas.height;
    var w = strip.canvas.width;
    strip.clearRect(0, 0, w, h);
    
    var y;
    // Draw scale lines at 10% interval
    strip.lineWidth = 1.0;
    strip.strokeStyle = "#55a";
    strip.beginPath();
    y = 1 * (h/10); strip.moveTo(0, y); strip.lineTo(w, y);
    y = 2 * (h/10); strip.moveTo(0, y); strip.lineTo(w, y);
    y = 3 * (h/10); strip.moveTo(0, y); strip.lineTo(w, y);
    y = 4 * (h/10); strip.moveTo(0, y); strip.lineTo(w, y);
    y = 5 * (h/10); strip.moveTo(0, y); strip.lineTo(w, y);
    y = 6 * (h/10); strip.moveTo(0, y); strip.lineTo(w, y);
    y = 7 * (h/10); strip.moveTo(0, y); strip.lineTo(w, y);
    y = 8 * (h/10); strip.moveTo(0, y); strip.lineTo(w, y);
    y = 9 * (h/10); strip.moveTo(0, y); strip.lineTo(w, y);
    strip.stroke();
    
    
    strip.strokeStyle = "#fff";
    strip.lineWidth = 1.0;
    
    var b = start;
    var lastSample = (buffer[b++] + 1) / 2; // map -1..1 to 0..1
    
    for (var x = 1; x < canvas.width; x++) {
	var sample = (buffer[b++] + 1) / 2;
	if (b > buffer.length) break;
	strip.beginPath();
	strip.moveTo(x - 1, h - lastSample * h);
	strip.lineTo(x, h - sample * h);
	strip.stroke();
	lastSample = sample;
    }
}
