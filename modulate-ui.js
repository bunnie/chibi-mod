var ui = {
    mode: null,
    saveState: false,
    sendState: false,
    modData: null,
    
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
	this.fileButton.addEventListener("click",
					 function(e) { self.onModeButton("file"); e.preventDefault(); });
	
	this.saveButton.addEventListener("click",
					 function(e) { self.onSaveButton(); e.preventDefault(); });
	
	this.txLed    = document.getElementById("txLed");

	this.modData = new modulator();
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
	if( mode == "send") {
	    this.sendButton.setAttribute("selected", "");
	} else if( mode == "ctrl") {
	    this.ctrlButton.setAttribute("selected", "");
	} else if( mode == "file") {
	    this.fileButton.setAttribute("selected", "");
	}
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
	    fileReq.open("GET", "microtest1.bin", true);
	    fileReq.responseType = "arraybuffer";

	    fileReq.onload = function(oEvent) {
		var arrayBuffer = fileReq.response;
		if(arrayBuffer) {
		    var byteArray = new Uint8Array(arrayBuffer);
		    // do nothing for now!
		    var fileLen = byteArray.length;
		    var blocks = Math.ceil(fileLen / 256);

		    var ctlPacket = self.makeCtlPacket(byteArray);
		}
	    }
	    fileReq.send(); // this request is asynchronous
	} else {
	    throw "unknown onModeButton: " + mode;
	}

	if( mode != "file" ) {
	    this.modData.modulate(buffer);
	    this.modData.playBuffer(this);
	    this.modData.drawWaveform();
	    
	    if( this.saveState ) {
		this.modData.saveWAV();
	    }
	}
    },

    makeCtlPacket: function(data) {
	// parameters from microcontroller spec. Probably a better way
	// to do this in javascript, but I don't know how (seems like "const" could be used, but not universal)
	var bytePreamble = [00,00,00,00,0xaa,0x55,0x42];
	var byteVersion = [0x81];
	var pktLength = data.length;
	var byteLength = [data & 0xFF, (data >> 8) & 0xFF, (data >> 16) & 0xFF, (data >> 24) & 0xFF];
	var pktFullhash = murmurhash3_32_gc(data, 0x032dbabe);
	var pktGuid = CryptoJS.MD5(data);

	var packetlen = bytePreamble.length + byteVersion.length + 24 + 4 + 1;
	var buffer = new Uint8Array(packetlen);
	
    },
    audioEndCB: function() {
	this.sendButton.removeAttribute("selected", "");
	this.ctrlButton.removeAttribute("selected", "");
	this.fileButton.removeAttribute("selected", "");
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
