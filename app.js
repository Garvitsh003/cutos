const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const dateKey = d => d.toISOString().slice(0,10);
const today = () => dateKey(new Date());
const fmt = n => Math.round(Number(n)||0);
const esc = s => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

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


const foods = [
  ['Atta',364,12,60],['Paneer',265,18,120],['Low-fat paneer',170,22,150],['Potato',77,2,120],
  ['Cauliflower',25,1.9,250],['French beans',31,1.8,250],['Rajma dry',333,24,70],['Chana dry',364,19,70],
  ['Pumpkin',26,1,330],['Dal dry',350,24,60],['Rice raw',365,7,50],['Besan',387,22,80],
  ['Moong dal dry',347,24,80],['Suji',360,12,75],['Curd',63,3.5,200],['Greek yogurt',70,9,200],
  ['Toned milk',58,3.1,250],['Protein powder',390,75,32],['High-protein muesli',380,25,50],
  ['Cucumber',15,.7,225],['Onion + tomato',35,1.3,150],['Oil',884,0,5],['Tofu',144,17,150],
  ['Soy chunks dry',345,52,50],['Uttapam batter',160,5,170],['Sambar',60,3,200],['Roasted chana',370,20,30],
  ['Buttermilk',40,3,250],['Banana',89,1.1,100],['Apple',52,.3,180]
].map(([name,kcal,protein,defaultGrams])=>({name,kcal,protein,defaultGrams}));
const baseFoodDefaults=Object.fromEntries(foods.map(f=>[f.name,{...f,carbs:0,fat:0,imageData:''}]));

const dinnerPresets = [
  ['Paneer sabji + 2 roti + cucumber',[['Paneer',120],['Onion + tomato',150],['Oil',5],['Atta',60],['Cucumber',225]]],
  ['Aloo gobi + curd + 2 roti',[['Potato',120],['Cauliflower',250],['Oil',5],['Atta',60],['Curd',200],['Cucumber',225]]],
  ['Aloo beans + curd + 2 roti',[['Potato',100],['French beans',250],['Oil',5],['Atta',60],['Curd',200],['Cucumber',225]]],
  ['Rajma + 2 roti + cucumber',[['Rajma dry',70],['Onion + tomato',150],['Oil',5],['Atta',60],['Cucumber',225]]],
  ['Chole + 2 roti + cucumber',[['Chana dry',70],['Onion + tomato',150],['Oil',5],['Atta',60],['Cucumber',225]]],
  ['Pumpkin + curd + 2 roti',[['Pumpkin',330],['Oil',5],['Atta',60],['Curd',200],['Cucumber',225]]],
  ['Aloo bhujia + curd + 2 roti',[['Potato',150],['Onion + tomato',75],['Oil',5],['Atta',60],['Curd',200],['Cucumber',225]]],
  ['Dal chawal + cucumber',[['Dal dry',60],['Rice raw',50],['Oil',5],['Cucumber',225]]],
  ['Kadhi chawal + cucumber',[['Curd',250],['Besan',30],['Rice raw',50],['Oil',5],['Cucumber',225]]]
];

const defaults = {
  profile:{name:'Garvit',age:23,sex:'male',heightCm:164,weightKg:97,goalWeightKg:80,calorieTarget:1900,proteinTarget:120,waterTargetMl:3000},
  logs:{}, tab:'today', selectedDate:today(), recipeNames:['Paneer','Onion + tomato','Oil','Atta','Cucumber'], recipeTarget:700,
  customFoods:[], foodOverrides:{}
};
let state = load();
function applyFoodOverrides(){
  state.foodOverrides=state.foodOverrides||{};
  foods.forEach(f=>Object.assign(f,baseFoodDefaults[f.name],state.foodOverrides[f.name]||{}));
  state.customFoods=(state.customFoods||[]).map(f=>({...f,carbs:Number(f.carbs||0),fat:Number(f.fat||0),imageData:f.imageData||''}));
}
applyFoodOverrides();

