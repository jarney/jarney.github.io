console.log("Starting up, setting listener");

window.addEventListener("load", initialize, false);

/**
 * Utility function to normalize a text element
 * size to fit in a given rectangle.  Used by
 * both TextArea and TextField template types.
 */
function normalizeText(svgElement, elementName, changeY) {
    var groupElement = svgElement.parentElement;
    var rectElements = groupElement.getElementsByTagName("rect");
    
    if (rectElements.length <= 0) return;
    
    // All of this is to center the text in the given rectangle.
    var rectElement = rectElements[0];
    
    var rectx = parseFloat(rectElement.getAttribute("x"));
    var recty = parseFloat(rectElement.getAttribute("y"));
    var rectwidth = parseFloat(rectElement.getAttribute("width"));
    var rectheight = parseFloat(rectElement.getAttribute("height"));
    
    var text_bbox = svgElement.getBBox();
    
    var textx = parseFloat(svgElement.getAttribute("x"));
    var texty = parseFloat(svgElement.getAttribute("y"));
    
    if (text_bbox.width == 0 || text_bbox.height == 0) return;
    
    var widthTransform = (rectwidth * 0.9) / text_bbox.width;
    var heightTransform = (rectheight * 0.9) / text_bbox.height;
    var scale = widthTransform < heightTransform ? widthTransform : heightTransform;
    
    const svgScale = svgDocument.querySelector("svg").createSVGTransform();
    var consolidated_before = svgElement.transform.baseVal.consolidate();
    if (consolidated_before == null) {
	consolidated_before = svgDocument.querySelector("svg").createSVGTransform();
    }

    if (changeY) {
	svgScale.setScale(scale/consolidated_before.matrix.a, scale/consolidated_before.matrix.a);
    }
    else {
	svgScale.setScale(scale/consolidated_before.matrix.a, 1);
    }
    svgElement.transform.baseVal.appendItem(svgScale);
    
    var consolidated = svgElement.transform.baseVal.consolidate();
    
    svgElement.setAttribute("x", textx*consolidated_before.matrix.a/consolidated.matrix.a);
    if (changeY) {
	svgElement.setAttribute("y", texty*consolidated_before.matrix.a/consolidated.matrix.a);
    
	svgElement.setAttribute("transform", "matrix(" +
			    consolidated.matrix.a + "," +
			    consolidated.matrix.b + "," +
			    consolidated.matrix.c + "," +
			    consolidated.matrix.d + "," +
			    consolidated.matrix.e + "," +
			    consolidated.matrix.f + ")");
    }
}

var svgDocument = null;
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
    svgToForm() {
	var htmlElement = document.getElementById(this.id);
	var svgElement = svgDocument.getElementById(this.id);
	this._svgToForm(htmlElement, svgElement);
    }
}

