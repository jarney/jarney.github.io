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

var field_list = []

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
    svgDocument = getSubDocument(svgelement)

    template_fields = svgDocument.querySelectorAll('[*|template-field="true"]');

    inner = "";
    for (field_element of template_fields) {
	field_metadata = {
	    "id": field_element.getAttribute("id"),
	    "name": field_element.getAttribute("template:name"),
	    "type": field_element.getAttribute("template:type")
	};
	field_list.push(field_metadata);

	inner += "<tr>";
	inner += "<td>";
	inner += "<span>" + field_metadata.name + "</span>";
	inner += "</td>";
	inner += "<td>";
	if (field_metadata.type === "text-body") {
	    inner += "<textarea width=\"100%\" rows=\"10\" id=\"" + field_metadata.id + "\" type=\"text\" onchange=\"valuesChanged()\"></textarea>";
	}
	else if (field_metadata.type === "text-field") {
	    inner += "<input width=\"100%\" id=\"" + field_metadata.id + "\" type=\"text\" onchange=\"valuesChanged()\">";
	}
	else {
	}
	inner += "</td>";
	inner += "</tr>";

    }
    fieldElement = document.getElementById("field-container");
    fieldElement.innerHTML = inner;

    for (field_element of template_fields) {
    }
    

}

function valuesChanged() {

    if (svgDocument == null) return;
    
    for (field_metadata of field_list) {
	htmlElement = document.getElementById(field_metadata.id);
	svgElement = svgDocument.getElementById(field_metadata.id);

	if (field_metadata.type == "text-field") {
	    svgElement.textContent = htmlElement.value;
	}
	else if (field_metadata.type == "text-body") {
	    text_list = htmlElement.value.split(/\r?\n/);
	    tspan_elements = svgElement.getElementsByTagName("tspan");
	    i = 0;
	    for (tspan_element of tspan_elements) {
		if (i < text_list.length) {
		    tspan_element.textContent = text_list[i];
		}
		else {
		    tspan_element.textContent = "";
		}
		i = i + 1;
	    }
	}

    }

}

function initialize() {
    var templateListElement = document.getElementById("template");
    templateListElement.value = "template_cutting_board_vertical.svg";
    templateListElement.dispatchEvent(new Event('change'))
    templateChanged();
}