function load(){
  try { const raw=localStorage.getItem('cutos-state'); return raw ? {...structuredClone(defaults),...JSON.parse(raw)} : structuredClone(defaults); }
  catch { return structuredClone(defaults); }
}
function save(){ localStorage.setItem('cutos-state',JSON.stringify(state)); }
function day(date=state.selectedDate){ if(!state.logs[date]) state.logs[date]={food:[],workouts:[],waterMl:0,steps:0}; return state.logs[date]; }
function foodDef(name){ return [...foods,...state.customFoods].find(x=>x.name===name); }
function calories(item){ return item.grams*item.kcal/100; }
function protein(item){ return item.grams*item.protein/100; }
function dayTotals(d=day()){ return {kcal:d.food.reduce((s,x)=>s+calories(x),0),protein:d.food.reduce((s,x)=>s+protein(x),0)}; }
function mondayOf(date){ const d=new Date(date+'T12:00:00'); const dow=(d.getDay()+6)%7; d.setDate(d.getDate()-dow); return d; }
function weekDates(){ const m=mondayOf(state.selectedDate); return Array.from({length:7},(_,i)=>{const x=new Date(m);x.setDate(m.getDate()+i);return dateKey(x)}); }
function logFood(name, grams, meal='Dinner'){
  const f=foodDef(name); if(!f) return;
  day().food.push({id:uid(),name:f.name,grams:Number(grams),kcal:f.kcal,protein:f.protein,meal}); save(); toast('Food logged'); render();
}
function logPreset(index){ dinnerPresets[index][1].forEach(([name,grams])=>{ const f=foodDef(name); day().food.push({id:uid(),name,grams,kcal:f.kcal,protein:f.protein,meal:'Dinner'});}); save(); toast('Dinner added'); render(); }
function toast(msg){ const el=document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),1800); }
function setTab(t){ state.tab=t; save(); render(); window.scrollTo({top:0,behavior:'smooth'}); }
function percent(v,t){ return Math.min(100,Math.max(0,Math.round((v/t)*100)||0)); }
function ring(v,t,label,unit){ const p=percent(v,t); return `<div class="ringCard"><div class="ring" style="--pct:${p*3.6}deg"><div><strong>${fmt(v)}</strong><span>${unit}</span></div></div><div><b>${label}</b><small>${p}% of ${t}${unit}</small></div></div>`; }
function nav(){ return `<nav class="bottomNav">${[['today','◉','Today'],['food','◒','Food'],['workout','▲','Train'],['week','▦','Week'],['progress','↗','Progress'],['settings','⚙','Setup']].map(([id,icon,label])=>`<button data-tab="${id}" class="${state.tab===id?'active':''}"><span>${icon}</span><small>${label}</small></button>`).join('')}</nav>`; }
function header(){ return `<header class="topbar"><div><div class="brand">Cut<span>OS</span></div><div class="tagline">Fat-loss control center</div></div><button class="dateChip" id="todayBtn">${state.selectedDate===today()?'Today':state.selectedDate}</button></header>`; }
function sectionHead(kicker,title,aside=''){return `<div class="pageHead"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1></div>${aside}</div>`;}

function todayView(){
  const d=day(), t=dayTotals(d), p=state.profile;
  const score=fmt((Math.min(t.kcal/p.calorieTarget,1)*.45+Math.min(t.protein/p.proteinTarget,1)*.35+Math.min(d.waterMl/p.waterTargetMl,1)*.2)*100);
  const meals=['Breakfast','Lunch','Snack','Dinner'].map(m=>{const arr=d.food.filter(x=>x.meal===m), k=arr.reduce((s,x)=>s+calories(x),0);return `<div class="mealRow"><div><b>${m}</b><small>${arr.length?esc(arr.map(x=>x.name).join(', ')):'Nothing logged'}</small></div><span>${fmt(k)} kcal</span></div>`}).join('');
  const workouts=d.workouts.length?d.workouts.map(w=>`<div class="mealRow"><div><b>${w.type}</b><small>${esc(w.detail)}</small></div><span>${w.minutes} min</span></div>`).join(''):'<div class="empty">No workout yet. Even a brisk walk counts.</div>';
  let coachTitle='You are inside the plan.', coach='Keep dinner measured, get your movement done, and finish the day consistently.';
  if(t.protein<p.proteinTarget*.65){coachTitle='Protein is the gap today.';coach='Use your protein shake, curd, paneer, tofu or soy to close the gap without adding another carb-heavy meal.'}
  else if(t.kcal>p.calorieTarget){coachTitle='One higher day does not break the week.';coach='Do not starve tomorrow. The Week tab spreads recovery gently across the remaining days.'}
  return `<section class="hero card"><div><p class="eyebrow">DAY CONTROL</p><h1>Stay in the game,<br>not in perfection.</h1><p>${Math.max(0,fmt(p.calorieTarget-t.kcal))} kcal left · ${Math.max(0,fmt(p.proteinTarget-t.protein))}g protein to go</p></div><div class="score"><span>${score}</span><small>day score</small></div></section>
  <section class="rings">${ring(t.kcal,p.calorieTarget,'Calories',' kcal')}${ring(t.protein,p.proteinTarget,'Protein','g')}${ring(d.waterMl,p.waterTargetMl,'Water','ml')}</section>
  <section class="grid2"><div class="card"><div class="sectionTitle"><h2>Meals</h2><button data-tab="food">Add</button></div>${meals}</div><div class="card"><div class="sectionTitle"><h2>Movement</h2><button data-tab="workout">Log</button></div>${workouts}<div class="quickWater"><button data-water="250">+ 250 ml water</button><button data-water="500">+ 500 ml</button></div></div></section>
  <section class="coach card"><div class="coachOrb">✦</div><div><p class="eyebrow">COACH</p><h3>${coachTitle}</h3><p>${coach}</p></div></section>`;
}

