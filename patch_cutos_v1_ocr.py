from pathlib import Path
import re

app = Path('app.js')
index = Path('index.html')
css = Path('styles.css')
sw = Path('sw.js')

for f in (app,index,css,sw):
    if not f.exists():
        raise SystemExit(f'Missing {f}. Run this from the CutOS v1 folder.')

text = app.read_text()

# 1) OCR/image helpers after esc()
esc_line = '''const esc = s => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));'''
# Because quote serialization can differ, find line by prefix.
lines = text.splitlines()
idx = next((i for i,l in enumerate(lines) if l.startswith('const esc = ')), None)
if idx is None:
    raise SystemExit('Could not find esc helper in app.js')

helpers = r'''

async function fileToDataURL(file,maxSide=1000,quality=.82){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Image read failed'));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('Image load failed'));
      img.onload=()=>{
        const scale=Math.min(1,maxSide/Math.max(img.width,img.height));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(img.width*scale));
        canvas.height=Math.max(1,Math.round(img.height*scale));
        canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg',quality));
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function cleanOCRNumber(value){
  if(value==null)return 0;
  const n=Number(String(value).replace(/,/g,'.').replace(/[^0-9.]/g,''));
  return Number.isFinite(n)?n:0;
}

function firstMatch(text,patterns){
  for(const pattern of patterns){
    const m=text.match(pattern);
    if(m)return cleanOCRNumber(m[1]);
  }
  return 0;
}

function guessFoodNameFromOCR(raw){
  const blocked=/nutrition|nutritional|information|energy|calorie|protein|carbo|sugar|fat|sodium|salt|fibre|fiber|serving|per\s*100|ingredients?|daily value|%dv/i;
  const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const candidate=lines.find(line=>
    line.length>=3 && line.length<=60 &&
    /[A-Za-z]{3}/.test(line) &&
    !blocked.test(line) &&
    !/^\d/.test(line)
  );
  return candidate ? candidate.replace(/[^A-Za-z0-9 '&()+.-]/g,' ').replace(/\s+/g,' ').trim() : 'Scanned food';
}

function parseNutritionOCR(raw){
  const text=String(raw||'').replace(/\u00a0/g,' ').replace(/[|]/g,' ');
  const lower=text.toLowerCase();

  const serving=firstMatch(lower,[
    /serving\s*size[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*g\b/i,
    /serve\s*size[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*g\b/i,
    /per\s*serv(?:e|ing)[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*g\b/i
  ]);

  const kcal=firstMatch(lower,[
    /(?:energy|calories?|calorific\s*value)[^\n\r]{0,80}?(\d+(?:[.,]\d+)?)\s*kcal\b/i,
    /(?:energy|calories?|calorific\s*value)[^\n\r]{0,40}?kcal[^0-9]{0,15}(\d+(?:[.,]\d+)?)/i,
    /(\d+(?:[.,]\d+)?)\s*kcal\b/i
  ]);

  const protein=firstMatch(lower,[
    /protein[^\n\r0-9]{0,25}(\d+(?:[.,]\d+)?)\s*g\b/i,
    /protein[^\n\r]{0,50}?(\d+(?:[.,]\d+)?)/i
  ]);

  const carbs=firstMatch(lower,[
    /(?:total\s*)?carbohydrates?[^\n\r0-9]{0,25}(\d+(?:[.,]\d+)?)\s*g\b/i,
    /carbs?[^\n\r0-9]{0,25}(\d+(?:[.,]\d+)?)\s*g\b/i
  ]);

  const fat=firstMatch(lower,[
    /(?:total\s*)?fat[^\n\r0-9]{0,25}(\d+(?:[.,]\d+)?)\s*g\b/i
  ]);

  const mentions100=/per\s*100\s*g|100\s*g\s*(?:serve|serving|portion)/i.test(lower);
  const mentionsServing=/per\s*serv(?:e|ing)|serving\s*size/i.test(lower);

  let kcal100=kcal, protein100=protein, carbs100=carbs, fat100=fat;
  let normalizedFromServing=false;

  // If the label appears to list only per-serving values, normalize to /100g.
  if(!mentions100 && mentionsServing && serving>0){
    const factor=100/serving;
    kcal100=kcal?kcal*factor:0;
    protein100=protein?protein*factor:0;
    carbs100=carbs?carbs*factor:0;
    fat100=fat?fat*factor:0;
    normalizedFromServing=true;
  }

  return {
    name:guessFoodNameFromOCR(text),
    kcal:Math.round(kcal100*10)/10,
    protein:Math.round(protein100*10)/10,
    carbs:Math.round(carbs100*10)/10,
    fat:Math.round(fat100*10)/10,
    defaultGrams:serving||100,
    normalizedFromServing,
    raw:text
  };
}

async function runNutritionOCR(file,onProgress){
  if(!window.Tesseract) throw new Error('OCR library is not loaded. Check your internet connection.');
  let worker;
  try{
    worker=await Tesseract.createWorker('eng',1,{
      logger:m=>{
        if(m.status==='recognizing text' && onProgress){
          onProgress(Math.round((m.progress||0)*100));
        }
      }
    });
    const result=await worker.recognize(file,{rotateAuto:true});
    return parseNutritionOCR(result.data.text||'');
  } finally {
    if(worker) await worker.terminate();
  }
}
'''

