window.addEventListener("load", initialize, false);

function removeAllChildren(domElement) {
    var toremove = []
    for (child of domElement.children) {
	toremove.push(child);
    }
    for (child of toremove) {
	domElement.removeChild(child);
    }
}

function globalBBox(element) {
    var rect_bbox = element.getBBox();
    var consolidated = element.transform.baseVal.consolidate();
    if (!consolidated) {
	consolidated  = svgDocument.querySelector("svg").createSVGTransform();
    }
    var consolidated_matrix = consolidated.matrix;

    var corners = {
	x0: rect_bbox.x * consolidated_matrix.a + rect_bbox.y * consolidated_matrix.c + consolidated_matrix.e,
	y0: rect_bbox.x * consolidated_matrix.b + rect_bbox.y * consolidated_matrix.d + consolidated_matrix.f,
	x1:  (rect_bbox.x + rect_bbox.width) * consolidated_matrix.a + (rect_bbox.y + rect_bbox.height) * consolidated_matrix.c + consolidated_matrix.e,
        y1: (rect_bbox.x + rect_bbox.width) * consolidated_matrix.b + (rect_bbox.y + rect_bbox.height) * consolidated_matrix.d + consolidated_matrix.f
    };

    var global_bbox = {
	x: 0,
	y: 0,
	width: 0,
	height: 0
    };
    
    if (corners.x1 > corners.x0) {
	global_bbox.x = corners.x0;
	global_bbox.width = corners.x1 - corners.x0;
    }
    else {
	global_bbox.x = corners.x1;
	global_bbox.width = corners.x0 - corners.x1;
    }
    if (corners.y1 > corners.y0) {
	global_bbox.y = corners.y0;
	global_bbox.height = corners.y1 - corners.y0;
    }
    else {
	global_bbox.y = corners.y1;
	global_bbox.height = corners.y0 - corners.y1;
    }
    return global_bbox;
}

/**
 * Utility function to normalize a text element
 * size to fit in a given rectangle.  Used by
 * both TextArea and TextField template types.
 */
function normalizeText(svgElement, elementName) {
    var groupElement = svgElement.parentElement;
    var rectElements = groupElement.getElementsByTagName("rect");
    
    if (rectElements.length <= 0) return;
    
    // All of this is to center the text in the given rectangle.
    var rectElement = rectElements[0];
    
    // We need the bounding boxes to be calculated
    // in terms of global coordinates for both elements.
    var rect_bbox = globalBBox(rectElement);
    var text_bbox = globalBBox(svgElement);
    
    // We're not rendering any text, so we should not try
    // to center it.  Best to leave it alone for now.
    if (text_bbox.width <= 0 || text_bbox.height <= 0) {
	return;
    }
    
    // Next, we need to determine how much
    // we should scale by in order to fit exactly
    // inside the given rectangle while keeping
    // the aspect ratio, so we will either need to
    // scale according to the width or height depending on
    // which one would overflow.
    var widthTransform = rect_bbox.width / text_bbox.width;
    var heightTransform = rect_bbox.height / text_bbox.height;
    var scale = widthTransform < heightTransform ? widthTransform : heightTransform;
    
    // Next, find the center point of the text.  This is
    // because we want to move the center of the text to
    // the origin before scaling it.
    var cx = text_bbox.x + text_bbox.width/2;
    var cy = text_bbox.y + text_bbox.height/2;
    
    // Then we find the center point of the rectangle
    // so we can move the text to fit inside the box.
    var cbx = rect_bbox.x + rect_bbox.width/2;
    var cby = rect_bbox.y + rect_bbox.height/2;
    
    // Move text to origin
    const doTranslate1 = svgDocument.querySelector("svg").createSVGTransform();
    doTranslate1.setTranslate(-cx, -cy);
    svgElement.transform.baseVal.insertItemBefore(doTranslate1, 0);
    
    // Scale text by appropriate amount.
    const doScale = svgDocument.querySelector("svg").createSVGTransform();
    doScale.setScale(scale, scale);
    svgElement.transform.baseVal.insertItemBefore(doScale, 0);
    
    // Move text to center of rectangle
    const doTranslate2 = svgDocument.querySelector("svg").createSVGTransform();
    doTranslate2.setTranslate(cbx, cby);
    svgElement.transform.baseVal.insertItemBefore(doTranslate2, 0);
}

var svgDocument = null;
var svgDocumentName = "";
var field_list = []

