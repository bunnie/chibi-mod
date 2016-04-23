var ui = {
    mode: null,
    saveState: false,
    sendState: false,
    
    init: function() {
	this.sendButton = document.getElementById("send");
	
	this.saveButton     = document.getElementById("save");
	
	var self = this;
	this.sendButton.addEventListener("click",
					 function(e) { self.onModeButton("send"); e.preventDefault(); });
	
	this.saveButton.addEventListener("click",
					 function(e) { self.onSaveButton(); e.preventDefault(); });
	
	this.txLed    = document.getElementById("txLed");
	
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

	var preamble = [00,00,00,00,0xaa,0x55,0x42];
	var sector = [0x01, 0x80, 0x04]; // version code + two bytes for sector offset
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
	    buffer[i] = 0x55;
	}

	hash = murmurhash3_32_gc(buffer.subarray(preamble.length, 256 + preamble.length + sector.length), 0xdeadbeef);
	buffer[i++] = hash & 0xFF;
	buffer[i++] = (hash >> 8) & 0xFF;
	buffer[i++] = (hash >> 16) & 0xFF;
	buffer[i++] = (hash >> 24) & 0xFF
	buffer[i] = 0xFF;  // terminate with 0xFF to let last bit demodulate correctly
	
	runModem(buffer);
	
	this.sendButton.removeAttribute("selected", "");
	this.txLed.removeAttribute("lit");
	/*
	  } else {
	  throw "unknown onModeButton: " + mode;
	  }*/
    },
    
    onSaveButton: function() {
	this.saveState = !this.saveState;
	saveState = this.saveState;  // global
	if (this.saveState) {
	    //runModem(dummy);
	    this.saveButton.setAttribute("selected", "");
	} else {
	    //stahhhhp();
	    this.saveButton.removeAttribute("selected");
	}
    },
}
