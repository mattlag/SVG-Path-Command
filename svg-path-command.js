/**
 * Validate Options
 * These options apply to both convertSVGPathCommands and convertSVGDocument
 * Five options, off by default, for how the commands get processed
 * @param {object} options - conversion options
 * @param {boolean} options.convertSmooth - convert smooth Béziers to regular Béziers
 * @param {boolean} options.convertQuadraticToCubic - quadratic Béziers (one control point) converted
 * 											to cubic Béziers (two control points)
 * @param {boolean} options.convertArcToCubic - approximate the Arc with cubic Bézier paths
 * @param {boolean} options.addLineBreaks - each command and it's parameters is on it's own line
 * @param {boolean} options.returnObject - return an object representation of the commands, as 
 * 								opposed to a single string representing the d attribute value
 */
const validateOptions = function(options){
	options.convertSmooth = !!options.convertSmooth;
	options.convertQuadraticToCubic = !!options.convertQuadraticToCubic;
	options.convertArcToCubic = !!options.convertArcToCubic;
	options.addLineBreaks = !!options.addLineBreaks;
	options.returnObject = !!options.returnObject;

	return options;
};


/**
 * Convert SVG Path Commands
 * Convert the d attribute string of path or glyph element 
 * in to be more readable by humans.
 * @param {string} commands - the d attribute text
 * @param {object} options - conversion options
 */