class TemplateElement {
    constructor(id, name, order, type, editable) {
	this.name = name;
	this.id = id;
	this.order = order;
	this.type = type;
	this.editable = editable;
    }
    getOrder() {
	return this.order;
    }
    getName() {
	return this.name;
    }
    getType() {
	return this.type;
    }
    getId() {
	return this.id;
    }
    isEditable() {
	return this.editable;
    }
    filterPreview(previewDocument) {
	var svgElement = previewDocument.getElementById(this.id);
	this._filterPreview(svgElement);
    }
    formToSVG(callback) {
	var htmlElement = document.getElementById(this.id);
	var svgElement = svgDocument.getElementById(this.id);
	this._formToSVG(htmlElement, svgElement, callback);
    }
    formToURL() {
	var htmlElement = document.getElementById(this.id);
	var svgElement = svgDocument.getElementById(this.id);
	return this._formToURL(htmlElement, svgElement);
    }
    svgToForm(urlParams) {
	var htmlElement = document.getElementById(this.id);
	var svgElement = svgDocument.getElementById(this.id);
	this._svgToForm(urlParams, htmlElement, svgElement);
    }
}

class TemplateTextField extends TemplateElement {
    constructor(id, name, order, type) {
	super(id, name, order, type, true);
    }
    _svgToForm(urlParams, htmlElement, svgElement) {
	var textAreaValue = urlParams.get(this.getId());
	if (textAreaValue) {
	    htmlElement.value = textAreaValue;
	    return;
	}
	htmlElement.value = svgElement.textContent;
    }
    _formToSVG(htmlElement, svgElement, callback) {
	svgElement.textContent = htmlElement.value;
	
	normalizeText(svgElement, this.name);
	callback();
    }
    _formToURL(htmlElement, svgElement) {
	return this.id + "=" + encodeURI(htmlElement.value);
    }
    _filterPreview(svgElement) {
	var groupElement = svgElement.parentElement;
	var rectElements = groupElement.getElementsByTagName("rect");
	for (var rect of rectElements) {
	    groupElement.removeChild(rect);
	}
    }
    innerHTML() {
	var htmlElement = document.createElement("input");
	htmlElement.setAttribute("id", this.getId());
	htmlElement.setAttribute("type", "text");
	htmlElement.setAttribute("onchange", "valuesChanged();");
	return htmlElement;
    }
}

class TemplateImage extends TemplateElement {
    constructor(id, name, order, type) {
	super(id, name, order, type, true);
	
	this.handleFileLoad = function(event, svgElement, callback) {
	    var dataUrl = "data:image/png;base64," + btoa(event.target.result);
	    svgElement.setAttribute("xlink:href", dataUrl);
	    callback();
	}
    }
    _svgToForm(urlParams, htmlElement, svgElement) {
    }
    
    _formToSVG(htmlElement, svgElement, callback) {
	if (htmlElement.files.length != 1) {
	    callback();
	    return;
	}
	var file = htmlElement.files[0];
	const reader = new FileReader()
	var fn = this.handleFileLoad;
	reader.onload = function(event) { fn(event, svgElement, callback); }
	reader.readAsBinaryString(file);
    }
    _formToURL(htmlElement, svgElement) {
	if (htmlElement.files.length == 0) {
	    return null;
	}
	return this.id + "=" + encodeURI(svgElement.getAttribute("xlink:href"));
    }
    _filterPreview(svgElement) {
    }
    innerHTML() {
	var htmlElement = document.createElement("input");
	htmlElement.setAttribute("id", this.getId());
	htmlElement.setAttribute("type", "file");
	htmlElement.setAttribute("accept", "image/png, image/jpeg");
	htmlElement.setAttribute("onchange", "valuesChanged();");
	return htmlElement;
    }
}

