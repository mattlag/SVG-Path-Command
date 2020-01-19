/**
 * Validate Options
 * These options apply to both convertSVGPathCommands and convertSVGDocument
 * Five options, off by default, for how the commands get processed
 * @param {object} options - conversion options
 * @param {boolean} options.addLineBreaks - each command and it's parameters is on it's own line
 * @param {boolean} options.splitChains - chained parameters will be split to have their own command
 * @param {boolean} options.convertLines - changes H and V shorthand to regular LineTo notation
 * @param {boolean} options.convertSmooth - convert smooth Béziers to regular Béziers
 * @param {boolean} options.convertQuadraticToCubic - quadratic Béziers (one control point) converted
 * 											to cubic Béziers (two control points)
 * @param {boolean} options.convertArcToCubic - approximate the Arc with cubic Bézier paths
 * @param {boolean} options.returnObject - return an object representation of the commands, as 
 * 								opposed to a single string representing the d attribute value
 * @param {boolean} options.correctFloatingPoint - rounds numbers that appear to be the result of bad 
 * 								floating point math
 */
const validateOptions = function(options){
	options.addLineBreaks = !!options.addLineBreaks;
	options.splitChains = !!options.splitChains;
	options.convertLines = !!options.convertLines;
	options.convertSmooth = !!options.convertSmooth;
	options.convertQuadraticToCubic = !!options.convertQuadraticToCubic;
	options.convertArcToCubic = !!options.convertArcToCubic;
	options.returnObject = !!options.returnObject;
	options.correctFloatingPoint = !!options.correctFloatingPoint;

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

	// Convert relative commands mlhvcsqtaz to absolute commands MLHVCSQTAZ
	commands = convertToAbsolute(commands);

	// Convert chains of parameters to individual command / parameter pairs
	if(options.splitChains) commands = splitChainParameters(commands);

	// Convert Horizontal and Vertical LineTo commands to regular LineTo commands
	if(options.convertLines) commands = convertLineTo(commands);

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
		// log(`Start chunkCommands`);
		let result = [];
		let commandStart = false;

		// Clean up whitespace
		let data = dAttribute.replace(/\s+/g, ',');
		
		// Clean up negative numbers, and scientific notation numbers
		data = data.replace(/e-/g, '~~~');
		data = data.replace(/-/g, ',-');
		data = data.replace(/~~~/g, 'e-');

		// Clean up commas
		data = data.replace(/,+/g,',');

		// log(data);

		// Find the first valid command
		for(let j=0; j<data.length; j++) {
			if(isCommand(data.charAt(j))) {
				commandStart = j;
				// log(`First valid command ${data.charAt(j)} found at ${j}`);
				break;
			}
		}
		
		if(commandStart === false) {
			// No valid commands found
			// log(`No valid commands found, returning Z`);
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
		// log(`Start convertToAbsolute: ${commands.length} command chunks`);
		let result = [];
		let newCommand = {};
		let i;
		let currentPoint = {x: 0, y: 0};
		let newPoint = {x: 0, y: 0};
		let command;

		for(let c=0; c<commands.length; c++){
			command = commands[c];

			if(command.type === 'm' || command.type === 'l'){
				// MoveTo and LineTo
				newCommand = {
					type: (command.type === 'm' ? 'M' : 'L'),
					parameters: []
				};

				for(i=0; i<command.parameters.length; i+=2) {
					newPoint.x = (command.parameters[i+0] + currentPoint.x);
					newPoint.y = (command.parameters[i+1] + currentPoint.y);
					newCommand.parameters.push(newPoint.x);
					newCommand.parameters.push(newPoint.y);
					currentPoint.x = newPoint.x;
					currentPoint.y = newPoint.y;
				}

				result.push(newCommand);

				
			} else if(command.type === 'h'){
				// Horizontal line to
				newCommand = {
					type: 'H',
					parameters: []
				};

				for(i=0; i<command.parameters.length; i++) {
					newPoint.x = command.parameters[i] + currentPoint.x;
					newCommand.parameters.push(newPoint.x);
					currentPoint.x = newPoint.x;
				}

				result.push(newCommand);


			} else if(command.type === 'v'){
				// Horizontal line to
				newCommand = {
					type: 'V',
					parameters: []
				};

				for(i=0; i<command.parameters.length; i++) {
					newPoint.y = command.parameters[i] + currentPoint.y;
					newCommand.parameters.push(newPoint.y);
					currentPoint.y = newPoint.y;
				}

				result.push(newCommand);

				
			} else if(command.type === 'c'){
				// Cubic Bezier
				newCommand = {
					type: 'C',
					parameters: []
				};

				for(i=0; i<command.parameters.length; i+=6) {
					newCommand.parameters.push(command.parameters[i+0] + currentPoint.x);
					newCommand.parameters.push(command.parameters[i+1] + currentPoint.y);
					newCommand.parameters.push(command.parameters[i+2] + currentPoint.x);
					newCommand.parameters.push(command.parameters[i+3] + currentPoint.y);
					newPoint.x = command.parameters[i+4] + currentPoint.x;
					newPoint.y = command.parameters[i+5] + currentPoint.y;
					newCommand.parameters.push(newPoint.x);
					newCommand.parameters.push(newPoint.y);
					currentPoint.x = newPoint.x;
					currentPoint.y = newPoint.y;
				}

				result.push(newCommand);


			} else if(command.type === 's'){
				// Smooth Cubic Bezier
				newCommand = {
					type: 'S',
					parameters: []
				};

				for(i=0; i<command.parameters.length; i+=4) {
					newCommand.parameters.push(command.parameters[i+0] + currentPoint.x);
					newCommand.parameters.push(command.parameters[i+1] + currentPoint.y);
					newPoint.x = command.parameters[i+2] + currentPoint.x;
					newPoint.y = command.parameters[i+3] + currentPoint.y;
					newCommand.parameters.push(newPoint.x);
					newCommand.parameters.push(newPoint.y);
					currentPoint.x = newPoint.x;
					currentPoint.y = newPoint.y;
				}

				result.push(newCommand);


			} else if(command.type === 'q'){
				// Quadratic Bezier
				newCommand = {
					type: 'Q',
					parameters: []
				};

				for(i=0; i<command.parameters.length; i+=4) {
					newCommand.parameters.push(command.parameters[i+0] + currentPoint.x);
					newCommand.parameters.push(command.parameters[i+1] + currentPoint.y);
					newPoint.x = command.parameters[i+2] + currentPoint.x;
					newPoint.y = command.parameters[i+3] + currentPoint.y;
					newCommand.parameters.push(newPoint.x);
					newCommand.parameters.push(newPoint.y);
					currentPoint.x = newPoint.x;
					currentPoint.y = newPoint.y;
				}

				result.push(newCommand);


			} else if(command.type === 't'){
				// Smooth Quadratic Bezier
				newCommand = {
					type: 'T',
					parameters: []
				};

				for(i=0; i<command.parameters.length; i+=2) {
					newPoint.x = command.parameters[i+0] + currentPoint.x;
					newPoint.y = command.parameters[i+1] + currentPoint.y;
					newCommand.parameters.push(newPoint.x);
					newCommand.parameters.push(newPoint.y);
					currentPoint.x = newPoint.x;
					currentPoint.y = newPoint.y;
				}

				result.push(newCommand);


			} else if(command.type === 'a'){
				// Arc to
				newCommand = {
					type: 'A',
					parameters: []
				};
				// log(`Arc to relative parameters\n${command.parameters}`);
				for(i=0; i<command.parameters.length; i+=7) {
					newCommand.parameters.push(command.parameters[i+0]);
					newCommand.parameters.push(command.parameters[i+1]);
					newCommand.parameters.push(command.parameters[i+2]);
					newCommand.parameters.push(command.parameters[i+3]);
					newCommand.parameters.push(command.parameters[i+4]);
					newPoint.x = command.parameters[i+5] + currentPoint.x;
					newPoint.y = command.parameters[i+6] + currentPoint.y;
					newCommand.parameters.push(newPoint.x);
					newCommand.parameters.push(newPoint.y);
					currentPoint.x = newPoint.x;
					currentPoint.y = newPoint.y;
				}

				result.push(newCommand);


			} else if(command.type === 'z'){
				// End path
				result.push({type: 'Z'});


			} else {
				// command is absolute, push it
				result.push(command);
				currentPoint = getNewEndPoint(currentPoint, command);
			}

		}

		return result;
	}


	function splitChainParameters(commands){
		let result = [];
		let command;
		let p;

		for(let c=0; c<commands.length; c++){
			command = commands[c];
			if(command.type){
				switch(command.type) {
					case 'h':
					case 'v':
					case 'm':
					case 'l':
					case 't':
					case 'q':
					case 's':
					case 'c':
					case 'a':
						console.warn(`Breaking chains is only possible on absolute commands.\nSkipping command ${command.type}!`);
						result.push(command);
						break;

					case 'Z':
					case 'z':
						result.push({type: 'Z'});
						break;

					case 'H':
					case 'V':
						for(p=0; p<command.parameters.length; p+=2) {
							result.push({type: command.type, parameters: [command.parameters[p]]});
						}
						break;

					case 'M':
						// Chained MoveTo commands are treated like LineTo commands
						for(p=0; p<command.parameters.length; p+=2) {
							result.push({type: (p<2? 'M' : 'L'), parameters: [command.parameters[p], command.parameters[p+1]]});
						}
						break;

					case 'L':
					case 'T':
						for(p=0; p<command.parameters.length; p+=2) {
							result.push({type: command.type, parameters: [command.parameters[p], command.parameters[p+1]]});
						}
						break;

					case 'Q':
					case 'S':
						for(p=0; p<command.parameters.length; p+=4) {
							result.push({type: command.type, parameters: [command.parameters[p], command.parameters[p+1], command.parameters[p+2], command.parameters[p+3]]});
						}
						break;
					
					case 'C':
						for(p=0; p<command.parameters.length; p+=6) {
							result.push({type: command.type, parameters: [command.parameters[p], command.parameters[p+1], command.parameters[p+2], command.parameters[p+3], command.parameters[p+4], command.parameters[p+5]]});
						}
						break;

					case 'A':
						for(p=0; p<command.parameters.length; p+=7) {
							result.push({type: command.type, parameters: [command.parameters[p], command.parameters[p+1], command.parameters[p+2], command.parameters[p+3], command.parameters[p+4], command.parameters[p+5], command.parameters[p+6]]});
						}
						break;
				}
			}
		}

		return result;
	}


	function convertLineTo(commands){
		// log(`Start convertLineTo`);
		let result = [];
		let command;
		let currentPoint = {x: 0, y: 0};
		let p;

		for(let c=0; c<commands.length; c++){
			command = commands[c];
			// log(`doing ${command.type} [${command.parameters.join()}]`);

			if(command.type === 'h'){
				console.warn(`Converting Horizontal and Vertical commands is only possible on absolute commands.\nSkipping command h!`);
				result.push(command);
				
			} else if(command.type === 'v'){
				console.warn(`Converting Horizontal and Vertical commands is only possible on absolute commands.\nSkipping command v!`);
				result.push(command);
			
			} else if (command.type === 'H') {
				for(p=0; p<command.parameters.length; p++){
					result.push({type: 'L', parameters: [command.parameters[p], currentPoint.y]});
				}
			
			} else if (command.type === 'V') {
				for(p=0; p<command.parameters.length; p++){
					result.push({type: 'L', parameters: [currentPoint.x, command.parameters[p]]});
				}

			} else {
				result.push(command);
			}

			// log(`pushed ${result[result.length-1].type} [${result[result.length-1].parameters.join()}]`);
			currentPoint = getNewEndPoint(currentPoint, command);
			// log(`new end point ${currentPoint.x}, ${currentPoint.y}`);
		}

		return result;
	}


	function convertSmoothBeziers(commands){
		// log(`Start convertSmoothBeziers`);
		let result = [];
		let command;
		let currentPoint = {x: 0, y: 0};
		let previousHandle = {x: 0, y: 0};
		let smoothHandle = {x: 0, y: 0};
		let previousResult;

		for(let c=0; c<commands.length; c++){
			command = commands[c];

			if(command.type === 's' || command.type === 't'){
				console.warn(`Converting smooth Bezier curve commands is only possible on absolute commands.\nSkipping command ${command.type}!`);
				result.push(command);

			} else if (command.type === 'S' || command.type === 'T') {
				previousResult = result.length > 1? result[result.length-1] : false;

				// This allows for using a smooth cubic after a quadratic,
				// or a smooth quadratic after a cubic... which may not be standard
				if(previousResult && previousResult.type === 'C'){
					previousHandle.x = previousResult.parameters[2];
					previousHandle.y = previousResult.parameters[3];
				} else if(previousResult && previousResult.type === 'Q'){
					previousHandle.x = previousResult.parameters[0];
					previousHandle.y = previousResult.parameters[1];
				} else {
					previousHandle.x = currentPoint.x;
					previousHandle.y = currentPoint.y;
				}

				smoothHandle = {
					x : ((currentPoint.x - previousHandle.x) + currentPoint.x),
					y : ((currentPoint.y - previousHandle.y) + currentPoint.y)
				};

				if(command.type === 'S') {
					result.push({
						type: 'C',
						parameters: [
							smoothHandle.x,
							smoothHandle.y,
							command.parameters[0],
							command.parameters[1],
							command.parameters[2],
							command.parameters[3]
						]
					});
				} else if (command.type === 'T'){
					result.push({
						type: 'Q',
						parameters: [
							smoothHandle.x,
							smoothHandle.y,
							command.parameters[0],
							command.parameters[1]
						]
					});
				}
				
			} else {
				result.push(command);
			}

			currentPoint = getNewEndPoint(currentPoint, command);
		}
		
		return result;
	}

	function convertQuadraticBeziers(commands){

		return commands;
	}

	function convertArcs(commands){

		return commands;
	}

	function generateDAttribute(commands, addLineBreaks){
		let result = '';
		let command;
		let p;
		let linebreak = addLineBreaks? '\n\t' : '';

		for(let i=0; i<commands.length; i++){
			command = commands[i];
			if(command.type){

				result += `${linebreak}${command.type}`;
				
				switch(command.type) {
					case 'Z':
					case 'z':
						result += '  ';
						result += linebreak;
						break;

					case 'H':
					case 'h':
					case 'V':
					case 'v':
						for(p=0; p<command.parameters.length; p+=2) {
							result += ` ${param(p)}`;
						}
						result += '  ';
						break;

					case 'M':
					case 'm':
					case 'L':
					case 'l':
					case 'T':
					case 't':
						for(p=0; p<command.parameters.length; p+=2) {
							if(addLineBreaks && p > 1) result += '\n\t ';
							result += ` ${param(p)},${param(p+1)}`;
						}
						result += '  ';
						break;

					case 'Q':
					case 'q':
					case 'S':
					case 's':
						for(p=0; p<command.parameters.length; p+=4) {
							if(addLineBreaks && p > 1) result += '\n\t ';
							result += ` ${param(p)},${param(p+1)} ${param(p+2)},${param(p+3)}`;
						}
						result += '  ';
						break;
					
					case 'C':
					case 'c':
						for(p=0; p<command.parameters.length; p+=6) {
							if(addLineBreaks && p > 1) result += '\n\t ';
							result += ` ${param(p)},${param(p+1)} ${param(p+2)},${param(p+3)} ${param(p+4)},${param(p+5)}`;
						}
						result += '  ';
						break;

					case 'A':
					case 'a':
						for(p=0; p<command.parameters.length; p+=7) {
							if(addLineBreaks && p > 1) result += '\n\t ';
							result += ` ${param(p)} ${param(p+1)} ${param(p+2)} ${param(p+3)} ${param(p+4)} ${param(p+5)},${param(p+6)}`;
						}
						result += '  ';
						break;
				}
			}
		}

		function param(num){
			let p = command.parameters[num];
			return options.correctFloatingPoint? numSan(p) : p;
		}

		function numSan(num){
			let dec = num.toString().split('.');

			if(dec[1]){
				let pos = -1;

				if(dec[1].indexOf('999999') > -1) {
					pos = dec[1].indexOf('999999');
				}
				if(dec[1].indexOf('000000') > -1) {
					pos = dec[1].indexOf('000000');
				}
				
				if(pos > -1) return num.toFixed(pos);
			}

			return num;
		}

		result = result.trim();
		if(addLineBreaks) result = `\n\t${result}\n`;
		return result;
	}


	/*
	 * Helper Functions
	 */

	function getNewEndPoint(currentPoint, command){
		
		let returnPoint = {
			x: currentPoint.x || 0,
			y: currentPoint.y || 0
		};
		let p;

		switch(command.type) {
			case 'Z':
			case 'z':
				break;
			
			case 'H':
				returnPoint.x = command.parameters[command.parameters.length-1];
				break;

			case 'V':
				returnPoint.y = command.parameters[command.parameters.length-1];
				break;

			case 'M':
			case 'L':
			case 'C':
			case 'S':
			case 'A':
			case 'Q':
			case 'T':
				returnPoint.x = command.parameters[command.parameters.length-2];
				returnPoint.y = command.parameters[command.parameters.length-1];
				break;
			
			case 'h':
				for(p=0; p<command.parameters.length; p++){
					returnPoint.x += command.parameters[p];
				}
				break;
				
			case 'v':
				for(p=0; p<command.parameters.length; p++){
					returnPoint.y += command.parameters[p];
				}
				break;

			case 'm':
			case 'l':
			case 't':
				for(p=0; p<command.parameters.length; p+=2){
					returnPoint.x += command.parameters[p+0];
					returnPoint.y += command.parameters[p+1];
				}
				break;

			case 'q':
			case 's':
				for(p=0; p<command.parameters.length; p+=4){
					returnPoint.x += command.parameters[p+2];
					returnPoint.y += command.parameters[p+3];
				}
				break;

			case 'c':
				for(p=0; p<command.parameters.length; p+=6){
					returnPoint.x += command.parameters[p+4];
					returnPoint.y += command.parameters[p+5];
				}
				break;

			case 'a':
				for(p=0; p<command.parameters.length; p+=7){
					returnPoint.x += command.parameters[p+5];
					returnPoint.y += command.parameters[p+6];
				}
				break;
		}

		return returnPoint;
	}

	function isCommand(c){
		// log(`isCommand passed ${c}`);
		if('MmLlCcSsZzHhVvAaQqTt'.indexOf(c) > -1) return true;
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