if 'function parseNutritionOCR(' not in text:
    lines[idx] = lines[idx] + helpers
    text='\n'.join(lines) + ('\n' if text.endswith('\n') else '')

# 2) Base-food snapshots and overrides.
needle = "].map(([name,kcal,protein,defaultGrams])=>({name,kcal,protein,defaultGrams}));"
if needle not in text:
    raise SystemExit('Could not find built-in foods declaration')
if 'const baseFoodDefaults' not in text:
    text=text.replace(needle, needle + "\nconst baseFoodDefaults=Object.fromEntries(foods.map(f=>[f.name,{...f,carbs:0,fat:0,imageData:''}]));")

# Add foodOverrides to defaults
text=text.replace("  customFoods:[]\n};", "  customFoods:[], foodOverrides:{}\n};")

# Apply overrides after state load.
if 'function applyFoodOverrides()' not in text:
    text=text.replace("let state = load();", "let state = load();\nfunction applyFoodOverrides(){\n  state.foodOverrides=state.foodOverrides||{};\n  foods.forEach(f=>Object.assign(f,baseFoodDefaults[f.name],state.foodOverrides[f.name]||{}));\n  state.customFoods=(state.customFoods||[]).map(f=>({...f,carbs:Number(f.carbs||0),fat:Number(f.fat||0),imageData:f.imageData||''}));\n}\napplyFoodOverrides();")