class TemplateSelect extends TemplateElement {
    constructor(id, name, order, type) {
	super(id, name, order, type, true);
    }
    _svgToForm(urlParams, htmlElement, svgElement) {
	var selectValue = urlParams.get(this.getId());
	if (selectValue) {
	    htmlElement.value = selectValue;
	    return;
	}
    }
    _formToSVG(htmlElement, svgElement, callback) {
	for (var child of svgElement.children) {
	    if (child.id == htmlElement.value) {
		child.setAttribute("style", "display:inline");
	    }
	    else {
		child.setAttribute("style", "display:none");
	    }
	}
	callback();
    }
    _formToURL(htmlElement, svgElement) {
	return this.id + "=" + encodeURI(htmlElement.value);
    }
    _filterPreview(svgElement) {
	var child_list = svgElement.children;
	var todelete = []
	for (var child of todelete) {
	    svgElement.removeChild(child);
	}
    }
    innerHTML() {
	var htmlElement = document.createElement("select");
	var svgElement = svgDocument.getElementById(this.getId());
	
	htmlElement.setAttribute("id", this.getId());
	htmlElement.setAttribute("name", this.getName());
	htmlElement.setAttribute("onchange", "valuesChanged();");
	var i = 0;
	for (var child of svgElement.children) {
	    var optionElement = document.createElement("option");
	    optionElement.setAttribute("value", child.id);
	    optionElement.textContent = child.getAttribute("inkscape:label");
	    if (i == 0) {
		child.setAttribute("style", "display:inline;");
		htmlElement.setAttribute("value", "child.id");
	    }
	    else {
		child.setAttribute("style", "display:none;");
	    }
	    htmlElement.appendChild(optionElement);
	    i++;
	}
	return htmlElement;
    }
}

class TemplateHidden extends TemplateElement {
    constructor(id, name, order, type) {
	super(id, name, order, type, false);
    }
    _svgToForm(urlParams, htmlElement, svgElement) {
    }
    _formToSVG(htmlElement, svgElement, callback) {
	callback();
    }
    _formToURL(htmlElement, svgElement) {
	// Hidden elements have nothing to say.
	return null;
    }
    _filterPreview(svgElement) {
	if (svgElement) {
	    var parent = svgElement.parentElement;
	    if (parent) {
		parent.removeChild(svgElement);
	    }
	}
    }
    innerHTML() {
	return null;
    }
}

class TemplateTextArea extends TemplateElement {
    constructor(id, name, order, type) {
	super(id, name, order, type, true);
    }
    _svgToForm(urlParams, htmlElement, svgElement) {
	// Read it from the URL if it's there.
	var textAreaValue = urlParams.get(this.getId());
	if (textAreaValue) {
	    htmlElement.value = textAreaValue;
	    return;
	}
	// Otherwise, default to whatever's in the URL.
	var tspan_elements = svgElement.getElementsByTagName("tspan");
	var text_list = [];
	for (var tspan_element of tspan_elements) {
	    text_list.push(tspan_element.textContent);
	}
	htmlElement.value = text_list.join("\n");
    }
    _formToSVG(htmlElement, svgElement, callback) {
	var text_list = htmlElement.value.split(/\r?\n/);
	
	// This is just a reasonable default.
	var lineHeight = 15;
	
	// If there are existing nodes, we get the
	// span by calculating the existing difference
	// between lines.
	if (svgElement.children.length >= 2) {
	    var y0 = svgElement.children[0].getAttribute("y");
	    var y1 = svgElement.children[1].getAttribute("y");
	    lineHeight = y1 - y0;
	}
	// Otherwise, we use the bounding-box as the line height.
	else {
	    lineHeight = svgElement.getBBox().height;
	}
	removeAllChildren(svgElement);
	
	// This is the default position of the text spans.
	var xpos = parseFloat(svgElement.getAttribute("x"));
	var ypos = parseFloat(svgElement.getAttribute("y"));
	
	var i = 0;
	for (var text_content of text_list) {
	    var newTSpan = svgDocument.createElementNS("http://www.w3.org/2000/svg", "tspan");
	    newTSpan.setAttribute("x", "" + xpos);
	    newTSpan.setAttribute("y", "" + (ypos + lineHeight * i));
	    newTSpan.textContent = text_content;
	    svgElement.appendChild(newTSpan);
	    i++;
	}
	normalizeText(svgElement, this.name);
	callback();
    }
    _formToURL(htmlElement, svgElement) {
	return this.id + "=" + encodeURI(htmlElement.value);
    }
    _filterPreview(svgElement) {
	var groupElement = svgElement.parentElement;
	var rectElements = groupElement.getElementsByTagName("rect");
	for (var rect of rectElements) {
	    groupElement.removeChild(rect);
	}
    }
    innerHTML() {
	var textareaElement = document.createElement("textarea");
	textareaElement.setAttribute("rows", "4");
	textareaElement.setAttribute("id", this.getId());
	textareaElement.setAttribute("type", "text");
	textareaElement.setAttribute("onchange", "valuesChanged()");
	return textareaElement;
    }
}

