var ui = {
    mode: null,
    saveState: false,
    sendState: false,
    modData: null,
    byteArray: null,
    fileSelect: 1,
    fileName: "http://bunniefoo.com/moddev/microtest1.bin",
    playCount: 0,
    
    init: function() {
	this.sendButton = document.getElementById("send");
	this.ctrlButton = document.getElementById("ctrl");
	this.fileButton = document.getElementById("file");

	this.fileShortButton = document.getElementById("short");
	this.fileTest1Button = document.getElementById("test1");
	this.fileTest2Button = document.getElementById("test2");

	this.doFileSelect();
	
	this.saveButton     = document.getElementById("save");
	
	var self = this;
	this.sendButton.addEventListener("click",
					 function(e) { self.onModeButton("send"); e.preventDefault(); });
	this.ctrlButton.addEventListener("click",
					 function(e) { self.onModeButton("ctrl"); e.preventDefault(); });
	this.fileButton.addEventListener("click",
					 function(e) { self.onModeButton("file"); e.preventDefault(); });
	
	this.fileShortButton.addEventListener("click",
					      function(e) { self.onModeButton("short"); e.preventDefault(); });
	this.fileTest1Button.addEventListener("click",
					      function(e) { self.onModeButton("test1"); e.preventDefault(); });
	this.fileTest2Button.addEventListener("click",
					      function(e) { self.onModeButton("test2"); e.preventDefault(); });


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
	if( mode != "test1" && mode != "short" && mode != "test2" )
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
		buffer[i] = 0x00;
		//buffer[i] = Math.floor((Math.random() * 256));
	    }

	    hash = murmurhash3_32_gc(buffer.subarray(preamble.length, 256 + preamble.length + sector.length), 0xdeadbeef);
	    console.log("buffer hash: " + hash);
	    buffer[i++] = hash & 0xFF;
	    buffer[i++] = (hash >> 8) & 0xFF;
	    buffer[i++] = (hash >> 16) & 0xFF;
	    buffer[i++] = (hash >> 24) & 0xFF
	    buffer[i] = 0xFF;  // terminate with 0xFF to let last bit demodulate correctly

	    // now stripe the buffer to ensure transitions for baud sync
	    // don't stripe the premable or the hash
	    for( i = 8; i < (buffer.length - 5); i++ ) {
		if( (i % 16) == 14 )
		    buffer[i] ^= 0x55;
		else if ( (i % 16) == 6 )
		    buffer[i] ^= 0xaa;
	    }

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
		//buffer[i] = 0x00;
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
	    fileReq.open("GET", this.fileName, true);
	    fileReq.responseType = "arraybuffer";

	    fileReq.onload = function(oEvent) {
		var arrayBuffer = fileReq.response;
		if(arrayBuffer) {
		    self.ui.byteArray = new Uint8Array(arrayBuffer);
		    
		    self.ui.playCount = 0;
		    self.ui.transcodeFile(0);
		}
	    }
	    fileReq.send(); // this request is asynchronous
	} else if( mode == "short" ) { // there has to be a better way to do radio buttons, but meh
	    this.fileSelect = 0;
	    this.doFileSelect();
	} else if( mode == "test1" ) {
	    this.fileSelect = 1;
	    this.doFileSelect();
	} else if( mode == "test2" ) {
	    this.fileSelect = 2;
	    this.doFileSelect();
	} else {
	    throw "unknown onModeButton: " + mode;
	}

	if( mode == "send" || mode == "ctrl" ) {
	    this.modData.modulate(buffer);
	    this.modData.playBuffer(this);
	    this.modData.drawWaveform();
	    
	    if( this.saveState ) {
		this.modData.saveWAV();
	    }
	}
    },

    doFileSelect: function() {
	switch( this.fileSelect ) {
	case 0:
	    this.fileShortButton.setAttribute("selected", "");
	    this.fileTest1Button.removeAttribute("selected");
	    this.fileTest2Button.removeAttribute("selected");
	    this.fileName = "http://bunniefoo.com/moddev/shortfile.bin";
	    break;
	case 1:
	    this.fileShortButton.removeAttribute("selected");
	    this.fileTest1Button.setAttribute("selected", "");
	    this.fileTest2Button.removeAttribute("selected");
	    this.fileName = "http://bunniefoo.com/moddev/microtest1.bin";
	    break;
	case 2:
	    this.fileShortButton.removeAttribute("selected");
	    this.fileTest1Button.removeAttribute("selected");
	    this.fileTest2Button.setAttribute("selected", "");
	    this.fileName = "http://bunniefoo.com/moddev/microtest2.bin";
	    break;
	default:
	    throw "unknown fileSelect mode: " + thisfileSelect;
	    break;
	}
    },

    transcodeFile: function(index) {
	var fileLen = self.ui.byteArray.length;
	var blocks = Math.ceil(fileLen / 256);

	if( index == 0  || index == 1 ) {
	    var ctlPacket = self.ui.makeCtlPacket(self.ui.byteArray.subarray(0, fileLen));

	    self.ui.modData.modulate(ctlPacket);
	    self.ui.modData.playLoop(self.ui, index + 1);
	    self.ui.modData.drawWaveform();
	} else {
	    // index starts at 2, due to two sends of the control packet up front
	    var i = index - 2;
	    // handle whole blocks
	    if( i < blocks - 1 ) {
		var dataPacket = self.ui.makeDataPacket(self.ui.byteArray.subarray(i * 256, i * 256 + 256), i);
		self.ui.modData.modulate(dataPacket);
		self.ui.modData.playLoop(self.ui, index + 1);
		self.ui.modData.drawWaveform();
	    } else {
		// handle last block
		var dataPacket = self.ui.makeDataPacket(self.ui.byteArray.subarray(i * 256, fileLen), i);
		self.ui.modData.modulate(dataPacket);
		self.ui.modData.playLoop(self.ui, index + 1);
		self.ui.modData.drawWaveform();
	    }

	}
    },
    makeCtlPacket: function(data) {
	// parameters from microcontroller spec. Probably a better way
	// to do this in javascript, but I don't know how (seems like "const" could be used, but not universal)
	var bytePreamble = [00,00,00,00,0xaa,0x55,0x42];
	var byteVersion = [0x81];
	var pktLength = data.length;
	var byteLength = [pktLength & 0xFF, (pktLength >> 8) & 0xFF, 
			  (pktLength >> 16) & 0xFF, (pktLength >> 24) & 0xFF];
	var pktFullhash = murmurhash3_32_gc(data, 0x32d0babe);
	var guidStr = SparkMD5.hash(String.fromCharCode.apply(null,data), false);
	var pktGuid = [];
	var i;
	for( i = 0; i < guidStr.length-1; i += 2 ) {
	    pktGuid.push(parseInt(guidStr.substr(i,2),16));
	}

	var packetlen = bytePreamble.length + byteVersion.length + byteLength.length + 4 + pktGuid.length + 4 + 1;
	var pkt = new Uint8Array(packetlen);
	var pktIndex = 0;
	for( i = 0; i < bytePreamble.length; i++ ) {
	    pkt[pktIndex++] = bytePreamble[i];
	}
	pkt[pktIndex++] = byteVersion[0];
	for( i = 0; i < byteLength.length; i++ ) {
	    pkt[pktIndex++] = byteLength[i];
	}
	pkt[pktIndex++] = pktFullhash & 0xFF;
	pkt[pktIndex++] = (pktFullhash >> 8) & 0xFF;
	pkt[pktIndex++] = (pktFullhash >> 16) & 0xFF;
	pkt[pktIndex++] = (pktFullhash >> 24) & 0xFF;
	for( i = 0; i < 16; i++ ) {
	    pkt[pktIndex++] = pktGuid[i];
	}

	var hash = murmurhash3_32_gc(pkt.subarray(bytePreamble.length, 24 + bytePreamble.length + byteVersion.length), 0xdeadbeef);
	console.log("buffer hash: " + hash);
	pkt[pktIndex++] = hash & 0xFF;
	pkt[pktIndex++] = (hash >> 8) & 0xFF;
	pkt[pktIndex++] = (hash >> 16) & 0xFF;
	pkt[pktIndex++] = (hash >> 24) & 0xFF
	pkt[pktIndex] = 0xFF;  // terminate with 0xFF to let last bit demodulate correctly
	
	return pkt;
    },
    makeDataPacket: function(dataIn, blocknum) {
	var data;
	var i;
	if( dataIn.length != 256 ) {
	    data = new Uint8Array(256);
	    for( i = 0; i < dataIn.length; i ++ ) {
		data[i] = dataIn[i];
	    }
	    for( ; i < 256; i++ ) {
		data[i] = 0xFF; // 1's pad out the final data packet
	    }
	} else {
	    data = dataIn;
	}
	var preamble = [00,00,00,00,0xaa,0x55,0x42];
	var sector = [0x01, blocknum & 0xFF, (blocknum >> 8) & 0xFF];   // version 1
	// 256 byte payload, preamble, sector offset + 4 bytes hash + 1 byte stop
	var packetlen = 256 + preamble.length + sector.length + 4 + 1;

	var buffer = new Uint8Array(packetlen);
	for( i = 0; i < preamble.length; i++ ) {
	    buffer[i] = preamble[i];
	}
	for( var j = 0; i < sector.length + preamble.length; i++, j++ ) {
	    buffer[i] = sector[j];
	}
	for( j = 0; i < packetlen - 1 - 4; i++, j++ ) {
	    //buffer[i] = i & 0xff;
	    //buffer[i] = 0x55;
	    buffer[i] = data[j];
	}
	
	hash = murmurhash3_32_gc(buffer.subarray(preamble.length, 256 + preamble.length + sector.length), 0xdeadbeef);
	console.log("buffer hash: " + hash);
	buffer[i++] = hash & 0xFF;
	buffer[i++] = (hash >> 8) & 0xFF;
	buffer[i++] = (hash >> 16) & 0xFF;
	buffer[i++] = (hash >> 24) & 0xFF
	buffer[i] = 0xFF;  // terminate with 0xFF to let last bit demodulate correctly

	// now stripe the buffer to ensure transitions for baud sync
	// don't stripe the premable or the hash
	for( i = 8; i < (buffer.length - 5); i++ ) {
	    if( (i % 16) == 14 )
		buffer[i] ^= 0x55;
	    else if ( (i % 16) == 6 )
		buffer[i] ^= 0xaa;
	}
	
	return buffer;
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