# 3) Replace foodView with OCR add + editable manager.
start=text.index('function foodView(){')
end=text.index('function recipeSuggestion(){')
food_view=r'''function foodView(){
  const d=day();
  const all=[...foods,...state.customFoods];
  const quick=all.slice(0,40).map(f=>`<button class="quickFood ${f.imageData?'hasThumb':''}" data-quick="${esc(f.name)}">${f.imageData?`<img src="${f.imageData}" alt="${esc(f.name)}">`:''}<div><b>${esc(f.name)}</b><small>${f.defaultGrams}g · ${fmt(f.defaultGrams*f.kcal/100)} kcal · ${fmt(f.defaultGrams*f.protein/100)}g P</small></div></button>`).join('');
  const presets=dinnerPresets.map((p,i)=>{let k=0,pr=0;p[1].forEach(([n,g])=>{const f=foodDef(n);k+=g*f.kcal/100;pr+=g*f.protein/100});return `<button class="preset" data-preset="${i}"><div><b>${p[0]}</b><small>${p[1].map(([n,g])=>`${g}g ${n}`).join(' · ')}</small></div><div><strong>${fmt(k)}</strong><span>kcal</span><small>${fmt(pr)}g P</small></div></button>`}).join('');
  const pick=all.map(f=>`<label class="${state.recipeNames.includes(f.name)?'selected':''}"><input type="checkbox" data-recipe-name="${esc(f.name)}" ${state.recipeNames.includes(f.name)?'checked':''}>${esc(f.name)}</label>`).join('');
  const sugg=recipeSuggestion();
  const logged=d.food.length?d.food.map(x=>`<div class="logRow"><div><b>${esc(x.name)}</b><small>${x.meal} · ${x.grams}g · ${fmt(protein(x))}g P</small></div><span>${fmt(calories(x))} kcal</span><button data-remove-food="${x.id}">×</button></div>`).join(''):'<div class="empty">Nothing logged yet.</div>';

  const manager=all.map((f,i)=>{
    const builtin=i<foods.length;
    const index=builtin?i:i-foods.length;
    return `<div class="foodManageRow"><div class="foodManageInfo">${f.imageData?`<img src="${f.imageData}" alt="${esc(f.name)}">`:`<div class="foodAvatar">${esc(f.name).slice(0,2).toUpperCase()}</div>`}<div><b>${esc(f.name)}</b><small>${fmt(f.kcal)} kcal · ${Number(f.protein||0).toFixed(1)}g P /100g · default ${fmt(f.defaultGrams)}g</small><small>${builtin?'Built-in staple':'Custom ingredient'}</small></div></div><div class="foodManageActions"><button data-edit-food="${builtin?'builtin':'custom'}|${index}">Edit</button>${builtin?'':`<button class="dangerMini" data-delete-custom="${index}">Delete</button>`}</div></div>`;
  }).join('');

  return `${sectionHead('FOOD LAB','Log, scan, build, balance.',`<input class="dateInput" id="dateInput" type="date" value="${state.selectedDate}">`)}
  <section class="card"><div class="sectionTitle"><div><h2>Quick add staples</h2><p>Tap a food, then choose the meal.</p></div></div><div class="foodChips">${quick}</div></section>
  <section class="card"><div class="sectionTitle"><div><h2>Your dinner presets</h2><p>Raw weights, including measured oil. Edited staple nutrition values are used automatically.</p></div></div><div class="presetList">${presets}</div></section>
  <section class="card builder"><div class="sectionTitle"><div><h2>Recipe Weight Assistant</h2><p>Select raw ingredients and CutOS scales sensible starting weights toward your meal target.</p></div></div><div class="ingredientPicker">${pick}</div><div class="targetRow"><label>Meal calorie target<input id="recipeRange" type="range" min="350" max="900" step="25" value="${state.recipeTarget}"></label><strong>${state.recipeTarget} kcal</strong></div><div class="suggestionBox"><div class="macroHeadline"><span><b>${fmt(sugg.kcal)}</b> kcal</span><span><b>${fmt(sugg.protein)}</b>g protein</span></div>${sugg.items.map(x=>`<div class="mealRow"><b>${x.name}</b><span>${x.grams} g raw</span></div>`).join('')}<button class="primary" id="addSuggested">Add this recipe to dinner</button></div></section>

  <section class="card scanCard"><div class="sectionTitle"><div><h2>Scan a new ingredient</h2><p>Take/upload a clear nutrition-label photo. OCR automatically fills the form; you can correct anything before saving.</p></div></div>
    <label class="scanDrop"><input id="newImage" type="file" accept="image/*" capture="environment"><span>📷</span><b>Choose / take nutrition-label photo</b><small>English labels work best. Keep the table flat, bright and in focus.</small></label>
    <div id="ocrStatus" class="ocrStatus">Waiting for image</div>
    <div class="scanPreview" id="scanPreview"></div>
    <div class="nutritionGrid">
      <label>Name<input id="newName" placeholder="Product name"></label>
      <label>Calories / 100g<input id="newKcal" type="number" step="0.1" placeholder="kcal"></label>
      <label>Protein / 100g<input id="newProtein" type="number" step="0.1" placeholder="g"></label>
      <label>Carbs / 100g<input id="newCarbs" type="number" step="0.1" placeholder="g"></label>
      <label>Fat / 100g<input id="newFat" type="number" step="0.1" placeholder="g"></label>
      <label>Serving / usual grams<input id="newDefault" type="number" step="0.1" placeholder="g"></label>
    </div>
    <details class="ocrRawWrap"><summary>Show OCR text</summary><pre id="ocrRaw">No scan yet.</pre></details>
    <button class="primary fullBtn" id="addCustomFood">Save scanned ingredient</button>
  </section>

  <section class="card"><div class="sectionTitle"><div><h2>Manage ingredients</h2><p>Edit kcal, protein, serving size or image for built-in staples and your own foods.</p></div></div><div class="foodManager">${manager}</div></section>
  <section class="card"><div class="sectionTitle"><h2>Logged on ${state.selectedDate}</h2></div>${logged}</section>`;
}

'''
text=text[:start]+food_view+text[end:]

