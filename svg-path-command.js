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
	log(`> Convert SVG Path Commands start`);
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
		return dAttribute;
	}


	/*
	 * Main Conversion Functions
	 */

	function chunkCommands(dAttribute){
		let data = dAttribute.replace(/\s+/g, ',');
		let result = [];
		let commandStart;

		// Find the first valid command
		for(let j=0; j<data.length; j++) {
			if(isCommand(data.charAt(j))) {
				commandStart = j;
				break;
			}

			// No valid commands found
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
		let result = [];
		let currentX = 0;
		let currentY = 0;
		let currentCommand;
		let latestParameters;

		for(let i=0; i<commands.length; i++){
			currentCommand = commands[i];

			if(currentCommand.type === 'm' || currentCommand.type === 'l'){
				// MoveTo and LineTo
				result.push({
					type: currentCommand.toUpperCase(),
					parameters: [
						(currentCommand.parameters[0] + currentX),
						(currentCommand.parameters[1] + currentY)
					]
				});

				currentX = result[result.length-1].parameters[0];
				currentY = result[result.length-1].parameters[1];
				
			} else if(currentCommand.type === 'h'){
				// Horizontal line to
				result.push({
					type: 'H',
					parameters: [currentCommand.parameters[0] + currentX]
				});

				currentX = result[result.length-1].parameters[0];

			} else if(currentCommand.type === 'v'){
				// Horizontal line to
				result.push({
					type: 'V',
					parameters: [currentCommand.parameters[0] + currentX]
				});
				
				currentY = result[result.length-1].parameters[0];
				
			} else if(currentCommand.type === 'c'){
				// Cubic Bezier

			} else if(currentCommand.type === 's'){
				// Smooth Cubic Bezier

			} else if(currentCommand.type === 'q'){
				// Quadratic Bezier

			} else if(currentCommand.type === 't'){
				// Smooth Quadratic Bezier

			} else if(currentCommand.type === 'a'){
				// Arc to

			} else if(currentCommand.type === 'z'){
				// End path
				result.push({type: 'Z'})

			} else {
				// command is absolute, just push it
				result.push(commands[i]);
				latestParameters = result[result.length-1].parameters;
				currentX = latestParameters[latestParameters.length-2];
				currentY = latestParameters[latestParameters.length-1];
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
					result += ' ';
				}
			}
		}

		return result;
	}


	/*
	 * Helper Functions
	 */
	function isCommand(c){
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

	function log(message) {
		console.log(message);
	}
};

/**
 * Convert SVG Document
 * Convert all elements in a SVG document
 * @param {string} document - text from an SVG file
 * @param {object} options - conversion options
 */
const convertSVGDOcument = function(document = '', options = {}) {
	log(`> Convert SVG Document start`);
	log(`\t commands: ${commands}`);
	/*
	 * Check arguments
	 */
	
	// Check options
	options = validateOptions(options);

	// Check for document
	if(!document) return '<svg></svg>';

	/*
	 * stuff
	 */

	return document;
};