function templateFactory(id, name, order, type) {
    if (type == "text-field") {
	return new TemplateTextField(id, name, order, type);
    }
    else if (type == "text-area") {
	return new TemplateTextArea(id, name, order, type);
    }
    else if (type == "image") {
	return new TemplateImage(id, name, order, type);
    }
    else if (type == "select") {
	return new TemplateSelect(id, name, order, type);
    }
    else if (type == "hidden") {
	return new TemplateHidden(id, name, order, type);
    }
}

function getSubDocument(embedding_element) {
    if (embedding_element.contentDocument) {
	return embedding_element.contentDocument;
    } 
    else {
	var subdoc = null;
	try {
	    subdoc = embedding_element.getSVGDocument();
	} catch(e) {}
	return subdoc;
    }
}

function templateChanged() {
    template_id = document.getElementById("template_id");
    var svgelement = document.getElementById("template");
    template.src = template_id.value;
    
    svgDocumentName = template_id.value;
    
    var qrcodeElement = document.getElementById("qrcode");
    var qrcodeErrorElement = document.getElementById("qrcode_error");
    qrcodeElement.setAttribute("style", "display:none;");
    qrcodeErrorElement.setAttribute("style", "display:none;");
}

function selectTab(evt, tabId) {
    // Declare all variables
    var i, tabcontent, tablinks;
    
    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
	tabcontent[i].style.opacity = 0;
    }
    
    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tab-link");
    for (i = 0; i < tablinks.length; i++) {
	tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    
    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabId).style.opacity = 1;
    evt.currentTarget.className += " active";
    
    processResults();
}

