console.log("Starting up, setting listener");

window.addEventListener("load", initialize, false);

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

var svgDocument = null;

function templateChanged() {
    template_id = document.getElementById("template_id");
    var svgelement = document.getElementById("template");
    template.src = template_id.value;
    console.log("Template value changed");
}

function contentChanged() {
    console.log("Object content changed");
    var svgelement = document.getElementById("template");
    console.log(svgelement)
    subdoc = getSubDocument(svgelement)
    console.log(subdoc)
    svgDocument = subdoc;
}

function valuesChanged() {

    if (svgDocument == null) return;
    
    title = document.getElementById("title");
    console.log("New text is " + title.value);

    text1 = svgDocument.getElementById("text1");
    text1.textContent = title.value;
}

function initialize() {
    console.log("Initialized Template logic");

    // Regular html 
    subtitle_element = document.getElementById("subtitle");
    subtitle_element.textContent = "New Subtitle";

    // TODO: Walk through SVG template
    // and get template elements.
    // From those, generate HTML editor elements
    // and place those into an array.
    //
    // OnChange event should
    // walk through HTML editor elements
    // array and push values down to template.
    
//   text1 = subdoc.getElementById("text1");
//#    text1.textContent = "New Subtitle";
}


//text1.textContent = "Custom Title";

