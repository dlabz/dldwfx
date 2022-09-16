const json = require("./sheet.json")
const fs = require("fs")

const {parseSVG, makeAbsolute} = require('svg-path-parser');



const [root] = json.filter( ({name}) => name=="dwfresource_6")
root.canvases = [""];
//console.log({root})

const [first] = json.filter( ({name}) => name=="")

//console.log({first})


const map = new Map(json.map(c=>[c.name,c]))
const regex = new RegExp('[a-zA-Z]([0-9-.]+)[,]?([0-9-.]+)*',"g")
const matches = "M296234948,305723397h5582361v16747083h-5582361zm-7443148,432491438h17969349v21052402h-17969349z".matchAll(regex)

console.log({m:[...matches]})



const xy = ([,x=0 ,y=0])=>[Number(x),Number(y)]


const tXY = ([x,y])=>`translate(${-x} ${-y}) `
const ttXY = ([x,y])=>`translate(${x} ${y}) `

//.sort(function(a, b) {
//    return a - b;
//});

const mxy = (d)=>[...d.matchAll(regex)].map(xy)

const r = mxy("M296234948,305723397h5582361v16747083h-5582361zm-7443148,432491438h17969349v21052402h-17969349z")

console.log({r})//console.log({map})

const renderPath = (path)=>`<path id="${path.name}" d="${path.d}" stroke="black" fill="#${Math.round(Math.random() * 0xFFFFFF).toString(16).padStart(6,"0")}" />`

const getMXY = ({paths},fXY)=>[...paths.map(({d})=>mxy(d)),[0,0]].map(fXY)//.push('translate( 0 0 )')



const rootOff = getMXY(root,tXY)
const firstOff = getMXY(first,tXY)
console.log({rootOff, firstOff})

const renderCanvasPaths = (canvas) => ['<g>',canvas.paths.map(renderPath).join('\r\n'),'</g>',canvas.canvases.map(cname=>map.get(cname)).map(renderCanvasPaths).join('\r\n')].join('\r\n')

const renderCanvas = (canvas)=>`
    <svg id="${canvas.name}" >
        <g><rect width="100%" height="100%" fill="none" stroke="red" /></g>
        ${canvas.paths.map(renderPath).join('\r\n')}
        
    </svg>
    ${canvas.canvases.map(cname=>map.get(cname)).map(renderCanvas).join('\r\n')}` 

const renderRoot = () => `<?xml version="1.0" standalone="no" ?>
<html>
    
    ${renderCanvas(root)}
<html>
`


const parsed = json.map(c=>c.paths.map(({d})=>makeAbsolute(parseSVG(d))));
//commands); // Note: mutates the commands in place!
console.log(parsed);


const out = renderRoot();
fs.writeFileSync(`./${root.name}.svg`,out)
//console.log(out)

