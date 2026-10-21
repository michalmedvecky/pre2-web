import{renderTerrainChunk}from'./terrain-chunk.js';
let environment;
self.onmessage=({data})=>{if(data.environment){environment=data.environment;return;}try{const rgba=renderTerrainChunk(environment,data.job);self.postMessage({id:data.id,rgba},[rgba.buffer]);}catch(e){self.postMessage({id:data.id,error:String(e)});}};