function downloadClicked() {
    var previewElement = document.getElementById("preview");
    previewDocument = getSubDocument(previewElement);
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(previewDocument);
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = window.URL.createObjectURL(svgBlob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = svgDocumentName;
    
    // Append to the DOM (required for older browsers)
    document.body.appendChild(a);
    
    // Trigger the download
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
}

function previewContentLoaded() {
    document.getElementById("preview-loader").setAttribute("style", "display: none");
    document.getElementById("preview").setAttribute("style", "");
    processResults();    
}

function templateContentLoaded() {
    document.getElementById("template-loader").setAttribute("style", "display:none;");
    document.getElementById("template").setAttribute("style", "");
    
    var svgElement = document.getElementById("template");
    svgDocument = getSubDocument(svgElement);
    
    //var template_fields = svgDocument.querySelectorAll('[*|template-field="true"]');
    var fieldElements = svgDocument.querySelectorAll(
	'[*|type="text-field"],[*|type="text-area"],[*|type="image"],[*|type="select"],[*|type="hidden"]'
    );
    
    field_list = [];
    for (var fieldElement of fieldElements) {
	if (!fieldElement.hasAttribute("template:type")) {
	    continue;
	}
	templateElement = templateFactory(
	    fieldElement.getAttribute("id"),
	    fieldElement.getAttribute("inkscape:label"),
	    parseInt(fieldElement.getAttribute("template:order")),
	    fieldElement.getAttribute("template:type")
	);
	if (!templateElement) {
	    continue;
	}
	field_list.push(templateElement);
    }
    
    field_list.sort(function (a, b) {
	return a.getOrder() - b.getOrder()
    });
    
    var fieldElement = document.getElementById("field-container");
    removeAllChildren(fieldElement);
    for (templateElement of field_list) {
	if (templateElement.isEditable()) {
	    editControlElement = templateElement.innerHTML();
	    if (!editControlElement) continue;
	    
	    var rowDiv = document.createElement("div");
	    rowDiv.setAttribute("class", "row");
	    
	    var titleDiv = document.createElement("div");
	    titleDiv.setAttribute("class", "col");
	    var span = document.createElement("span");
	    span.textContent = templateElement.getName();
	    titleDiv.appendChild(span);
	    
	    rowDiv.appendChild(titleDiv);
	    
	    var editControlDiv = document.createElement("div");
	    editControlDiv.setAttribute("class", "col");
	    
	    editControlDiv.appendChild(editControlElement);
	    rowDiv.appendChild(editControlDiv);
	    
	    fieldElement.appendChild(rowDiv);
	}
    }
    const urlParams = new URLSearchParams(window.location.search);
    for (templateElement of field_list) {
	templateElement.svgToForm(urlParams);
	templateElement.formToSVG(function() {return;});
    }
    processResults();    
}

function processResults() {
    copyPreviewSVG();
    generateQRCodeAndURL();
}

function copyPreviewSVG() {
    // If we haven't loaded our template
    // yet, then we shouldn't mess with the preview.
    if (field_list.length == 0) {
	return;
    }
    
    var svgElement = document.getElementById("template");
    svgDocument = getSubDocument(svgElement);
    if (!svgDocument) {
	return;
    }
    
    var previewElement = document.getElementById("preview");
    previewDocument = getSubDocument(previewElement)
    if (!previewDocument) {
	return;
    }
    
    removeAllChildren(previewDocument.documentElement);
    
    for (child of svgDocument.documentElement.children) {
	previewDocument.documentElement.appendChild(child.cloneNode(true));
    }
    previewDocument = getSubDocument(previewElement)
    
    for (templateElement of field_list) {
	templateElement.filterPreview(previewDocument);
    }
    var viewBox = svgDocument.rootElement.getAttribute("viewBox").split(" ");
    var svgWidth = parseInt(viewBox[2]);
    var svgHeight = parseInt(viewBox[3]);
    previewDocument.rootElement.setAttribute("viewBox", "0 0 " + svgWidth + " " + svgHeight);
    previewDocument.rootElement.setAttribute("width", svgWidth);
    previewDocument.rootElement.setAttribute("height", svgHeight);
    
    // Extract the SVG and put it in a '<pre>' tag.
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(previewDocument);
    document.getElementById("preview_svg").textContent = svgStr;
}

function generateQRCodeAndURL() {
    // If we haven't loaded our template
    // yet, then we shouldn't mess with the QR code and URL stuff yet.
    if (field_list.length == 0) {
	return;
    }
    
    // Extract parameters and build a URL.
    var url = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + window.location.pathname;
    var paramlist = []
    paramlist.push("template=" + encodeURI(svgDocumentName));
    for (templateElement of field_list) {
	if (templateElement.isEditable()) {
	    var formData = templateElement.formToURL();
	    if (!formData) continue;
	    paramlist.push(formData);
	}
    }
    paramstring = "?" + paramlist.join("&");
    
    // Use the URL to encode a QRCode for sharing (if it is small enough)
    //document.getElementById("qrcode_data").textContent = paramlist.join("\n");
    // In general, we want to limit the query string to 512 bytes:
    var qrcodeElement = document.getElementById("qrcode");
    var qrcodeLengthElement = document.getElementById("qrcode_length");
    var qrcodeErrorElement = document.getElementById("qrcode_error");
    
    // We limit the URL line to 512 characters.
    // Pretty generous, but not super large actually.
    if ((url + paramstring).length > 512) {
	window.history.replaceState(null, null, url);
    }
    else {
	window.history.replaceState(null, null, url + paramstring);
    }
    
    // Put the parameters onto the QR code (if it fits)
    url = url  + paramstring;
    removeAllChildren(qrcodeElement);
    try {
	console.log("QRCode data:");
	console.log(url);
	new QRCode(qrcodeElement, {
	    text: url,
	    correctLevel : QRCode.CorrectLevel.Q
	});
	
	qrcodeElement.setAttribute("style", "");
	qrcodeLengthElement.setAttribute("style", "");
	qrcodeErrorElement.setAttribute("style", "display:none;");
	qrcodeLengthElement.textContent = "Length: " + url.length + " bytes";
    }
    catch (ex) {
	console.log("Exception generating QR Code");
	console.log(ex);
	qrcodeElement.setAttribute("style", "display:none;");
	qrcodeLengthElement.setAttribute("style", "display:none;");
	qrcodeErrorElement.setAttribute("style", "");
	qrcodeErrorElement.textContent = "QR Code was too large (" + url.length + " bytes) to render.  This usually happens when custom pictures/images/graphics are used and are bigger than the amount a QR code can hold.  Download the SVG to share it instead, or select a design that does not require custom graphics.";
    }
    
}

function valuesChanged() {
    if (svgDocument == null) return;
    
    var callbackCount = 0;
    function waitForCallbacks() {
	if (callbackCount == field_list.length-1) {
	    processResults();
	}
	callbackCount++;
    }
    for (templateElement of field_list) {
	templateElement.formToSVG(waitForCallbacks);
    }
}

function initialize() {
    var templateListElement = document.getElementById("template_id");
    
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get("template")) {
	templateListElement.value = urlParams.get("template");
    }
    else {
	templateListElement.value = "template_cutting_board_vertical.svg";
    }
    templateChanged();
    document.getElementById("edit-view-button").click();
}
