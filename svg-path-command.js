/**
 * SVG Path Command
 * Convert the d attribute string of path or glyph elements 
 * in SVG to be more readable by humans.
 */

const convertSVGPathCommands = function(commands = '', options = {}) {
	log(`SVG Path Command start`);
	log(`\t commands: ${commands}`);
	/*
	 * Check options
	 */
	
	/**
	 * Five options, off by default, for how the commands get processed
	 *		convertSmooth - convert smooth Béziers to regular Béziers
	 *		convertQuadraticToCubic - quadratic Béziers (one control point) converted
	 *			to cubic Béziers (two control points)
	 *		convertArcToCubic - approximate the Arc with cubic Bézier paths
	 *		addLineBreaks - each command and it's parameters is on it's own line
	 *		returnObject - return an object representation of the commands, as 
	 *			opposed to a single string representing the d attribute value
	 */
	options.convertSmooth = !!options.convertSmooth;
	options.convertQuadraticToCubic = !!options.convertQuadraticToCubic;
	options.convertArcToCubic = !!options.convertArcToCubic;
	options.addLineBreaks = !!options.addLineBreaks;
	options.returnObject = !!options.returnObject;

	// Check for commands parameter
	if(commands.length === 0 || commands.length === 1){
		if(options.returnObject) return {command: 'Z'};
		else return 'Z';
	}
	

	/*
	 * Main conversions
	 */

	// Take the command string and split into an array containing 
	// command objects, comprised of the command letter and parameters
	let data = chunkCommands(commands);

	// Convert relative commands mlhvcsqtaz to absolute commands MLHVCSQTAZ
	data = convertToAbsolute(data);

	// Convert chains of parameters to individual command / parameter pairs
	data = splitChainParameters(data);

	// Convert Horizontal and Vertical LineTo commands to regular LineTo commands
	data = convertLineTo(data);

	// Convert Smooth Cubic Bézier commands S to regular Cubic Bézier commands C
	// Convert Smooth Quadratic Bézier commands T to regular Quadratic Bézier commands Q
	if(options.convertSmooth) data = convertSmoothBeziers(data);

	// Convert Quadratic Bézier Q commands to Cubic Bézier commands C
	if(options.convertQuadraticToCubic) data = convertQuadraticBeziers(data);

	// Convert Elliptical Arc commands A to Cubic Bézier commands C
	if(options.convertArcToCubic) data = convertArcs(data);

	if(options.returnObject){
		return data;
	} else {
		let dAttribute = generateDAttribute(data, options.addLineBreaks);
		return dAttribute;
	}


	/*
	 * Main Conversion Functions
	 */

	function chunkCommands(commands){
		let data = commands.replace(/\s+/g, ',');
		let result = [];
		let commandStart;

		// Find the first valid command
		for(let j=0; j<data.length; j++) {
			if(isCommand(data.charAt(j))) {
				commandStart = j;
				break;
			}

			// No valid commands found
			return [{command: 'Z'}];
		}

		// Loop through the string
		for(let i=commandStart+1; i<data.length; i++) {
			if(isCommand(data.charAt(i))){
				result.push({
					command: data.charAt(commandStart),
					parameters: chunkParameters(data.substring(commandStart+1, i))
				});

				commandStart = i;
			}
		}

		// Fencepost
		if(commandStart < data.length-1){
			result.push({
				command: data.charAt(commandStart),
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


	function convertToAbsolute(data){

		return data;
	}

	function splitChainParameters(data){

		return data;
	}

	function convertLineTo(data){

		return data;
	}

	function convertSmoothBeziers(data){

		return data;
	}

	function convertQuadraticBeziers(data){

		return data;
	}

	function convertArcs(data){

		return data;
	}

	function generateDAttribute(data, addLineBreaks){
		let result = '';

		for(let i=0; i<data.length; i++){
			if(data[i].command){
				if(addLineBreaks) result += '\n\t';
				result += data[i].command;
				result += ' ';
				
				if(data[i].parameters){
					result += data[i].parameters.join(', ');
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

	function isRelativeCommand(c){
		if('mlcszhvaqt'.indexOf(c) > -1) return true;
		return false;
	}

	function log(message) {
		console.log(message);
	}
};