class TemplateTextField extends TemplateElement {
    constructor(id, name, order, type) {
	super(id, name, order, type, true);
    }
    _svgToForm(htmlElement, svgElement) {
	htmlElement.value = svgElement.textContent;
    }
    _formToSVG(htmlElement, svgElement, callback) {
	svgElement.textContent = htmlElement.value;

	normalizeText(svgElement, this.name, true);
	callback();
    }
    _filterPreview(svgElement) {
	var groupElement = svgElement.parentElement;
	var rectElements = groupElement.getElementsByTagName("rect");
	for (var rect of rectElements) {
	    groupElement.removeChild(rect);
	}
    }
    innerHTML() {
	return "<input id=\"" + this.getId() + "\" type=\"text\" onchange=\"valuesChanged()\">";
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
    _svgToForm(htmlElement, svgElement) {
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
    _filterPreview(svgElement) {
    }
    innerHTML() {
	return "<input id=\"" + this.getId() + "\" type=\"file\" accept=\"image/png, image/jpeg\" onchange=\"valuesChanged()\">";
    }
}

class TemplateSelect extends TemplateElement {
    constructor(id, name, order, type) {
	super(id, name, order, type, true);
    }
    _svgToForm(htmlElement, svgElement) {
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
    _filterPreview(svgElement) {
	console.log("=============doing preview==========");
	var child_list = svgElement.children;
	var todelete = []
	for (var child of child_list) {
	    console.log("Label: " + child.getAttribute("inkscape:label") + ": " + child.getAttribute("style"));
	}
	for (var child of todelete) {
	    svgElement.removeChild(child);
	}
	console.log("=============done preview==========");
    }
    innerHTML() {
	var svgElement = svgDocument.getElementById(this.getId());

	inner = "";
	inner += "<select id=\"" + this.getId() + "\" name=\"" + this.getName() + "\" onchange=\"valuesChanged()\">";
	var i = 0;
	for (var child of svgElement.children) {
	    if (i != 0) {
		child.setAttribute("style", "display:none");
	    }
	    else {
		child.setAttribute("style", "display:inline");
	    }
	    inner += "<option value=\"" + child.id + "\">" + child.getAttribute("inkscape:label") + "</option>";
	    i++;
	}
	inner += "</select>"
	return inner;
    }
}

class TemplateHidden extends TemplateElement {
    constructor(id, name, order, type) {
	super(id, name, order, type, false);
    }
    _svgToForm(htmlElement, svgElement) {
    }
    _formToSVG(htmlElement, svgElement, callback) {
	callback();
    }
    _filterPreview(svgElement) {
	var parent = svgElement.parentElement;
	parent.removeChild(svgElement);
    }
    innerHTML() {
	return "";
    }
}

class TemplateTextArea extends TemplateElement {
    constructor(id, name, order, type) {
	super(id, name, order, type, true);
    }
    _svgToForm(htmlElement, svgElement) {
	var tspan_elements = svgElement.getElementsByTagName("tspan");
	var text_list = [];
	for (var tspan_element of tspan_elements) {
	    text_list.push(tspan_element.textContent);
	}
	htmlElement.value = text_list.join("\n");
    }
    _formToSVG(htmlElement, svgElement, callback) {
	var text_list = htmlElement.value.split(/\r?\n/);
	var tspan_elements = svgElement.getElementsByTagName("tspan");
	var i = 0;
	for (var tspan_element of tspan_elements) {
	    if (i < text_list.length) {
		tspan_element.textContent = text_list[i];
	    }
	    else {
		tspan_element.textContent = " ";
	    }
	    i = i + 1;
	}
	normalizeText(svgElement, this.name, false);
	callback();
    }
    _filterPreview(svgElement) {
	var groupElement = svgElement.parentElement;
	var rectElements = groupElement.getElementsByTagName("rect");
	for (var rect of rectElements) {
	    console.log("Removing rect ");
	    console.log(rect);
	    groupElement.removeChild(rect);
	}
    }
    innerHTML() {
	return "<textarea rows=\"10\" id=\"" + this.getId() + "\" type=\"text\" onchange=\"valuesChanged()\"></textarea>";
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



function getSubDocument(embedding_element)
{
    if (embedding_element.contentDocument) 
    {
	return embedding_element.contentDocument;
    } 
    else 
    {
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
}

function selectTab(evt, tabId) {
    // Declare all variables
    var i, tabcontent, tablinks;
    
    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
	tabcontent[i].style.display = "none";
    }
    
    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
	tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    
    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabId).style.display = "block";
    evt.currentTarget.className += " active";
    
    copyPreviewSVG();
} 

function downloadClicked() {
    var previewElement = document.getElementById("preview");
    previewDocument = getSubDocument(previewElement);
    console.log(previewDocument);
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(previewDocument);
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = window.URL.createObjectURL(svgBlob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "dynamic-text-file.txt"; // Filename
    
    // Append to the DOM (required for older browsers)
    document.body.appendChild(a);
    
    // Trigger the download
    a.click();
    document.body.removeChild(a);
    
    console.log(url);
    URL.revokeObjectURL(url);
}

function previewContentLoaded() {
//    document.getElementById("preview-loader").setAttribute("style", "display: none");
    document.getElementById("preview").setAttribute("style", "");
    copyPreviewSVG();    
}

function templateContentLoaded() {
//    document.getElementById("template-loader").setAttribute("style", "display: none");
    document.getElementById("template").setAttribute("style", "");

    var svgElement = document.getElementById("template");
    svgDocument = getSubDocument(svgElement);

    //var template_fields = svgDocument.querySelectorAll('[*|template-field="true"]');
    var fieldElements = svgDocument.querySelectorAll(
	'[*|type="text-field"],[*|type="text-area"],[*|type="image"],[*|type="select"],[*|type="hidden"]'
    );

    field_list = [];
    for (fieldElement of fieldElements) {
	if (!fieldElement.hasAttribute("template:type")) {
	    console.log("No such attribute");
	    continue;
	}
	templateElement = templateFactory(
	    fieldElement.getAttribute("id"),
	    fieldElement.getAttribute("inkscape:label"),
	    parseInt(fieldElement.getAttribute("template:order")),
	    fieldElement.getAttribute("template:type")
	);
	field_list.push(templateElement);
    }
    
    field_list.sort(function (a, b) {
	return a.getOrder() - b.getOrder()
    });

    // Scale the SVG to fit
    var viewBox = svgDocument.rootElement.getAttribute("viewBox").split(" ");
    var svgWidth = parseInt(viewBox[2]);
    var svgHeight = parseInt(viewBox[3]);
    var scaleFactor = (window.innerWidth - 20) / svgWidth;
    console.log("Scale factor should be " + scaleFactor);
    var bbox = svgDocument.rootElement.getBBox();
    svgDocument.rootElement.setAttribute("width", bbox.width);
    svgDocument.rootElement.setAttribute("height", bbox.height);
    svgDocument.rootElement.setAttribute("viewBox", "0 0 " + bbox.width + " " + bbox.height);
    
    inner = "";
    for (templateElement of field_list) {
	if (templateElement.isEditable()) {
	    inner += "<div class=\"row\">";
	    inner += "<div class=\"col\">";
	    inner += "<span>" + templateElement.getName() + "</span>";
	    inner += "</div>";
	    inner += "<div class=\"col\">";
	    inner += templateElement.innerHTML();
	    inner += "</div>";
	    inner += "</div>";
	}

    }
    fieldElement = document.getElementById("field-container");
    fieldElement.innerHTML = inner;

    for (templateElement of field_list) {
	templateElement.svgToForm();
    }
    copyPreviewSVG();    
}

function copyPreviewSVG() {
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
    
    var toremove = []
    for (child of previewDocument.documentElement.children) {
	toremove.push(child);
    }
    for (child of toremove) {
	previewDocument.documentElement.removeChild(child);
    }
    
    console.log("outerhtml");
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
}

function valuesChanged() {
    if (svgDocument == null) return;

    var callbackCount = 0;
    function waitForCallbacks() {
	console.log("Got " + callbackCount + " callbacks");
	if (callbackCount == field_list.length-1) {
	    console.log("Copied preview");
	    copyPreviewSVG();
	}
	callbackCount++;
    }
    for (templateElement of field_list) {
	templateElement.formToSVG(waitForCallbacks);
    }
}

function initialize() {
    var templateListElement = document.getElementById("template");
    templateListElement.value = "template_cutting_board_vertical.svg";
    templateListElement.dispatchEvent(new Event('change'))
    templateChanged();
    document.getElementById("edit-view-button").click();
}