function foodView(){
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

function recipeSuggestion(){
  const defs=state.recipeNames.map(foodDef).filter(Boolean); if(!defs.length)return {items:[],kcal:0,protein:0};
  const base=defs.reduce((s,d)=>s+d.defaultGrams*d.kcal/100,0); const scale=Math.max(.45,Math.min(1.8,state.recipeTarget/Math.max(1,base)));
  const items=defs.map(d=>({...d,grams:Math.max(5,Math.round(d.defaultGrams*scale/5)*5)}));
  return {items,kcal:items.reduce((s,x)=>s+x.grams*x.kcal/100,0),protein:items.reduce((s,x)=>s+x.grams*x.protein/100,0)};
}

function workoutView(){
  return `${sectionHead('TRAINING','Build the habit before the gym.')}
  <section class="workoutGrid"><button class="workCard" data-work="Walk|40|Brisk outdoor/indoor walk"><span>🚶</span><b>Brisk walk</b><small>40 min · low impact</small></button><button class="workCard" data-work="Stairs|10|Controlled 6-floor repeats; walk down slowly"><span>↗</span><b>Stairs</b><small>10 min starter block</small></button><button class="workCard" data-work="Strength|35|Squat · RDL · row · press · incline push-up · plank"><span>◼</span><b>Full-body DB</b><small>35 min · 3–4 kg</small></button><button class="workCard" data-work="Walk|20|Easy recovery walk"><span>☁</span><b>Recovery</b><small>20 min easy</small></button></section>
  <section class="card"><div class="sectionTitle"><div><h2>Custom workout</h2><p>Log anything else without pretending exercise calories are exact.</p></div></div><div class="customGrid"><select id="customType"><option>Walk</option><option>Stairs</option><option>Strength</option><option>Custom</option></select><input id="customMinutes" type="number" placeholder="minutes"><input id="customDetail" placeholder="what you did"><button class="primary" id="addCustomWorkout">Log workout</button></div></section>
  <section class="card"><div class="sectionTitle"><div><h2>Your 18-day ramp</h2><p>Condition first. Gym when you reach home.</p></div></div><div class="timeline"><div><span>01</span><b>Days 1–5</b><p>30–45 min brisk walk + 5–10 min stairs. Strength 3×/week.</p></div><div><span>02</span><b>Days 6–10</b><p>35–50 min walk + 10–15 min stairs. Add reps or backpack load.</p></div><div><span>03</span><b>Days 11–18</b><p>40–60 min walk + 15–20 min stairs if joints feel good. Keep 3 strength sessions.</p></div></div></section>
  <section class="card"><div class="sectionTitle"><h2>Full-body template</h2></div>${['Chair squat — 3 × 12–15','Dumbbell Romanian deadlift — 3 × 12–15','One-arm row — 3 × 12–15 / side','Shoulder press — 3 × 10–15','Incline / wall push-up — 3 good sets','Biceps curl — 2 × 15–20','Overhead triceps extension — 2 × 15–20','Calf raise — 3 × 20','Plank — 3 × 20–40 sec'].map(x=>`<div class="exercise">${x}</div>`).join('')}</section>`;
}

function weekView(){
  const p=state.profile, dates=weekDates();
  const consumed=dates.reduce((sum,d)=>sum+(state.logs[d]?.food||[]).reduce((s,x)=>s+calories(x),0),0);
  const elapsed=dates.filter(d=>d<=today()).length, remain=Math.max(1,7-elapsed), planSoFar=p.calorieTarget*elapsed, diff=consumed-planSoFar;
  const target=p.calorieTarget*7, raw=(target-consumed)/remain, safe=Math.max(p.calorieTarget*.85,Math.min(p.calorieTarget,raw));
  const dayButtons=dates.map(d=>{const k=(state.logs[d]?.food||[]).reduce((s,x)=>s+calories(x),0);const wd=new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'});return `<button data-date="${d}" class="${d===state.selectedDate?'active':''}"><small>${wd}</small><b>${fmt(k)}</b><span>kcal</span></button>`}).join('');
  return `${sectionHead('WEEK CONTROL','One day can’t ruin a week.')}
  <section class="card weeklyHero"><div><small>WEEKLY BUDGET</small><h2>${fmt(consumed)} / ${target} kcal</h2><div class="bar"><i style="width:${Math.min(100,consumed/target*100)}%"></i></div></div><div class="weekStat"><span>${diff>0?'+':''}${fmt(diff)}</span><small>vs plan so far</small></div></section>
  <section class="card"><div class="sectionTitle"><div><h2>Cheat / social meal recovery</h2><p>Enter the extra calories above your normal plan. CutOS caps compensation at 15% below target.</p></div></div><div class="cheatBox"><input id="cheatInput" type="number" min="0" placeholder="e.g. 900 extra kcal"><div><b id="cheatTarget">${fmt(safe)} kcal/day</b><small>suggested remaining-day target</small></div></div><p class="note">Do not skip entire meals or punish yourself with cardio. Return to protein, vegetables, measured carbs, water and normal activity.</p></section>
  <section class="weekDays">${dayButtons}</section>`;
}

function progressView(){
  const p=state.profile, weights=Object.keys(state.logs).sort().map(d=>state.logs[d].weightKg).filter(x=>typeof x==='number'), bmi=p.weightKg/((p.heightCm/100)**2);
  const spark=weights.length?sparkline(weights):'<div class="emptyChart">Log morning weight to see your trend.</div>';
  return `${sectionHead('PROGRESS','Trend, don’t obsess.')}
  <section class="grid2"><div class="card"><small>CURRENT WEIGHT</small><h2 class="bigNum">${p.weightKg.toFixed(1)}<span>kg</span></h2><div class="weightInput"><input id="weightInput" type="number" step="0.1" placeholder="Morning weight"></div></div><div class="card"><small>GOAL</small><h2 class="bigNum">${p.goalWeightKg}<span>kg</span></h2><p>${Math.max(0,p.weightKg-p.goalWeightKg).toFixed(1)} kg remaining. BMI is ${bmi.toFixed(1)}, but weekly weight trend, waist and fitness are more useful day-to-day indicators.</p></div></section>
  <section class="card"><div class="sectionTitle"><h2>Weight trend</h2></div>${spark}</section>
  <section class="card"><div class="sectionTitle"><h2>Progress rules</h2></div><div class="rules"><div><b>1</b><span>Weigh 3–4 mornings/week under similar conditions.</span></div><div><b>2</b><span>Judge the 7-day average, not a single spike.</span></div><div><b>3</b><span>If the average does not move for 2–3 weeks, adjust food/activity slightly.</span></div></div></section>`;
}
function sparkline(values){ const min=Math.min(...values),max=Math.max(...values),span=Math.max(1,max-min);const pts=values.map((v,i)=>`${(i/Math.max(1,values.length-1))*100},${44-((v-min)/span)*38}`).join(' ');return `<svg class="spark" viewBox="0 0 100 50" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.5" vector-effect="non-scaling-stroke"></polyline></svg>`; }

function settingsView(){ const p=state.profile; const fields=[['Name','name','text'],['Age','age','number'],['Height (cm)','heightCm','number'],['Current weight (kg)','weightKg','number'],['Goal weight (kg)','goalWeightKg','number'],['Daily calories','calorieTarget','number'],['Daily protein (g)','proteinTarget','number'],['Water target (ml)','waterTargetMl','number']]; return `${sectionHead('SETUP','Your targets, editable.')}
<section class="card settingsForm">${fields.map(([label,key,type])=>`<label><span>${label}</span><input data-profile="${key}" type="${type}" value="${esc(p[key])}"></label>`).join('')}</section>
<section class="card"><h2>Important</h2><p>This is a planning and logging tool, not a medical diagnosis tool. Nutrition values are estimates and brands vary. If you have medical conditions, take medication, or develop persistent pain, dizziness, chest symptoms or unusual breathlessness, get professional medical advice before pushing exercise or dieting harder.</p><button class="danger" id="resetBtn">Reset all local data</button></section>`; }


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

function render(){
  const views={today:todayView,food:foodView,workout:workoutView,week:weekView,progress:progressView,settings:settingsView};
  $('#app').innerHTML=`<div class="appShell">${header()}<main>${views[state.tab]()}</main>${nav()}</div>`;
  bind();
}

function bind(){
  $$('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  $('#todayBtn')?.addEventListener('click',()=>{state.selectedDate=today();save();render();});
  $('#dateInput')?.addEventListener('change',e=>{state.selectedDate=e.target.value;save();render();});
  $$('[data-water]').forEach(b=>b.onclick=()=>{day().waterMl+=Number(b.dataset.water);save();render();});
  $$('[data-quick]').forEach(b=>b.onclick=()=>{
    const name=b.dataset.quick, f=foodDef(name); const meal=prompt(`Add ${name} to which meal?\nBreakfast, Lunch, Snack or Dinner`, name.includes('muesli')?'Breakfast':name.includes('Protein')?'Snack':'Lunch')||'Lunch';
    const grams=Number(prompt(`Raw/serving grams for ${name}`,f.defaultGrams)); if(grams>0) logFood(name,grams,['Breakfast','Lunch','Snack','Dinner'].includes(meal)?meal:'Lunch');
  });
  $$('[data-preset]').forEach(b=>b.onclick=()=>logPreset(Number(b.dataset.preset)));
  $$('[data-remove-food]').forEach(b=>b.onclick=()=>{day().food=day().food.filter(x=>x.id!==b.dataset.removeFood);save();render();});
  $$('[data-recipe-name]').forEach(c=>c.onchange=()=>{const n=c.dataset.recipeName;if(c.checked&&!state.recipeNames.includes(n))state.recipeNames.push(n);if(!c.checked)state.recipeNames=state.recipeNames.filter(x=>x!==n);save();render();});
  $('#recipeRange')?.addEventListener('input',e=>{state.recipeTarget=Number(e.target.value);save();render();});
  $('#addSuggested')?.addEventListener('click',()=>{const s=recipeSuggestion();s.items.forEach(x=>{day().food.push({id:uid(),name:x.name,grams:x.grams,kcal:x.kcal,protein:x.protein,meal:'Dinner'});});save();toast('Suggested recipe added');render();});
  $('#newImage')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(file)await scanFileIntoFields(file,'new');});
  $('#addCustomFood')?.addEventListener('click',()=>{const name=$('#newName').value.trim(),k=Number($('#newKcal').value),p=Number($('#newProtein').value)||0,c=Number($('#newCarbs').value)||0,fat=Number($('#newFat').value)||0,g=Number($('#newDefault').value);if(!name||k<=0||g<=0)return toast('Scan or complete name, calories and serving grams');const imageData=$('#scanPreview')?.dataset?.image||'';state.customFoods.push({name,kcal:k,protein:p,carbs:c,fat,defaultGrams:g,imageData});save();toast('Scanned ingredient saved');render();});
  $$('[data-edit-food]').forEach(b=>b.onclick=()=>{const [source,index]=b.dataset.editFood.split('|');openFoodEditor(source,Number(index));});
  $$('[data-delete-custom]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.deleteCustom);const name=state.customFoods[i]?.name;if(!name)return;if(confirm(`Delete ${name}?`)){state.customFoods.splice(i,1);state.recipeNames=state.recipeNames.filter(n=>n!==name);save();toast('Ingredient deleted');render();}});
  $$('[data-work]').forEach(b=>b.onclick=()=>{const [type,minutes,detail]=b.dataset.work.split('|');day().workouts.push({id:uid(),type,minutes:Number(minutes),detail,date:state.selectedDate});save();toast('Workout logged');render();});
  $('#addCustomWorkout')?.addEventListener('click',()=>{const type=$('#customType').value,minutes=Number($('#customMinutes').value),detail=$('#customDetail').value.trim()||'Custom session';if(minutes<=0)return toast('Add workout minutes');day().workouts.push({id:uid(),type,minutes,detail,date:state.selectedDate});save();toast('Workout logged');render();});
  $$('[data-date]').forEach(b=>b.onclick=()=>{state.selectedDate=b.dataset.date;save();render();});
  $('#cheatInput')?.addEventListener('input',e=>{const extra=Number(e.target.value)||0,p=state.profile,dates=weekDates(),elapsed=dates.filter(d=>d<=today()).length,remain=Math.max(1,7-elapsed);const suggested=Math.max(p.calorieTarget*.85,Math.min(p.calorieTarget,p.calorieTarget-extra/remain));$('#cheatTarget').textContent=`${fmt(suggested)} kcal/day`;});
  $('#weightInput')?.addEventListener('change',e=>{const v=Number(e.target.value);if(v>0){day().weightKg=v;state.profile.weightKg=v;save();toast('Weight logged');render();}});
  $$('[data-profile]').forEach(i=>i.onchange=()=>{const k=i.dataset.profile;state.profile[k]=i.type==='number'?Number(i.value):i.value;save();render();});
  $('#resetBtn')?.addEventListener('click',()=>{if(confirm('Clear all CutOS data on this device?')){localStorage.removeItem('cutos-state');state=structuredClone(defaults);render();}});
}

render();
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
