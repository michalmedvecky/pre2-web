// The original hut frames a single solid-dark union tile. HD keeps its entry
// location and lower doorway, but uses the surrounding wood at the two upper
// corners so the opening follows a rounded lintel instead of a black square.
export function stage5TerrainIndex(value,index,x,y,values,cell,columns){
 if(value!==257||index!==6||values[cell-1]!==173||values[cell+1]!==175||y>=8)return index;
 const dx=(x-7.5)/7.5,dy=(y-8)/8;
 return dx*dx+dy*dy>1?3:index;
}
