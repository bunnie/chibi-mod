var ui = {
    mode: null,
    saveState: false,
    sendState: false,
    softModem: null,
    
    init: function() {
	this.sendButton = document.getElementById("send");
	this.ctrlButton = document.getElementById("ctrl");
	this.fileButton = document.getElementById("file");
	
	this.saveButton     = document.getElementById("save");
	
	var self = this;
	this.sendButton.addEventListener("click",
					 function(e) { self.onModeButton("send"); e.preventDefault(); });
	this.ctrlButton.addEventListener("click",
					 function(e) { self.onModeButton("ctrl"); e.preventDefault(); });
	this.fileButton.addEventListener("file",
					 function(e) { self.onModeButton("file"); e.preventDefault(); });
	
	this.saveButton.addEventListener("click",
					 function(e) { self.onSaveButton(); e.preventDefault(); });
	
	this.txLed    = document.getElementById("txLed");

	// errr dataLength yah.
	var dataLength = 256 + 7 + 3 + 4 + 1; // exact length of the longest packet..?
	this.softModem = new modulator(dataLength);
    },
    
    onModeButton: function(mode) {
	this.sendState = !this.sendState;
	this.mode = mode;
	/*      
		if (mode == "send") {
		if( this.sendState ) {
		this.sendButton.setAttribute("selected", "");
		this.txLed.setAttribute("lit", "");
		
		runModem("00000000000000000000000");
		
		} else {
		this.sendButton.removeAttribute("selected", "");
		this.txLed.removeAttribute("lit");
		
		stahhhhp();
		}
	*/
	this.sendButton.setAttribute("selected", "");
	this.txLed.setAttribute("lit", "");

	if(mode == "send") {

	    var preamble = [00,00,00,00,0xaa,0x55,0x42];
	    var sector = [0x01, 0x80, 0x04]; // version code + two bytes for sector offset
	    // note to self: version codes are now checked by Rx so let's not mess with that anymore
	    // 256 byte payload, preamble, sector offset + 4 bytes hash + 1 byte stop
	    var packetlen = 256 + preamble.length + sector.length + 4 + 1;
	    var buffer = new Uint8Array(packetlen);
	    var i = 0;
	    for( i = 0; i < preamble.length; i++ ) {
		buffer[i] = preamble[i];
	    }
	    for( var j = 0; i < sector.length + preamble.length; i++, j++ ) {
		buffer[i] = sector[j];
	    }
	    for( ; i < packetlen - 1 - 4; i++ ) {
		//buffer[i] = i & 0xff;
		//buffer[i] = 0x55;
		buffer[i] = Math.floor((Math.random() * 256));
	    }

	    hash = murmurhash3_32_gc(buffer.subarray(preamble.length, 256 + preamble.length + sector.length), 0xdeadbeef);
	    console.log("buffer hash: " + hash);
	    buffer[i++] = hash & 0xFF;
	    buffer[i++] = (hash >> 8) & 0xFF;
	    buffer[i++] = (hash >> 16) & 0xFF;
	    buffer[i++] = (hash >> 24) & 0xFF
	    buffer[i] = 0xFF;  // terminate with 0xFF to let last bit demodulate correctly
	} else if( mode == "ctrl" ) {
	    // must be control packet, eh? heheh.
	    
	    var preamble = [00,00,00,00,0xaa,0x55,0x42];
	    var sector = [0x81];   // version 1, control bit 7 is set
	    var packetlen = 24 + preamble.length + sector.length + 4 + 1;
	    var buffer = new Uint8Array(packetlen);
	    var i = 0;
	    for( i = 0; i < preamble.length; i++ ) {
		buffer[i] = preamble[i];
	    }
	    for( var j = 0; i < sector.length + preamble.length; i++, j++ ) {
		buffer[i] = sector[j];
	    }
	    for( ; i < packetlen - 1 - 4; i++ ) {
		//buffer[i] = i & 0xff;
		//buffer[i] = 0x55;
		buffer[i] = Math.floor((Math.random() * 256));
	    }

	    hash = murmurhash3_32_gc(buffer.subarray(preamble.length, 24 + preamble.length + sector.length), 0xdeadbeef);
	    console.log("buffer hash: " + hash);
	    buffer[i++] = hash & 0xFF;
	    buffer[i++] = (hash >> 8) & 0xFF;
	    buffer[i++] = (hash >> 16) & 0xFF;
	    buffer[i++] = (hash >> 24) & 0xFF
	    buffer[i] = 0xFF;  // terminate with 0xFF to let last bit demodulate correctly
	} else if( mode == "file" ) {
	    var fileReq = new XMLHttpRequest();
	    fileReq.open("GET", "http://bunniefoo.com/chibi/microtest1.bin", true);
	    fileReq.responseType = "arraybuffer";

	    fileReq.onload = function(oEvent) {
		var arrayBuffer = fileReq.response;
		if(arrayBuffer) {
		    var byteArray = new Uint8Array(arrayBuffer);
		    // do nothing for now!
		}
	    }
	} else {
	    throw "unknown onModeButton: " + mode;
	}

	this.softModem.modulate(buffer);
	this.softModem.playBuffer(this);
	this.softModem.drawWaveform();
	
	if( this.saveState ) {
	    this.softModem.saveWAV();
	}
    },

    audioEndCB: function() {
	this.sendButton.removeAttribute("selected", "");
	this.txLed.removeAttribute("lit");
    },
    onSaveButton: function() {
	this.saveState = !this.saveState;
	if (this.saveState) {
	    this.saveButton.setAttribute("selected", "");
	} else {
	    this.saveButton.removeAttribute("selected");
	}
    },
}
