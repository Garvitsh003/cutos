/* CutOS meal-first Food workspace v3. Keeps cutos-state and existing logs. */
(() => {
'use strict';
const keys=['kcal','protein','carbs','fat'];
foods.forEach(f=>{if(state.foodOverrides?.[f.name])Object.assign(f,state.foodOverrides[f.name]);});
const labels={kcal:'Calories',protein:'Protein',carbs:'Carbs',fat:'Fat'};
const e=esc;
const valid=v=>v!==null && v!==undefined && v!=='' && Number.isFinite(Number(v)) && Number(v)>=0;
const number=v=>valid(v)?Number(v):null;
const show=v=>valid(v)?Number(v).toLocaleString(undefined,{maximumFractionDigits:1}):'—';
const rawN=(f,k)=>f.unknownNutrients?.includes(k)?null:number(f[k]);
function totals(items){
 return Object.fromEntries(keys.map(k=>[k,{value:items.reduce((s,x)=>s+(rawN(x,k)??0)*Number(x.grams||0)/100,0),missing:items.filter(x=>rawN(x,k)===null).length}]));
}
function nutrition(f){
 const out={...f};
 keys.forEach(k=>out[k]=rawN(f,k));
 // Earlier OCR patches inserted zero for unrecorded carbs/fat. Do not invent certainty.
 if(!f.nutritionReviewed) ['carbs','fat'].forEach(k=>{if(!out[k])out[k]=null;});
 return out;
}
function catalogue(){return [...foods.map((f,i)=>({...nutrition(f),ref:'b:'+i})),...state.customFoods.map((f,i)=>({...nutrition(f),ref:'c:'+i}))];}
function snapshot(f,g){return {...nutrition(f),id:uid(),grams:g||f.defaultGrams||100,unknownNutrients:keys.filter(k=>rawN(nutrition(f),k)===null)};}
function groups(){
 const map=new Map();
 day().food.forEach(x=>{const id=x.mealId||'legacy:'+x.meal;if(!map.has(id))map.set(id,{id,name:x.mealName||x.meal||'Meal',meal:x.meal||'Dinner',items:[]});map.get(id).items.push(x);});
 return [...map.values()];
}
function write(change){
 const previous=structuredClone(state);
 try{change();save();return true;}catch(err){state=previous;toast('Could not save. Storage may be full. Your previous data is safe.');return false;}
}
function draft(){return state.mealDrafts?.[state.selectedDate];}
function changeDraft(fn){return write(()=>fn(draft()));}
function putDraft(d){return write(()=>{state.mealDrafts=state.mealDrafts||{};state.mealDrafts[state.selectedDate]=d;});}
function makeDraft(g){
 if(draft()&&!confirm('Replace your unfinished meal draft?'))return;
 const d=g?{...structuredClone(g),editing:g.id,items:g.items.map(nutrition)}:{id:uid(),name:'',meal:'Dinner',items:[]};
 if(putDraft(d))render();
}
function macroHTML(items){const t=totals(items);return `<div class="mf-macros">${keys.map(k=>`<div><span>${labels[k]}</span><strong>${show(t[k].value)}${k==='kcal'?'':'<small> g</small>'}</strong><small>${t[k].missing?`${t[k].missing} missing · subtotal`:k==='kcal'?'kcal':'total'}</small></div>`).join('')}</div>`;}
function warning(items){const ks=keys.filter(k=>totals(items)[k].missing);return ks.length?`<p class="mf-warning">${ks.map(k=>labels[k]).join(', ')} incomplete. Missing values are excluded; these are known subtotals.</p>`:'';}
let libraryOpen=false;
function mealView(){
 const d=draft(), list=groups();
 return `${sectionHead('FOOD · MEALS','What did you eat?',`<label class="mf-date">Date<input id="dateInput" class="dateInput" aria-label="Food log date" type="date" value="${e(state.selectedDate)}"></label>`)}
 <section class="card mf-day"><div class="sectionTitle"><h2>Today’s food${state.selectedDate===today()?'':` · ${e(state.selectedDate)}`}</h2><button id="mf-library">Ingredients</button></div>${macroHTML(day().food.map(nutrition))}${warning(day().food.map(nutrition))}</section>
 ${d?editorHTML(d):`<button class="primary mf-wide" id="mf-new">+ Add a meal</button>`}
 <section class="mf-meals"><div class="sectionTitle"><h2>Saved meals <small>${list.length}</small></h2></div>${list.length?list.map(g=>`<article class="card mf-saved"><div class="sectionTitle"><div><p class="eyebrow">${e(g.meal)}</p><h3>${e(g.name)}</h3></div><button data-mf-edit="${e(g.id)}">Edit meal</button></div><p>${g.items.length} ingredients · ${e(g.items.map(x=>x.name).join(', '))}</p>${macroHTML(g.items.map(nutrition))}${warning(g.items.map(nutrition))}<button class="mf-delete" data-mf-delete="${e(g.id)}">Delete meal</button></article>`).join(''):'<div class="card empty">Your meals will appear here. Start with a meal name, then add what went into it.</div>'}</section>
 <details class="card mf-help"><summary>Dinner presets & portion assistant</summary><p>Load a preset into the meal editor, adjust the weights, then save when ready.</p><div class="mf-presets">${dinnerPresets.map((p,i)=>`<button data-mf-preset="${i}">${e(p[0])}</button>`).join('')}</div></details>
 ${libraryOpen?libraryHTML():''}`;
}
function editorHTML(d){return `<section class="card mf-editor"><div class="sectionTitle"><div><p class="eyebrow">${d.editing?'EDIT MEAL':'NEW MEAL'}</p><h2>Build your plate</h2></div><button id="mf-discard">${d.editing?'Cancel':'Discard'}</button></div>
 <div class="mf-meal-meta"><label>Meal name<input id="mf-name" value="${e(d.name)}" placeholder="e.g. Paneer bhurji with roti" maxlength="100"></label><label>Meal time<select id="mf-type">${['Breakfast','Lunch','Snack','Dinner'].map(m=>`<option ${d.meal===m?'selected':''}>${m}</option>`).join('')}</select></label></div>
 <div class="mf-ingredients">${d.items.map((x,i)=>`<article class="mf-row"><div class="mf-row-head"><div><b>${e(x.name)}</b><small id="mf-row-info-${i}">${rowInfo(x)}</small></div><button data-mf-remove="${i}" aria-label="Remove ${e(x.name)}">×</button></div><div class="mf-row-controls"><label>Weight (g)<input data-mf-weight="${i}" inputmode="decimal" type="number" min="0.1" step="any" value="${e(x.grams)}"></label><button data-mf-nutrition="${i}">Edit nutrition</button></div></article>`).join('')||'<p class="empty">Add your ingredients below. Weigh them in the same form as the nutrition entry: dry, raw, or cooked.</p>'}</div>
 <button class="mf-add" id="mf-add">+ Add ingredient</button>
 <details class="mf-portion"><summary>Suggest weights for this meal</summary><p>Scales the current ingredient proportions to your calorie target. Review oil and serving sizes before using it.</p><label>Meal target (kcal)<input id="mf-target" type="number" min="100" max="2000" value="650"></label><button id="mf-scale">Suggest weights</button></details>
 <div class="mf-live" id="mf-live" aria-live="polite">${macroHTML(d.items)}${warning(d.items)}</div><p class="mf-hint">Draft saved on this browser. Only saved meals count toward your day.</p><button class="primary mf-wide" id="mf-save">${d.editing?'Save changes':'Save meal'}</button></section>`;}
function rowInfo(x){const t=totals([x]);return `${valid(x.kcal)?show(t.kcal.value)+' kcal':'Calories missing'} · ${valid(x.protein)?show(t.protein.value)+' g protein':'Protein missing'}${keys.some(k=>rawN(x,k)===null)?' · incomplete nutrition':''}`;}
function libraryHTML(){return `<section class="card" id="mf-library-panel"><div class="sectionTitle"><h2>Ingredient library</h2><button id="mf-library-close">Close</button></div><p>Edit your staples or add a nutrition label. Changes apply to future additions; saved meals keep their own nutrition values.</p><input id="mf-library-search" type="search" placeholder="Find an ingredient" aria-label="Search ingredient library"><button id="mf-library-new" class="mf-add">+ Create / scan ingredient</button><div id="mf-library-list">${libraryRows('')}</div></section>`;}
function libraryRows(query){return catalogue().filter(f=>f.name.toLowerCase().includes(query.toLowerCase())).map(f=>`<div class="mf-library-row"><div><b>${e(f.name)}</b><small>${show(f.kcal)} kcal · ${show(f.protein)} g protein / 100 g</small></div><div><button data-mf-food="${f.ref}">Edit</button>${f.ref.startsWith('c:')?`<button data-mf-food-delete="${f.ref}">Delete</button>`:''}</div></div>`).join('')||'<p>No matching ingredient. Create one above.</p>';}
let dialog=null,lastFocus=null,scanId=0;
function closeDialog(){scanId++;dialog?.close();dialog?.remove();dialog=null;lastFocus?.focus();}
function modal(title,content){
 closeDialog();lastFocus=document.activeElement;dialog=document.createElement('dialog');dialog.className='mf-dialog';dialog.innerHTML=`<div class="mf-modal-head"><h2>${e(title)}</h2><button id="mf-close" aria-label="Close dialog">×</button></div>${content}`;
 document.body.appendChild(dialog);dialog.showModal();dialog.querySelector('#mf-close').onclick=closeDialog;dialog.addEventListener('cancel',ev=>{ev.preventDefault();closeDialog();});return dialog;
}
function picker(){
 const el=modal('Add ingredient',`<input id="mf-search" autofocus type="search" placeholder="Search paneer, milk, atta…" aria-label="Search ingredients"><div id="mf-results"></div><button id="mf-create" class="mf-add">+ New ingredient / scan label</button>`);
 const search=()=>{
  const q=el.querySelector('#mf-search').value.trim(),matches=catalogue().filter(f=>f.name.toLowerCase().includes(q.toLowerCase()));
  el.querySelector('#mf-results').innerHTML=matches.map(f=>`<button class="mf-result" data-mf-pick="${f.ref}"><span><b>${e(f.name)}</b><small>${show(f.kcal)} kcal · ${show(f.protein)} g protein / 100 g</small></span><span>+</span></button>`).join('')||'<p>Not found. Add it below; you can leave unknown nutrition blank.</p>';
  el.querySelectorAll('[data-mf-pick]').forEach(b=>b.onclick=()=>{const f=catalogue().find(f=>f.ref===b.dataset.mfPick);if(changeDraft(d=>d.items.push(snapshot(f)))){closeDialog();render();}});
 };
 el.querySelector('#mf-search').oninput=search;el.querySelector('#mf-create').onclick=()=>ingredientForm(null,null,true,el.querySelector('#mf-search').value.trim());search();
}
function ingredientForm(f,ref,addToMeal=false,newName=''){
 const isRow=ref?.startsWith('r:'),builtin=ref?.startsWith('b:'),v=nutrition(f||{name:newName,defaultGrams:100});
 const el=modal(isRow?'Edit meal ingredient':f?'Edit ingredient':'New ingredient',`<div class="mf-scan"><label class="mf-add">Scan nutrition label<input id="mf-photo" type="file" accept="image/*"></label><p id="mf-scan-status" role="status">Upload a clear label. Review all extracted values before saving.</p></div><img id="mf-photo-preview" alt="Nutrition label preview" ${v.imageData?'src="'+e(v.imageData)+'"':'hidden'}>
 <form id="mf-ingredient-form"><div class="mf-fields"><label class="mf-span">Ingredient name<input id="mf-f-name" required maxlength="100" value="${e(v.name||'')}" ${builtin?'readonly':''}></label>${keys.map(k=>`<label>${labels[k]} / 100 g<input id="mf-f-${k}" type="number" min="0" ${k==='kcal'?'max="1000"':'max="100"'} step="any" placeholder="Unknown" value="${valid(v[k])?v[k]:''}"></label>`).join('')}<label>${isRow?'Weight in meal':'Usual serving'} (g)<input id="mf-f-serving" required type="number" min="0.1" step="any" value="${isRow?v.grams:v.defaultGrams||100}"></label></div><p class="mf-hint">Blank means unknown. Enter 0 only when the label confirms zero. Values here must be per 100 g; convert per-serving labels before saving.</p><details><summary>OCR text & conversion</summary><textarea id="mf-ocr-text" rows="5" readonly aria-label="Extracted OCR text"></textarea><label>Label’s values are per<select id="mf-basis"><option value="100">100 g</option><option value="serving">serving</option><option value="unknown">Choose label basis</option></select></label><label>Label serving size (g)<input id="mf-label-serving" type="number" min="0.1" step="any" value="100"></label><button type="button" id="mf-convert">Convert fields to per 100 g</button><p id="mf-conversion-status"></p></details>${isRow?'<label class="mf-check"><input id="mf-also-library" type="checkbox"> Also update this ingredient in my library for future meals</label>':''}<button class="primary mf-wide" type="submit">${isRow?'Update ingredient':addToMeal?'Save ingredient & add to meal':'Save ingredient'}</button><p id="mf-form-error" role="alert"></p></form>`);
 let imageData=v.imageData||'';
 el.querySelector('#mf-convert').onclick=()=>{const g=Number(el.querySelector('#mf-label-serving').value);if(el.querySelector('#mf-basis').value!=='serving'||!g)return;keys.forEach(k=>{const input=el.querySelector('#mf-f-'+k);if(input.value!=='')input.value=String(Math.round(Number(input.value)*100/g*100)/100);});el.querySelector('#mf-basis').value='100';el.querySelector('#mf-conversion-status').textContent='Converted to per 100 g. Check the result against the label.';};
 el.querySelector('#mf-photo').onchange=async ev=>{
  const file=ev.target.files?.[0];if(!file)return;
  const token=++scanId,status=el.querySelector('#mf-scan-status');
  if(file.size>20*1024*1024){status.textContent='Choose an image smaller than 20 MB.';return;}
  status.textContent='Reading label…';el.querySelector('[type=submit]').disabled=true;
  try{
   imageData=await compress(file);if(token!==scanId)return;
   const preview=el.querySelector('#mf-photo-preview');preview.src=imageData;preview.hidden=false;
   await loadOCR();if(token!==scanId)return;
   let worker;
   try{worker=await window.Tesseract.createWorker('eng',1,{logger:m=>{if(token===scanId&&m.status==='recognizing text')status.textContent='Reading label… '+Math.round(m.progress*100)+'%';}});const result=await worker.recognize(file);if(token!==scanId)return;
    const parsed=parseLabel(result.data.text||'');el.querySelector('#mf-ocr-text').value=parsed.raw;
    keys.forEach(k=>el.querySelector('#mf-f-'+k).value=parsed[k]??'');
    if(parsed.serving){el.querySelector('#mf-label-serving').value=parsed.serving;if(!isRow)el.querySelector('#mf-f-serving').value=parsed.serving;}
    if(!builtin&&!el.querySelector('#mf-f-name').value&&parsed.name)el.querySelector('#mf-f-name').value=parsed.name;
    el.querySelector('#mf-basis').value=parsed.basis;
    status.textContent=parsed.message;
    if(parsed.basis!=='100')el.querySelector('details').open=true;
   }finally{if(worker)await worker.terminate();}
  }catch(err){if(token===scanId)status.textContent='Could not scan. Check your connection or enter the values manually. '+err.message;}finally{if(token===scanId)el.querySelector('[type=submit]').disabled=false;}
 };
 el.querySelector('form').onsubmit=ev=>{
  ev.preventDefault();const name=el.querySelector('#mf-f-name').value.trim(),g=Number(el.querySelector('#mf-f-serving').value);
  if(!name||g<=0)return;
  if(el.querySelector('#mf-basis').value!=='100'){el.querySelector('#mf-form-error').textContent='Confirm the label basis. Convert per-serving fields to per 100 g before saving.';return;}
  const updated={name,defaultGrams:g,imageData,nutritionReviewed:true};keys.forEach(k=>updated[k]=number(el.querySelector('#mf-f-'+k).value));updated.unknownNutrients=keys.filter(k=>updated[k]===null);
  const duplicates=catalogue().find(x=>x.name.toLowerCase()===name.toLowerCase()&&x.ref!==ref);
  if(!isRow&&duplicates){el.querySelector('#mf-form-error').textContent='An ingredient already has that name. Edit the existing entry or use a different name.';return;}
  const applyLibrary=(r,u)=>{const [kind,index]=r.split(':');if(kind==='b'){state.foodOverrides=state.foodOverrides||{};state.foodOverrides[foods[Number(index)].name]={...u,name:foods[Number(index)].name};}else state.customFoods[Number(index)]={...state.customFoods[Number(index)],...u};};
  const ok=write(()=>{
   if(isRow){const i=Number(ref.slice(2));draft().items[i]={...draft().items[i],...updated,grams:g};if(el.querySelector('#mf-also-library').checked){const entry=catalogue().find(x=>x.name===f.name);if(entry)applyLibrary(entry.ref,{...updated,name:entry.name});else state.customFoods.push(updated);}}
   else if(ref)applyLibrary(ref,updated);else state.customFoods.push(updated);
   if(addToMeal)draft().items.push(snapshot(updated,g));
  });
  if(ok){foods.forEach(x=>{if(state.foodOverrides?.[x.name])Object.assign(x,state.foodOverrides[x.name]);});closeDialog();render();toast('Ingredient saved');}
 };
}
function parseLabel(raw){
 const lines=raw.split(/\r?\n/),out={raw,basis:/per\s*100\s*g|100\s*g/i.test(raw)?'100':/per\s*serv|serving\s*size/i.test(raw)?'serving':'unknown'};
 const serving=raw.match(/serv(?:ing|e)\s*size[^\d\n]{0,20}(\d+(?:[.,]\d+)?)\s*g/i);out.serving=serving?Number(serving[1].replace(',','.')):null;
 const patterns={kcal:/energy|calories|calorific/i,protein:/protein/i,carbs:/carbohydrate|carbs/i,fat:/^\s*(?:total\s+)?fat\b/i};
 let ambiguous=false;
 keys.forEach(k=>{
  const line=lines.find(l=>patterns[k].test(l));out[k]=null;if(!line)return;
  const numbers=(line.match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>Number(x.replace(',','.')));
  if(numbers.length!==1){ambiguous=true;return;}
  if(k==='kcal'&&!/kcal|calories/i.test(line)){ambiguous=true;return;}
  out[k]=numbers[0];
 });
 if(/\b100\s*ml\b|serving[^\n]*\bml\b/i.test(raw)){out.basis='unknown';keys.forEach(k=>out[k]=null);ambiguous=true;}
 out.name=lines.find(l=>l.trim().length>3&&l.trim().length<65&&!/nutrition|energy|calori|protein|fat|carb|sugar|salt|sodium|fiber|fibre|serv|ingredient|\d/i.test(l))?.trim()||'';
 out.message=ambiguous?'Some rows have multiple columns or unclear units. They were left blank; verify them in the label.':out.basis==='serving'?'Values read per serving. Check them, then convert to per 100 g below.':out.basis==='unknown'?'Could not confirm the label basis. Verify that all fields are per 100 g before saving.':'Label read. Review every value before saving; blank fields were not found.';
 return out;
}
async function loadOCR(){if(window.Tesseract)return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('OCR download failed'));document.head.appendChild(s);});}
async function compress(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{const c=document.createElement('canvas'),scale=Math.min(1,1000/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',.8));};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Image could not be opened'));};img.src=url;});}
function refreshTotals(){const d=draft();document.querySelector('#mf-live').innerHTML=macroHTML(d.items)+warning(d.items);d.items.forEach((x,i)=>{const el=document.querySelector('#mf-row-info-'+i);if(el)el.textContent=rowInfo(x);});}
const oldBind=bind;
foodView=mealView;
bind=function(){
 oldBind();if(state.tab!=='food')return;
 $('#mf-new')?.addEventListener('click',()=>makeDraft());
 $('#mf-name')?.addEventListener('input',ev=>changeDraft(d=>d.name=ev.target.value));
 $('#mf-type')?.addEventListener('change',ev=>changeDraft(d=>d.meal=ev.target.value));
 $('#mf-discard')?.addEventListener('click',()=>{if(confirm('Discard this draft? Saved meals stay unchanged.')&&write(()=>delete state.mealDrafts[state.selectedDate]))render();});
 $('#mf-add')?.addEventListener('click',picker);
 $$('[data-mf-weight]').forEach(input=>input.oninput=()=>{const i=Number(input.dataset.mfWeight),g=number(input.value);if(changeDraft(d=>d.items[i].grams=g??0))refreshTotals();});
 $$('[data-mf-nutrition]').forEach(b=>b.onclick=()=>ingredientForm(draft().items[Number(b.dataset.mfNutrition)],'r:'+b.dataset.mfNutrition));
 $$('[data-mf-remove]').forEach(b=>b.onclick=()=>{if(changeDraft(d=>d.items.splice(Number(b.dataset.mfRemove),1)))render();});
 $('#mf-save')?.addEventListener('click',()=>{
  const d=draft();if(!d.name.trim())return toast('Give your meal a name');if(!d.items.length)return toast('Add at least one ingredient');if(d.items.some(x=>!Number.isFinite(x.grams)||x.grams<=0))return toast('Enter a positive weight for every ingredient');
  if(write(()=>{if(d.editing)day().food=day().food.filter(x=>(x.mealId||'legacy:'+x.meal)!==d.editing);day().food.push(...d.items.map(x=>({...x,mealId:d.id,mealName:d.name.trim(),meal:d.meal,unknownNutrients:keys.filter(k=>rawN(x,k)===null)})));delete state.mealDrafts[state.selectedDate];})){render();toast('Meal saved');}
 });
 $$('[data-mf-edit]').forEach(b=>b.onclick=()=>makeDraft(groups().find(g=>g.id===b.dataset.mfEdit)));
 $$('[data-mf-delete]').forEach(b=>b.onclick=()=>{if(confirm('Delete this meal?')&&write(()=>day().food=day().food.filter(x=>(x.mealId||'legacy:'+x.meal)!==b.dataset.mfDelete)))render();});
 $$('[data-mf-preset]').forEach(b=>b.onclick=()=>{const p=dinnerPresets[Number(b.dataset.mfPreset)];if(draft()&&!confirm('Replace your unfinished draft with this preset?'))return;if(putDraft({id:uid(),name:p[0],meal:'Dinner',items:p[1].map(([name,g])=>snapshot(foodDef(name),g))}))render();});
 $('#mf-scale')?.addEventListener('click',()=>{const d=draft(),target=Number($('#mf-target').value),t=totals(d.items).kcal;if(!d.items.length||t.missing||!t.value)return toast('Add calories for every ingredient first');if(target<100||target>2000)return toast('Choose a target between 100 and 2,000 kcal');const scale=target/t.value;if(changeDraft(d=>d.items.forEach(x=>x.grams=Math.max(.1,Math.round(x.grams*scale*10)/10)))){render();toast('Suggested weights applied. Review portions before saving.');}});
 $('#mf-library')?.addEventListener('click',()=>{libraryOpen=!libraryOpen;render();$('#mf-library-panel')?.scrollIntoView({behavior:'smooth'});});
 $('#mf-library-close')?.addEventListener('click',()=>{libraryOpen=false;render();});
 $('#mf-library-new')?.addEventListener('click',()=>ingredientForm(null,null));
 const bindLibrary=()=>{ $$('[data-mf-food]').forEach(b=>b.onclick=()=>ingredientForm(catalogue().find(f=>f.ref===b.dataset.mfFood),b.dataset.mfFood)); $$('[data-mf-food-delete]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.mfFoodDelete.slice(2)),name=state.customFoods[i].name;if(confirm('Remove '+name+' from your library? Saved meals stay unchanged.')&&write(()=>{state.customFoods.splice(i,1);state.recipeNames=state.recipeNames.filter(n=>n!==name);}))render();}); }; 
 $('#mf-library-search')?.addEventListener('input',ev=>{$('#mf-library-list').innerHTML=libraryRows(ev.target.value);bindLibrary();});bindLibrary();
};
// The dashboard and weekly budget must not imply incomplete calories are complete.
const oldToday=todayView,oldWeek=weekView;
todayView=function(){const missing=day().food.map(nutrition);return warning(missing)+oldToday();};
weekView=function(){const items=weekDates().flatMap(d=>state.logs[d]?.food||[]).map(nutrition);return warning(items)+oldWeek();};
window.CutOSMealMath={totals,parseLabel,nutrition};
render();
})();
