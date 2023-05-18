var _UI = {
	fileContents: `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="300px" height="300px" viewBox="0 0 300 300" style="enable-background:new 0 0 300 300;" xml:space="preserve">
  <g>
    <path fill="#FFEEBB" d="M15,150 A115,115,180,1,1,285,150,115,115,180,1,1,15,150"/>
  </g>
  <g>
    <path d="M150,10 C72.7,10,10,72.7,10,150 s62.7,140,140,140 s140-62.7,140-140 S227.3,10,150,10z M150,280 c-71.8,0-130-58.2-130-130 S78.2,20,150,20 s130,58.2,130,130 S221.8,280,150,280z"/>
  </g>
  <g>
    <path d="M123.7,112.9 c-3.3,0-6-2.7-6-6 c0-10.1-8.2-18.4-18.4-18.4 S81,96.8,81,106.9 c0,3.3-2.7,6-6,6 s-6-2.7-6-6 c0-16.7,13.6-30.4,30.4-30.4 s30.4,13.6,30.4,30.4 C129.7,110.3,127,112.9,123.7,112.9z"/>
    <path d="M225,112.9 c-3.3,0-6-2.7-6-6 c0-10.1-8.2-18.4-18.4-18.4 s-18.4,8.2-18.4,18.4 c0,3.3-2.7,6-6,6 s-6-2.7-6-6 c0-16.7,13.6-30.4,30.4-30.4 S231,90.2,231,106.9 C231,110.3,228.3,112.9,225,112.9z"/>
  </g>
  <g>
    <path fill="white" d="M51,167 l198-1 l-32,66 l-69,26 l-67-28"/>
    <path d="M49,159 c0,55.5,45.5,100.4,101,100.4 s101-45,101-100.4H49z M150,248.4 c-48,0-87-35.3-87-78.9 c22.3,0,132.6,0,174,0 C237,213.1,198,248.4,150,248.4z"/>
  </g>
</svg>
`,
	postSource: '',
};

function main() {
	document.body.addEventListener('drop', dropFile);
	_UI.postSource = convertSVGDocument(_UI.fileContents, getOptions());

	document.getElementById(`pre-img`).innerHTML = _UI.fileContents;
	document.getElementById(`pre-src`).innerHTML = _UI.fileContents;
	document.getElementById(`post-img`).innerHTML = _UI.postSource;
	document.getElementById(`post-src`).innerHTML = _UI.postSource;
}

function refresh() {
	updateMessage('REFRESH');
	_UI.fileContents = decode(document.getElementById(`pre-src`).value);
	updateMessage(_UI.fileContents);
	try {
		_UI.postSource = convertSVGDocument(_UI.fileContents, getOptions());
	} catch (err) {
		updateMessage('Error reading the SVG document');
		return;
	}

	document.getElementById(`pre-img`).innerHTML = _UI.fileContents;
	document.getElementById(`pre-src`).innerHTML = _UI.fileContents;
	document.getElementById(`post-img`).innerHTML = _UI.postSource;
	document.getElementById(`post-src`).innerHTML = _UI.postSource;
}

function updateMessage(msg) {
	console.log(msg);
}

function decode(content = '') {
	content = content.replace(/&lt;/gi, '<');
	content = content.replace(/&gt;/gi, '>');
	content = content.replace(/\\"/gi, "'");
	return content;
}

function getOptions() {
	return {
		convertAbsolute: document.getElementById('check-convertAbsolute').checked,
		addLineBreaks: document.getElementById('check-addLineBreaks').checked,
		splitChains: document.getElementById('check-splitChains').checked,
		convertLines: document.getElementById('check-convertLines').checked,
		convertSmooth: document.getElementById('check-convertSmooth').checked,
		convertQuadraticToCubic: document.getElementById(
			'check-convertQuadraticToCubic'
		).checked,
		convertArcToCubic: document.getElementById('check-convertArcToCubic')
			.checked,
		correctFloatingPoint: document.getElementById('check-correctFloatingPoint')
			.checked,
	};
}

function toggleView(page) {
	console.log(`toggleView to ${page}`);
	if (page === 'converted') {
		document.getElementById('pre').style.display = 'none';
		document.getElementById('post').style.display = 'grid';
		document.getElementById('toggle-original').removeAttribute('selected');
		document
			.getElementById('toggle-converted')
			.setAttribute('selected', 'selected');
	} else {
		document.getElementById('pre').style.display = 'grid';
		document.getElementById('post').style.display = 'none';
		document
			.getElementById('toggle-original')
			.setAttribute('selected', 'selected');
		document.getElementById('toggle-converted').removeAttribute('selected');
	}
}

function dropFile(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	var f = evt.dataTransfer;
	f = f.files[0] || '';
	var fname = f.name.split('.');
	fname = fname[fname.length - 1].toLowerCase();

	var reader = new FileReader();

	if (fname === 'svg') {
		reader.onload = function () {
			_UI.fileContents = reader.result;
			refresh();
		};

		reader.readAsText(f);
	} else {
		updateMessage('Only SVG files can be dropped here');
	}
}