# 4) Insert editor modal helpers before render().
render_idx=text.index('function render(){')
editor_helpers=r'''
let currentFoodEditor=null;

function syncLoggedFoodNutrition(oldName,newFood){
  Object.values(state.logs||{}).forEach(d=>{
    (d.food||[]).forEach(item=>{
      if(item.name===oldName){
        item.name=newFood.name;
        item.kcal=newFood.kcal;
        item.protein=newFood.protein;
      }
    });
  });
}

function closeFoodEditor(){
  $('#foodEditorModal')?.remove();
  currentFoodEditor=null;
}

function openFoodEditor(source,index){
  const builtin=source==='builtin';
  const f=builtin?foods[index]:state.customFoods[index];
  if(!f)return;
  currentFoodEditor={source,index,originalName:f.name};
  $('#foodEditorModal')?.remove();
  const modal=document.createElement('div');
  modal.id='foodEditorModal';
  modal.className='modalBackdrop';
  modal.innerHTML=`<div class="editorModal"><div class="editorHead"><div><p class="eyebrow">INGREDIENT EDITOR</p><h2>${esc(f.name)}</h2></div><button id="closeFoodEditor">×</button></div>
    <label class="scanDrop compact"><input id="editImage" type="file" accept="image/*" capture="environment"><span>📷</span><b>Replace image / scan label</b><small>Choosing an image runs OCR and updates the fields below.</small></label>
    <div id="editOcrStatus" class="ocrStatus">${f.imageData?'Current image saved':'No image saved'}</div>
    <div class="editPreview">${f.imageData?`<img id="editPreviewImg" src="${f.imageData}" alt="${esc(f.name)}">`:'<div id="editPreviewImg"></div>'}</div>
    <div class="nutritionGrid">
      <label>Name<input id="editName" value="${esc(f.name)}" ${builtin?'readonly':''}></label>
      <label>Calories / 100g<input id="editKcal" type="number" step="0.1" value="${Number(f.kcal||0)}"></label>
      <label>Protein / 100g<input id="editProtein" type="number" step="0.1" value="${Number(f.protein||0)}"></label>
      <label>Carbs / 100g<input id="editCarbs" type="number" step="0.1" value="${Number(f.carbs||0)}"></label>
      <label>Fat / 100g<input id="editFat" type="number" step="0.1" value="${Number(f.fat||0)}"></label>
      <label>Serving / usual grams<input id="editDefault" type="number" step="0.1" value="${Number(f.defaultGrams||100)}"></label>
    </div>
    <details class="ocrRawWrap"><summary>Show OCR text</summary><pre id="editOcrRaw">No new scan yet.</pre></details>
    <div class="editorActions">${builtin?'<button id="resetBuiltin" class="secondaryBtn">Reset built-in defaults</button>':''}<button id="saveFoodEdit" class="primary">Save changes</button></div>
  </div>`;
  document.body.appendChild(modal);
  $('#closeFoodEditor').onclick=closeFoodEditor;
  modal.addEventListener('click',e=>{if(e.target===modal)closeFoodEditor();});
  $('#editImage').onchange=async e=>{
    const file=e.target.files?.[0]; if(!file)return;
    await scanFileIntoFields(file,'edit');
  };
  $('#saveFoodEdit').onclick=saveFoodEdit;
  $('#resetBuiltin')?.addEventListener('click',()=>{
    const base=baseFoodDefaults[f.name];
    delete state.foodOverrides[f.name];
    Object.assign(foods[index],base);
    save(); closeFoodEditor(); toast('Built-in food reset'); render();
  });
}

async function scanFileIntoFields(file,prefix){
  const status=$(prefix==='new'?'#ocrStatus':'#editOcrStatus');
  const rawEl=$(prefix==='new'?'#ocrRaw':'#editOcrRaw');
  if(status)status.textContent='Loading OCR…';
  try{
    const imageData=await fileToDataURL(file);
    if(prefix==='new'){
      const box=$('#scanPreview'); if(box)box.innerHTML=`<img src="${imageData}" alt="Nutrition label preview">`;
      box?.setAttribute('data-image',imageData);
    } else {
      let img=$('#editPreviewImg');
      if(!img || img.tagName!=='IMG'){
        const wrap=$('.editPreview'); wrap.innerHTML='<img id="editPreviewImg" alt="Nutrition label preview">'; img=$('#editPreviewImg');
      }
      img.src=imageData; img.dataset.image=imageData;
    }
    const parsed=await runNutritionOCR(file,p=>{if(status)status.textContent=`Reading label… ${p}%`;});
    const get=id=>$('#'+id);
    const nameField=get(prefix==='new'?'newName':'editName');
    if(nameField && (!nameField.readOnly || prefix==='new')) nameField.value=parsed.name;
    get(prefix==='new'?'newKcal':'editKcal').value=parsed.kcal||'';
    get(prefix==='new'?'newProtein':'editProtein').value=parsed.protein||'';
    get(prefix==='new'?'newCarbs':'editCarbs').value=parsed.carbs||'';
    get(prefix==='new'?'newFat':'editFat').value=parsed.fat||'';
    get(prefix==='new'?'newDefault':'editDefault').value=parsed.defaultGrams||100;
    if(rawEl)rawEl.textContent=parsed.raw||'No text found.';
    if(status){
      const found=[parsed.kcal?'calories':'',parsed.protein?'protein':'',parsed.defaultGrams?'serving':''].filter(Boolean).join(', ');
      status.textContent=`OCR complete${found?` · found ${found}`:''}${parsed.normalizedFromServing?' · converted serving values to /100g':''}. Review before saving.`;
    }
  }catch(err){
    if(status)status.textContent=`OCR failed: ${err.message}. You can still enter the values manually.`;
  }
}

function saveFoodEdit(){
  if(!currentFoodEditor)return;
  const {source,index,originalName}=currentFoodEditor;
  const builtin=source==='builtin';
  const name=($('#editName').value||'').trim();
  const values={
    kcal:Number($('#editKcal').value),
    protein:Number($('#editProtein').value)||0,
    carbs:Number($('#editCarbs').value)||0,
    fat:Number($('#editFat').value)||0,
    defaultGrams:Number($('#editDefault').value),
  };
  if(!name || values.kcal<=0 || values.defaultGrams<=0)return toast('Name, calories and serving grams are required');
  const preview=$('#editPreviewImg');
  const imageData=preview?.dataset?.image || (preview?.tagName==='IMG'?preview.src:'') || '';

  if(builtin){
    state.foodOverrides[originalName]={...values,imageData:imageData.startsWith('data:')?imageData:(foods[index].imageData||'')};
    Object.assign(foods[index],state.foodOverrides[originalName]);
    syncLoggedFoodNutrition(originalName,foods[index]);
  }else{
    const oldName=state.customFoods[index].name;
    state.customFoods[index]={...state.customFoods[index],name,...values,imageData:imageData.startsWith('data:')?imageData:(state.customFoods[index].imageData||'')};
    state.recipeNames=state.recipeNames.map(n=>n===oldName?name:n);
    syncLoggedFoodNutrition(oldName,state.customFoods[index]);
  }
  save(); closeFoodEditor(); toast('Ingredient updated'); render();
}

'''
if 'function openFoodEditor(' not in text:
    text=text[:render_idx]+editor_helpers+text[render_idx:]

