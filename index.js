var xpath = require('xpath')
var dom = require('xmldom').DOMParser
var fs = require('fs');
 
var xml = fs.readFileSync('./extracted/House/[Content_Types].xml',{encoding:'utf8'})
//console.log(xml)
var doc = new dom().parseFromString(xml, 'text/xml')
var select = xpath.useNamespaces({"ct": "http://schemas.openxmlformats.org/package/2006/content-types"});
var defaults = select("//ct:Default", doc);
//console.log({defaults})



var nodes = [...defaults].map(n=>n)//.map(({nodeName,nodeValue})=>[nodeName,nodeValue])

//.map(({nodeName,nodeValue})=>[
//node
//])

console.log(nodes)