const convertSVGPathCommands = function(dAttribute = '', options = {}) {
	log(`\n\n>>>>>>>>>>>>>>>>>>>>>>>\nConvert SVG Path Commands start`);
	log(`\t dAttribute: ${dAttribute}`);
	/*
	 * Check arguments
	 */
	
	// Check options
	options = validateOptions(options);

	// Check for commands
	if(dAttribute.length === 0 || dAttribute.length === 1){
		if(options.returnObject) return {type: 'Z'};
		else return 'Z';
	}
	

	/*
	 * Main conversions
	 */

	// Take the command string and split into an array containing 
	// command objects, comprised of the command letter and parameters
	let commands = chunkCommands(dAttribute);
	log(`After chunkCommands`);
	log(commands);

	// Convert relative commands mlhvcsqtaz to absolute commands MLHVCSQTAZ
	commands = convertToAbsolute(commands);
	log(`After convertToAbsolute`);
	log(commands);

	// Convert chains of parameters to individual command / parameter pairs
	commands = splitChainParameters(commands);

	// Convert Horizontal and Vertical LineTo commands to regular LineTo commands
	commands = convertLineTo(commands);

	// Convert Smooth Cubic Bézier commands S to regular Cubic Bézier commands C
	// Convert Smooth Quadratic Bézier commands T to regular Quadratic Bézier commands Q
	if(options.convertSmooth) commands = convertSmoothBeziers(commands);

	// Convert Quadratic Bézier Q commands to Cubic Bézier commands C
	if(options.convertQuadraticToCubic) commands = convertQuadraticBeziers(commands);

	// Convert Elliptical Arc commands A to Cubic Bézier commands C
	if(options.convertArcToCubic) commands = convertArcs(commands);

	if(options.returnObject){
		return commands;
	} else {
		let dAttribute = generateDAttribute(commands, options.addLineBreaks);
		log(`RETURNING\n${dAttribute}`);
		return dAttribute;
	}


	/*
	 * Main Conversion Functions
	 */

	function chunkCommands(dAttribute){
		log(`Start chunkCommands`);
		let data = dAttribute.replace(/\s+/g, ',');
		let result = [];
		let commandStart = false;
		log(data);

		// Find the first valid command
		for(let j=0; j<data.length; j++) {
			if(isCommand(data.charAt(j))) {
				commandStart = j;
				log(`First valid command ${data.charAt(j)} found at ${j}`);
				break;
			}
		}
		
		if(commandStart === false) {
			// No valid commands found
			log(`No valid commands found, returning Z`);
			return [{type: 'Z'}];
		}

		// Loop through the string
		for(let i=commandStart+1; i<data.length; i++) {
			if(isCommand(data.charAt(i))){
				result.push({
					type: data.charAt(commandStart),
					parameters: chunkParameters(data.substring(commandStart+1, i))
				});

				commandStart = i;
			}
		}

		// Fencepost
		if(commandStart < data.length-1){
			result.push({
				type: data.charAt(commandStart),
				parameters: chunkParameters(data.substring(commandStart+1, data.length))
			});
		}

		// Validate and chunk numeric parameters
		function chunkParameters(parameters = '') {
			let validatedParameters = [];

			if(parameters.charAt(0) === ',') {
				parameters = parameters.substring(1);
			}

			if(parameters.charAt(parameters.length-1) === ',') {
				parameters = parameters.substring(0, parameters.length-1);
			}

			if(parameters.length > 0) {
				parameters = parameters.split(',');
				validatedParameters = parameters.map(x => Number(x));
			}
	
			return validatedParameters;
		}

		return result;
	}


	function convertToAbsolute(commands){
		log(`Start convertToAbsolute: ${commands.length} command chunks`);
		let result = [];
		let newCommand = {};
		let i;
		let currentX = 0;
		let currentY = 0;
		let newX = 0;
		let newY = 0;
		let currentCommand;

		for(let c=0; c<commands.length; c++){
			currentCommand = commands[c];
			log(`... doing command ${currentCommand.type}`);

			if(currentCommand.type === 'm' || currentCommand.type === 'l'){
				// MoveTo and LineTo
				newCommand = {
					type: (currentCommand.type === 'm' ? 'M' : 'L'),
					parameters: []
				};

				for(i=0; i<currentCommand.parameters.length; i+=2) {
					newX = (currentCommand.parameters[i+0] + currentX);
					newY = (currentCommand.parameters[i+1] + currentY);
					newCommand.parameters.push(newX);
					newCommand.parameters.push(newY);
					currentX = newX;
					currentY = newY;
				}

				result.push(newCommand);

				
			} else if(currentCommand.type === 'h'){
				// Horizontal line to
				newCommand = {
					type: 'H',
					parameters: []
				};

				for(i=0; i<currentCommand.parameters.length; i++) {
					newX = currentCommand.parameters[i] + currentX;
					newCommand.parameters.push(newX);
					currentX = newX;
				}

				result.push(newCommand);


			} else if(currentCommand.type === 'v'){
				// Horizontal line to
				newCommand = {
					type: 'V',
					parameters: []
				};

				for(i=0; i<currentCommand.parameters.length; i++) {
					newY = currentCommand.parameters[i] + currentY;
					newCommand.parameters.push(newY);
					currentY = newY;
				}

				result.push(newCommand);

				
			} else if(currentCommand.type === 'c'){
				// Cubic Bezier
				newCommand = {
					type: 'C',
					parameters: []
				};

				for(i=0; i<currentCommand.parameters.length; i+=6) {
					newCommand.parameters.push(currentCommand.parameters[i+0] + currentX);
					newCommand.parameters.push(currentCommand.parameters[i+1] + currentY);
					newCommand.parameters.push(currentCommand.parameters[i+2] + currentX);
					newCommand.parameters.push(currentCommand.parameters[i+3] + currentY);
					newX = currentCommand.parameters[i+4] + currentX;
					newY = currentCommand.parameters[i+5] + currentY;
					newCommand.parameters.push(newX);
					newCommand.parameters.push(newY);
					currentX = newX;
					currentY = newY;
				}

				result.push(newCommand);


			} else if(currentCommand.type === 's'){
				// Smooth Cubic Bezier
				newCommand = {
					type: 'S',
					parameters: []
				};

				for(i=0; i<currentCommand.parameters.length; i+=4) {
					newCommand.parameters.push(currentCommand.parameters[i+0] + currentX);
					newCommand.parameters.push(currentCommand.parameters[i+1] + currentY);
					newX = currentCommand.parameters[i+2] + currentX;
					newY = currentCommand.parameters[i+3] + currentY;
					newCommand.parameters.push(newX);
					newCommand.parameters.push(newY);
					currentX = newX;
					currentY = newY;
				}

				result.push(newCommand);


			} else if(currentCommand.type === 'q'){
				// Quadratic Bezier
				newCommand = {
					type: 'Q',
					parameters: []
				};

				for(i=0; i<currentCommand.parameters.length; i+=4) {
					newCommand.parameters.push(currentCommand.parameters[i+0] + currentX);
					newCommand.parameters.push(currentCommand.parameters[i+1] + currentY);
					newX = currentCommand.parameters[i+2] + currentX;
					newY = currentCommand.parameters[i+3] + currentY;
					newCommand.parameters.push(newX);
					newCommand.parameters.push(newY);
					currentX = newX;
					currentY = newY;
				}

				result.push(newCommand);


			} else if(currentCommand.type === 't'){
				// Smooth Quadratic Bezier
				newCommand = {
					type: 'T',
					parameters: []
				};

				for(i=0; i<currentCommand.parameters.length; i+=2) {
					newX = currentCommand.parameters[i+0] + currentX;
					newY = currentCommand.parameters[i+1] + currentY;
					newCommand.parameters.push(newX);
					newCommand.parameters.push(newY);
					currentX = newX;
					currentY = newY;
				}

				result.push(newCommand);


			} else if(currentCommand.type === 'a'){
				// Arc to
				newCommand = {
					type: 'A',
					parameters: []
				};
				log(`Arc to relative parameters\n${currentCommand.parameters}`);
				for(i=0; i<currentCommand.parameters.length; i+=7) {
					newCommand.parameters.push(currentCommand.parameters[i+0]);
					newCommand.parameters.push(currentCommand.parameters[i+1]);
					newCommand.parameters.push(currentCommand.parameters[i+2]);
					newCommand.parameters.push(currentCommand.parameters[i+3]);
					newCommand.parameters.push(currentCommand.parameters[i+4]);
					newX = currentCommand.parameters[i+5] + currentX;
					newY = currentCommand.parameters[i+6] + currentY;
					newCommand.parameters.push(newX);
					newCommand.parameters.push(newY);
					currentX = newX;
					currentY = newY;
				}

				result.push(newCommand);


			} else if(currentCommand.type === 'z'){
				// End path
				result.push({type: 'Z'});


			} else {
				// command is absolute, push it
				result.push(currentCommand);
	
				if (currentCommand.type === 'H') {
					currentX = currentCommand.parameters[currentCommand.parameters.length-1];
				} else if(currentCommand.type === 'V'){
					currentY = currentCommand.parameters[currentCommand.parameters.length-1];
				} else if (currentCommand.type !== 'Z') {
					currentX = currentCommand.parameters[currentCommand.parameters.length-2];
					currentY = currentCommand.parameters[currentCommand.parameters.length-1];
				}
			}

		}

		return result;
	}


	function splitChainParameters(commands){

		return commands;
	}

	function convertLineTo(commands){

		return commands;
	}

	function convertSmoothBeziers(commands){

		return commands;
	}

	function convertQuadraticBeziers(commands){

		return commands;
	}

	function convertArcs(commands){

		return commands;
	}

	function generateDAttribute(commands, addLineBreaks){
		let result = '';

		for(let i=0; i<commands.length; i++){
			if(commands[i].type){
				if(addLineBreaks) result += '\n\t';
				result += commands[i].type;
				result += ' ';
				
				if(commands[i].parameters){
					result += commands[i].parameters.join(', ');
					result += '  ';
				}
			}
		}

		return result;
	}


	/*
	 * Helper Functions
	 */
	function isCommand(c){
		// log(`isCommand passed ${c}`);
		if('MmLlCcSsZzHhVvAaQqTt'.indexOf(c) > -1) return true;
		return false;
	}

	function isCommandEqualTo(target, search){
		return search.indexOf(target) > -1;
	}

	function isRelativeCommand(c){
		if('mlcszhvaqt'.indexOf(c) > -1) return true;
		return false;
	}
};

