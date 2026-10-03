/* Three-way merge: keep separate edits, surface changes to the same field. */
(function(root){
'use strict';
const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function merge(base,local,remote){
 const conflicts=[];
 function walk(b,l,r,path){
  if(equal(l,r))return copy(l);
  if(equal(l,b))return copy(r);
  if(equal(r,b))return copy(l);
  if(object(l)&&object(r)&&(object(b)||b===undefined)){
   const out={};for(const k of new Set([...Object.keys(b||{}),...Object.keys(l),...Object.keys(r)])){
    if(['__proto__','constructor','prototype'].includes(k))continue;
    const value=walk(b?.[k],l[k],r[k],path+'.'+k);if(value!==undefined)out[k]=value;
   }return out;
  }
  if(Array.isArray(l)&&Array.isArray(r)&&(Array.isArray(b)||b===undefined)){
   const identity=x=>object(x)?x.id||x.seedId||(path.endsWith('.customFoods')?x.name?.toLowerCase():null):null;
   const all=[...(b||[]),...l,...r];
   const unique=a=>new Set(a.map(identity)).size===a.length;
   if(all.length&&all.every(x=>identity(x))&&[b||[],l,r].every(unique)){
    const bm=new Map((b||[]).map(x=>[identity(x),x])),lm=new Map(l.map(x=>[identity(x),x])),rm=new Map(r.map(x=>[identity(x),x]));
    const out=[];for(const id of new Set([...lm.keys(),...rm.keys(),...bm.keys()])){const value=walk(bm.get(id),lm.get(id),rm.get(id),path+'['+id+']');if(value!==undefined)out.push(value);}return out;
   }
  }
  conflicts.push(path);return copy(l);
 }
 return {data:walk(base,local,remote,'data'),conflicts};
}
function validate(data){
 if(!object(data)||!object(data.profile)||!object(data.logs)||!Array.isArray(data.customFoods))throw Error('This is not a CutOS data file.');
 for(const [date,day] of Object.entries(data.logs)){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!object(day)||!Array.isArray(day.food)||!Array.isArray(day.workouts))throw Error('Invalid daily log in backup.');
  for(const x of day.food)if(!object(x)||typeof x.name!=='string'||!Number.isFinite(Number(x.grams))||Number(x.grams)<0)throw Error('Invalid food entry in backup.');
 }
 const raw=JSON.stringify(data);if(raw.length>16000000)throw Error('Backup exceeds the supported size.');
 JSON.parse(raw,(k,v)=>{if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsupported key in backup.');return v;});
 return copy(data);
}
root.CutOSSyncCore={merge,equal,copy,validate};
})(typeof window==='undefined'?globalThis:window);
