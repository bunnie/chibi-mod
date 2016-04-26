// stopped at: getting audio contexts to play over and over again in the browser
// once that's done, use the file fetch routine to decompose a file into multiple blocks
// according to the updating protocol
// 1) compute guid, fullhash, create control packet
// 2) send successive data packets
// 3) loop 3-4 times
// 4) test integration with microcontroller demod code

// creates a modulator capable of making audio clips up to dataLength long
function modulator() {
    this.audioCtx = new AudioContext();
    this.samplerate = this.audioCtx.sampleRate;
    
    console.log("speakerSampleRate is " + this.samplerate);
    
    this.encoder = new FskEncoder(this.samplerate);

}
modulator.prototype = {
    audioCtx: null,  // AudioContext object
    samplerate: 48000,
    encoder: null,  // FskEncoder object
    outputAudioBuffer: null,  // AudioBuffer object
    uiCallback: null,  // UI object for callback
    loopCallback: null, // loop callback
    loopIndex: null, // loop index on callback

    modulate: function(data) {
	var bufLen = Math.ceil(data.length * 8 * this.encoder.samplesPerBit());
	this.outputAudioBuffer = this.audioCtx.createBuffer(1, bufLen, this.samplerate);
	
	var timeStart = performance.now();

	var outputFloatArray = this.outputAudioBuffer.getChannelData(0);
	outputFloatArray = this.encoder.modulate(data, outputFloatArray);
	this.outputAudioBuffer.copyToChannel(outputFloatArray, 0);
	
	var timeEnd = performance.now();
	var timeElapsed = timeEnd - timeStart;
	console.log("Rendered " + data.length + " data bytes in " +
		    timeElapsed.toFixed(2) + "ms");
    },
    drawWaveform: function() {
	var b = this.outputAudioBuffer.getChannelData(0);
	drawWaveformToCanvas(b, 0);
    },
    playBuffer: function(callBack) {
	if( callBack )
	    uiCallback = callBack;
	console.log("-- playAudioBuffer --");
	var bufferNode = this.audioCtx.createBufferSource();
	bufferNode.buffer = this.outputAudioBuffer;
	bufferNode.connect(this.audioCtx.destination); // Connect to speakers
	bufferNode.addEventListener("ended", audioEnded);
	playTimeStart = performance.now();
	bufferNode.start(0); // play immediately
    },
    playLoop: function(callBack, index) {
	if( callBack ) {
	    loopCallback = callBack;
	    loopIndex = index;
	}
	var bufferNode = this.audioCtx.createBufferSource();
	bufferNode.buffer = this.outputAudioBuffer;
	bufferNode.connect(this.audioCtx.destination); // Connect to speakers
	bufferNode.addEventListener("ended", audioLoopEnded);
	if( index == 1 )
	    bufferNode.start(0); // this one goes immediately
	else if( index == 2 )
	    bufferNode.start(this.audioCtx.currentTime + 0.1); // redundant send of control packet
	else if( index == 3 )
	    bufferNode.start(this.audioCtx.currentTime + 0.5); // 0.5s for flash erase
	else
	    bufferNode.start(this.audioCtx.currentTime + 0.08); // slight pause between files to allow burning
    },
    saveWAV: function() {
	exportMonoWAV(this.outputAudioBuffer.getChannelData(0), this.outputAudioBuffer.length);
    },
}

function audioLoopEnded() {
    if( loopCallback ) {
	if( ((loopIndex - 2) * 256) < self.ui.byteArray.length ) {
	    loopCallback.transcodeFile(loopIndex);
	} else {
	    if( window.ui.playCount < 2 ) {
		window.ui.playCount++;
		loopCallback.transcodeFile(0);
	    } else {
		loopCallback.audioEndCB();
	    }
	}
    }
}

var playTimeStart;

function audioEnded() {
    var playTimeEnd = performance.now();
    var timeElapsed = playTimeEnd - playTimeStart;
    console.log("got audio ended event after " + timeElapsed.toFixed(2) + "ms");
    if( uiCallback )
	uiCallback.audioEndCB();
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