/**
 * Convert SVG Document
 * Convert all elements in a SVG document
 * @param {string} document - text from an SVG file
 * @param {object} options - conversion options
 */
const convertSVGDocument = function(document = '', options = {}) {
	log(`\n\n>>>>>>>>>>>>>>>>>>>>>>>\nConvert SVG Document start`);
	log(`\t document:\n${document}`);
	/*
	 * Check arguments
	 */
	
	// Check options
	options = validateOptions(options);

	// Check for document
	if(!document) return '<svg></svg>';

	/*
	 * Main process
	 */

	let svgDocument = readXML(document);
	log(`PRE svgDocument`);
	log(svgDocument);
	
	let dAttributeElements = svgDocument.querySelectorAll('[d]');
	let elem;
	for(let i=0; i<dAttributeElements.length; i++) {
		elem = dAttributeElements[i];
		elem.setAttribute('d', convertSVGPathCommands(elem.getAttribute('d'), options));
	}

	log(`POST svgDocument`);
	log(svgDocument);

	return svgDocument.rootElement.outerHTML;

	function readXML(inputXML){
		var XMLdoc, XMLerror;
	
		if (typeof window.DOMParser !== 'undefined') {
			XMLdoc = (new window.DOMParser()).parseFromString(inputXML, 'text/xml');
		} else if (typeof window.ActiveXObject !== 'undefined' && new window.ActiveXObject('Microsoft.XMLDOM')) {
			XMLdoc = new window.ActiveXObject('Microsoft.XMLDOM');
			XMLdoc.async = 'false';
			XMLdoc.loadXML(inputXML);
		} else {
			console.warn('No XML document parser found.');
			XMLerror = new SyntaxError('No XML document parser found.');
			throw XMLerror;
		}
	
		var parsererror = XMLdoc.getElementsByTagName('parsererror');
		if (parsererror.length) {
			var msgcon = XMLdoc.getElementsByTagName('div')[0].innerHTML;
			XMLerror = new SyntaxError(trim(msgcon));
			throw XMLerror;
		}

		return XMLdoc;
	}
};


function log(message) {
	console.log(message);
}