# 5) Bind OCR/add/edit/delete actions.
# Replace custom food old handler
old_handler="$('#addCustomFood')?.addEventListener('click',()=>{const name=$('#newName').value.trim(),k=Number($('#newKcal').value),p=Number($('#newProtein').value),g=Number($('#newDefault').value);if(!name||k<=0||g<=0)return toast('Complete the ingredient fields');state.customFoods.push({name,kcal:k,protein:p||0,defaultGrams:g});save();toast('Ingredient saved');render();});"
new_handler="""$('#newImage')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(file)await scanFileIntoFields(file,'new');});
  $('#addCustomFood')?.addEventListener('click',()=>{const name=$('#newName').value.trim(),k=Number($('#newKcal').value),p=Number($('#newProtein').value)||0,c=Number($('#newCarbs').value)||0,fat=Number($('#newFat').value)||0,g=Number($('#newDefault').value);if(!name||k<=0||g<=0)return toast('Scan or complete name, calories and serving grams');const imageData=$('#scanPreview')?.dataset?.image||'';state.customFoods.push({name,kcal:k,protein:p,carbs:c,fat,defaultGrams:g,imageData});save();toast('Scanned ingredient saved');render();});
  $$('[data-edit-food]').forEach(b=>b.onclick=()=>{const [source,index]=b.dataset.editFood.split('|');openFoodEditor(source,Number(index));});
  $$('[data-delete-custom]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.deleteCustom);const name=state.customFoods[i]?.name;if(!name)return;if(confirm(`Delete ${name}?`)){state.customFoods.splice(i,1);state.recipeNames=state.recipeNames.filter(n=>n!==name);save();toast('Ingredient deleted');render();}});"""
if old_handler not in text:
    raise SystemExit('Could not find old addCustomFood handler; app.js may already be modified.')
text=text.replace(old_handler,new_handler)

app.write_text(text)

