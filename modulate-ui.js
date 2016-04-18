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
    this.powerLed = document.getElementById("powerLed");

    // Set defaults
  },

  onModeButton: function(mode) {
    this.sendState = !this.sendState;
      this.mode = mode;
/*      
      if (mode == "send") {
	  if( this.sendState ) {
	      this.sendButton.setAttribute("selected", "");
	      this.txLed.setAttribute("lit", "");
	      this.powerLed.setAttribute("lit", "");

	      runModem("00000000000000000000000");
	      
	  } else {
	      this.sendButton.removeAttribute("selected", "");
	      this.txLed.removeAttribute("lit");
	      this.powerLed.removeAttribute("lit");
	      
	      stahhhhp();
	  }
*/
      this.sendButton.setAttribute("selected", "");
      this.txLed.setAttribute("lit", "");
      this.powerLed.setAttribute("lit", "");

      var buffer = new Uint8Array(128);
      for( var i = 0; i < 128; i++ ) {
	  buffer[i] = 0x00;
      }

      runModem(buffer);
	      
      this.sendButton.removeAttribute("selected", "");
      this.txLed.removeAttribute("lit");
      this.powerLed.removeAttribute("lit");
/*
    } else {
      throw "unknown onModeButton: " + mode;
    }*/
  },

  onBaud: function(targetNode) {
    var baud = targetNode.getAttribute("value");

    this.baud50.removeAttribute("checked");
    this.baud150.removeAttribute("checked");
    this.baud300.removeAttribute("checked");
    this.baud1200.removeAttribute("checked");

    targetNode.setAttribute("checked", "");

    this.setBaudRate(baud);
    baudrate = baud; // global
  },

  onInputSource: function(targetNode) {
    this.inputSource0.removeAttribute("checked");
    this.inputSource1.removeAttribute("checked");
    this.inputSource2.removeAttribute("checked");
    this.inputSource3.removeAttribute("checked");
    this.inputSource4.removeAttribute("checked");

    targetNode.setAttribute("checked", "");

    var source = targetNode.getAttribute("value");
    console.log("Input source set to " + (source ? source : "microphone"));
    inputURL = source;

    if (targetNode.hasAttribute("baud")) {
      inputBaud = targetNode.getAttribute("baud");
      if (inputBaud == 1200)
        this.onBaud(this.baud1200);
      else if (inputBaud == 300)
        this.onBaud(this.baud300);
      else
        alert("ERP! Can't sent baud " + inputBaud + " for this source!");

      console.log("Input source set baud rate to " + inputBaud);
    }
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

  _optionsHidden: true,
  onOptionsButton: function() {
    // Just toggle visibility. Seems .hidden doesn't work with flex or pos:fixed?
    var div = this.optionsContainer
    this._optionsHidden = !this._optionsHidden;
    if (this._optionsHidden)
      div.setAttribute("hidden", "");
    else
      div.removeAttribute("hidden");
  },

  _debugChecked: false,
  onDebug: function() {
    this._debugChecked = !this._debugChecked;
    if (this._debugChecked)
      this.debugCheck.setAttribute("checked", "");
    else
      this.debugCheck.removeAttribute("checked");

    // TODO: actually make logging conditional on this :)
  },


  _inputTimer: null,
  onTextInput: function() {
     if (this._inputTimer) {
       clearTimeout(this._inputTimer);
     }
     this._inputTimer = setTimeout(this.processTextInput.bind(this), 750);
  },

  _prevInput: "",
  processTextInput: function() {
    if (!this.powerState)
      return;

    var newInput = "";
    var currInput = this.textInput.value;
    // If the old input (previously sent) is still present, only
    // send whatever has been appended. Otherwise, uhm, just resend
    // the whole thing. Could just make this all a onkeypress handler,
    // especially if we were streaming live, but will instead packetize.
    if (currInput.indexOf(this._prevInput, 0) === 0) {
      // currInput begins with prevInput
      newInput = currInput.substring(this._prevInput.length, currInput.length);
    } else {
      newInput = currInput;
    }

    runModem(newInput);

    this._prevInput = currInput;
  },

  onRandomText: function() {
    var text = randomIpsum() + "\n\n";
    this.textInput.value += text;
    // XXX scroll to bottom
    this.processTextInput();
  },

  setCarrierDetect: function(detected) {
    if (detected)
      this.cdLed.setAttribute("lit", "");
    else
      this.cdLed.removeAttribute("lit");
  },

  setBaudRate: function(baud) {
    var padding = "";
    if (baud < 10000) padding += " ";
    if (baud < 1000)  padding += " ";
    if (baud < 100)   padding += " ";
    if (baud < 10)    padding += " ";
    this.baudRate.textContent = padding + baud + " baud";
  },

  padText: function(text, width) {
    while (text.length < width)
      text += " ";
    return text;
  },

  _lineNum: 0,
  printTextLine: function(text) {
    var lines = text.split('\n');

    for (var i = 0; i < lines.length; i++) {
      var chit = (this._lineNum++ % 2) ? "│ │" : "│o│";
      var line = chit + " " + this.padText(lines[i], 80) + " " + chit + "\n";
      this.outputContainer.textContent += line;
    }

    // Scroll to the bottom
    this.outputContainer.scrollTop = this.outputContainer.scrollHeight;
  },
}
