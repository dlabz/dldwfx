const fs = require('fs');
const { buffer } = require('stream/consumers');

const data = fs.readFileSync('./House/dwf/documents/9387EE8F-2A91-433B-9F7C-ACAF896F858D/sections/com.autodesk.dwf.eModel_2DB4DA7E-7964-4AD4-8972-27FBBA57C450/1B9C2293-2974-40DC-8F8B-152F3E0700F4.hsf');

//const magic = 28;
let count = 0;
const TKE_OPT = [
    
    [0x28, 'TKE_Open_Segment'   ],
    [0x29, 'TKE_Close_Segment'  ],
    [0x3B, `TKE_Comment`        ],
    [0x44, 'TKE_Dictionary'     ],
    [0x47, 'TKE_Polygon'        ],
    [0x4C, 'TKE_Polyline'       ],
    [0x53, 'TKE_Shell'          ]  //S+0xFF+0xFF 
    


]
const TKE_JSON = require('./OPCODE.json').map(([k,v])=>['0x'+k.toString(16).padStart(2, '0'),`(${k})[${String.fromCodePoint(k)}]  ${v}`])
//
const MAP_TKE_OPT = new Map(TKE_JSON);
const RAW_BYTE_TKE = [...MAP_TKE_OPT.keys()].map(k=>parseInt(k))
console.log(MAP_TKE_OPT);
debugger;
const TKE_Comment = 0x3B
const TKE_File_Info = 0x49;
const TKE_Tag = 0x71;

const TKE_Polygon = 0x47; //G (count)xPoint points
const TKE_Polyline = 0x4C; //L(Long:n)({x,y,z})
const TKE_PolyPolyline = 0x10;


const TKE_MESH = 0x4D
const SUBOPTIONS = [ 
    0x01, //TKSH_COMPRESSED_POINTS -- Points are compressed
    0x08, //TKSH_HAS_OPTIONALS -- Vertices, edges and/or faces have attributes, and the attributes section of the format exists. See attributes.html
    0x80 //TKSH_EXPANDED -- Suboptions2 currently has no bits relevant to TKE_Mesh, so this bit will not be set (and thus there is currently no suboptions2)
]
const mesh = {
    rows:"", //int
    columns:"", //int
    points:"", //variable
    attributes:""
}

const TKE_Close_Segment = 0x29;
const TKE_Open_Segment = 0x28;
const TKE_Reopen_Segment = 0x73; //Int index
/*
Byte length, (length)xByte name

length	length of the segment name string (may be zero)
name	name used to apply to segment
 

Notes
All geometry/attributes after this opcode will apply to this segment until there is another TKE_Open_Segment, TKE_Close_Segment or TKE_Reopen_Segment opcode.
*/


const TKE_Dictionary = 0x44;
/*
Byte format
[Word pause_count],
[(pause_count)xLong pause_offsets]
Long count,
(count)x{
  Long index,
  Byte presence,
  (number of bits set in presence)xLong item_offset,
  [Byte item_options],
  [Point bounds_min, Point bounds_max]
}
[Long first_pause_offset]
Long dictionary_offset
*/
/**
 * format	indicates type of dictionary, currently supported values are 0, 1, and 2.
pause_count	number of entries in pause offset table, present if format is 2.
pause_offsets	file offsets of all recorded pause opcodes, present if format is 2.
count	number of index-value sets
index	index associated with an object and the corresponding offsets
presence	bitmask indicating which variations of an object have recorded offsets, low bit represents the full objects, successive bits for increasingly reduced detail versions.
item_offset	file offset for a specific variation of an object, one per bit in presence
item_options	flags indicating any additional enties for this item, present if format is 1 or greater.
bounds_min	minimum corner of the bounding volume of this item, present if the low bit set in item_options
bounds_max	maximum corner of the bounding volume of this item, present if the low bit set in item_options
first_pause_offset	file offset of a single recorded pause (0 if none recorded), present if format is 1
dictionary_offset	file offset of the start of the dictionary

 */
let out = Buffer.alloc(data.length)
var buffer_ascii = data.toString('binary')
var buffer_hex = data.toString('hex')
let TM = [...buffer_hex.matchAll(/00/g)].filter(a=>a.index % 2 == 0).map(m=>m.index/2)//
console.log({TM})
const HSF = [...buffer_ascii.matchAll(/HSF V(\d{2}.\d{2})/g)].map(m=>[m.index]).flat()

const HSF_V = data.subarray(HSF[0],HSF[0]+10).toString()
const W3D = [...buffer_ascii.matchAll(/W3D V\d{2}.\d{2}/g)].map(m=>[m.index]).flat()
const W3D_V = data.subarray(W3D[0],W3D[0]+10).toString()
console.log({HSF,HSF_V,W3D,W3D_V})

const hex = (int)=>'0x'+int.toString(16).padStart(2,'0')
let aa = [];
debugger;
let from = 10
for(let [k,v] of data.entries()){
    
    
    if(RAW_BYTE_TKE.includes(v)){

        //console.log(data.subarray(from,k).toString())
        const bb = data.subarray(from,k)
        const key = hex(from)
        const val = MAP_TKE_OPT.get(key)
        
        aa.push([[from, k],[key,val],bb.toString('ascii'),bb.toString('hex')])

        
        //console.log([k,key,bb.toString('ascii'),bb.map(b=>'0x'+b.toString(16))]);

        from = k;
        
    }else{
       // out[k] = v;
        //console.log(['0x'+v.toString(16)])
    }
}
debugger;

fs.writeFileSync('./out/out_hsf.json',JSON.stringify(aa,null,'\t'),{encoding:'binary'});