# 6) Add Tesseract CDN before app.js.
html=index.read_text()
script="<script src=\"https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js\"></script>"
if 'tesseract.min.js' not in html:
    html=html.replace('  <script src="app.js"></script>',f'  {script}\n  <script src="app.js"></script>')
index.write_text(html)

# 7) Append styles.
styles=css.read_text()
css_patch=r'''

/* OCR scanner + editable ingredient manager */
.scanDrop{display:flex;align-items:center;gap:12px;border:1px dashed #464650;background:#0d0d11;border-radius:18px;padding:16px;cursor:pointer}.scanDrop input{display:none}.scanDrop span{font-size:28px}.scanDrop b,.scanDrop small{display:block}.scanDrop small{color:var(--muted);margin-top:3px}.scanDrop.compact{margin-bottom:10px}.ocrStatus{margin:12px 0;padding:10px 12px;border-radius:12px;background:#1a1a20;color:#c7ff51;font-size:12px}.scanPreview img,.editPreview img{width:100%;max-height:260px;object-fit:contain;border-radius:16px;background:#08080a;margin-bottom:12px}.nutritionGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.nutritionGrid label{font-size:11px;color:var(--muted)}.nutritionGrid input{width:100%;margin-top:6px;background:#0e0e11;border:1px solid #2a2a30;color:#fff;border-radius:13px;padding:12px}.ocrRawWrap{margin-top:12px}.ocrRawWrap summary{cursor:pointer;color:var(--muted);font-size:12px}.ocrRawWrap pre{white-space:pre-wrap;max-height:220px;overflow:auto;background:#09090c;border-radius:12px;padding:12px;color:#b9b9c3;font-size:11px}.fullBtn{width:100%;margin-top:12px}.foodManager{display:grid;gap:8px}.foodManageRow{display:flex;justify-content:space-between;align-items:center;gap:12px;background:#17171c;border:1px solid #29292f;border-radius:16px;padding:12px}.foodManageInfo{display:flex;align-items:center;gap:11px;min-width:0}.foodManageInfo img,.foodAvatar{width:52px;height:52px;border-radius:13px;object-fit:cover;background:#23232a;border:1px solid #33333b;flex:none}.foodAvatar{display:grid;place-items:center;font-weight:900;color:#c7ff51}.foodManageInfo b,.foodManageInfo small{display:block}.foodManageInfo small{color:var(--muted);margin-top:3px;font-size:11px}.foodManageActions{display:flex;gap:7px;flex:none}.foodManageActions button,.secondaryBtn{border:1px solid #34343c;background:#232329;color:#fff;border-radius:11px;padding:9px 11px}.foodManageActions .dangerMini{border-color:#63333d;color:#ff9aaa;background:#251419}.foodChips button.hasThumb{display:flex;align-items:center;gap:10px}.foodChips button.hasThumb img{width:48px;height:48px;border-radius:12px;object-fit:cover;flex:none}.foodChips button.hasThumb div{min-width:0}.modalBackdrop{position:fixed;inset:0;z-index:100;background:#000b;backdrop-filter:blur(10px);display:grid;place-items:center;padding:16px}.editorModal{width:min(720px,100%);max-height:92vh;overflow:auto;background:#121216;border:1px solid #35353e;border-radius:24px;padding:20px;box-shadow:0 30px 100px #000}.editorHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px}.editorHead h2{margin:5px 0 0}.editorHead>button{border:0;background:#292930;color:#fff;width:36px;height:36px;border-radius:50%;font-size:20px}.editorActions{display:flex;justify-content:flex-end;gap:9px;margin-top:14px}.editPreview{margin-top:8px}
@media(max-width:760px){.nutritionGrid{grid-template-columns:1fr 1fr}.foodManageRow{align-items:flex-start;flex-direction:column}.foodManageActions{width:100%}.foodManageActions button{flex:1}.editorActions{flex-direction:column}.editorActions button{width:100%}}
'''
if 'OCR scanner + editable ingredient manager' not in styles:
    styles += css_patch
css.write_text(styles)

# 8) Bump service worker cache and delete old caches so patched files appear.
sw.write_text("""const CACHE = 'cutos-v2-ocr';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./manifest.webmanifest'];
self.addEventListener('install', event => { self.skipWaiting(); event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); });
self.addEventListener('activate', event => event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(r => r || fetch(event.request))));
""")

print('✅ CutOS v1 patched: OCR auto-fill + editable built-ins/custom foods + cache refresh')
