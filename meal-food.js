/* CutOS meal-first Food workspace v3. Keeps cutos-state and existing logs. */
(() => {
'use strict';
const keys=['kcal','protein','carbs','fat'];
// One-time, reversible catalogue migration. Existing food logs/drafts remain snapshots.
const seedFoods=[
  {
    "seedId": "cutos-label-1",
    "catalogOrder": 1,
    "name": "iD protein uttapam batter",
    "target": "Uttapam batter",
    "kcal": 177.36,
    "protein": 15.24,
    "carbs": 28.38,
    "fat": 0.32,
    "defaultGrams": 50,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Photo.pdf · page 1",
    "sourceNote": "Product matched to your list. Label serving: 50 g (one idly). Weigh batter before cooking.",
    "sourceUrl": "",
    "sourceStatus": "PDF label",
    "aliases": [
      "id protein uttampam batter"
    ],
    "labelServing": 50,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-2",
    "catalogOrder": 2,
    "name": "Amul curd",
    "target": "Curd",
    "kcal": 53,
    "protein": 3,
    "carbs": 3.5,
    "fat": 3,
    "defaultGrams": 100,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Photo.pdf · page 2",
    "sourceNote": "Plain curd; use the measured amount.",
    "sourceUrl": "",
    "sourceStatus": "PDF label",
    "aliases": [],
    "labelServing": 100,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-3",
    "catalogOrder": 3,
    "name": "Protein bread",
    "target": null,
    "kcal": 238,
    "protein": 13,
    "carbs": 46.5,
    "fat": 1.7,
    "defaultGrams": 54,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Photo.pdf · page 3",
    "sourceNote": "Bajo Foods label. 2 slices = 54 g; weigh your slices if their size differs.",
    "sourceUrl": "",
    "sourceStatus": "PDF label",
    "aliases": [],
    "labelServing": 54,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-4",
    "catalogOrder": 4,
    "name": "Amul Taaza toned milk",
    "target": "Toned milk",
    "kcal": 58,
    "protein": 3,
    "carbs": 4.8,
    "fat": 3,
    "defaultGrams": 200,
    "unit": "ml",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Photo.pdf · page 4",
    "sourceNote": "Converted from the 200 ml pack: 116 kcal, 6 g protein, 9.6 g carbs, 6 g fat.",
    "sourceUrl": "",
    "sourceStatus": "PDF label",
    "aliases": [],
    "labelServing": 200,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-5",
    "catalogOrder": 5,
    "name": "Almond milk",
    "target": null,
    "kcal": 32,
    "protein": 1.06,
    "carbs": 1.84,
    "fat": 2.29,
    "defaultGrams": 200,
    "unit": "ml",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Photo.pdf · page 5",
    "sourceNote": "Brand/variant not visible; matched using your page order.",
    "sourceUrl": "",
    "sourceStatus": "PDF label",
    "aliases": [],
    "labelServing": 200,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-6",
    "catalogOrder": 6,
    "name": "Kissan ketchup — no onion no garlic",
    "target": null,
    "kcal": 130,
    "protein": 0.6,
    "carbs": 31.5,
    "fat": 0,
    "defaultGrams": 15,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Photo.pdf · page 6",
    "sourceNote": "No-onion/no-garlic variant matched using your page order.",
    "sourceUrl": "",
    "sourceStatus": "PDF label",
    "aliases": [
      "ketchup nong",
      "ketchup no onion garlic"
    ],
    "labelServing": 15,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-7",
    "catalogOrder": 7,
    "name": "Kissan tomato ketchup",
    "target": null,
    "kcal": 133,
    "protein": 1.1,
    "carbs": 31,
    "fat": 0.4,
    "defaultGrams": 15,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Photo.pdf · page 7",
    "sourceNote": "Regular ketchup. Log separately from the no-onion/no-garlic variant.",
    "sourceUrl": "",
    "sourceStatus": "PDF label",
    "aliases": [
      "ketchup"
    ],
    "labelServing": 15,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-8",
    "catalogOrder": 8,
    "name": "Pintola high protein muesli — dark chocolate",
    "target": "High-protein muesli",
    "kcal": 390,
    "protein": 25,
    "carbs": 55,
    "fat": 8,
    "defaultGrams": 50,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Photo.pdf · page 8",
    "sourceNote": "Dry muesli values, excluding added milk. Log milk separately.",
    "sourceUrl": "",
    "sourceStatus": "PDF label",
    "aliases": [
      "muesli"
    ],
    "labelServing": 50,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-9",
    "catalogOrder": 9,
    "name": "Protein powder — PDF label",
    "target": "Protein powder",
    "kcal": 387.8,
    "protein": 70,
    "carbs": 15.7,
    "fat": 5,
    "defaultGrams": 36,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Photo.pdf · page 9",
    "sourceNote": "36 g scoop. Per-100 g calculation gives 25.2 g protein; the label rounds the scoop to 25 g. Variant not fully visible.",
    "sourceUrl": "",
    "sourceStatus": "PDF label",
    "aliases": [],
    "labelServing": 36,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-10",
    "catalogOrder": 10,
    "name": "ACT II instant popcorn",
    "target": null,
    "kcal": 497.5,
    "protein": 7.4,
    "carbs": 61.4,
    "fat": 26.7,
    "defaultGrams": 16,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Photo.pdf · page 10",
    "sourceNote": "Ready-to-cook mix, before popping. Photo is slightly blurred; confirm against your packet. Do not use popped volume as this weight.",
    "sourceUrl": "",
    "sourceStatus": "PDF · check photo",
    "aliases": [
      "popcorn"
    ],
    "labelServing": 16,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-11",
    "catalogOrder": 11,
    "name": "Rajdhani chana dal",
    "target": null,
    "kcal": 370,
    "protein": 20,
    "carbs": 65,
    "fat": 6,
    "defaultGrams": 60,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Photo.pdf · page 11",
    "sourceNote": "Dry weight. Packet states protein minimum 20 g, carbs maximum 65 g and fat maximum 6 g; approximate tracking values.",
    "sourceUrl": "",
    "sourceStatus": "PDF label",
    "aliases": [
      "chana dal"
    ],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-12",
    "catalogOrder": 12,
    "name": "Rajdhani barnyard millet / sama rice",
    "target": null,
    "kcal": 372,
    "protein": 10.5,
    "carbs": 68.5,
    "fat": 3.5,
    "defaultGrams": 30,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Photo.pdf · page 12",
    "sourceNote": "Dry weight. This is barnyard millet, not a value for every millet variety.",
    "sourceUrl": "",
    "sourceStatus": "PDF label",
    "aliases": [
      "millets",
      "sama"
    ],
    "labelServing": 30,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-13",
    "catalogOrder": 13,
    "name": "Fortune maida",
    "target": null,
    "kcal": 365.5,
    "protein": 11.8,
    "carbs": 72.6,
    "fat": 2.1,
    "defaultGrams": 30,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Photo.pdf · page 13",
    "sourceNote": "Dry flour weight.",
    "sourceUrl": "",
    "sourceStatus": "PDF label",
    "aliases": [
      "maida"
    ],
    "labelServing": 30,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-14",
    "catalogOrder": 14,
    "name": "Aashirvaad Select Sharbati atta",
    "target": "Atta",
    "kcal": 338,
    "protein": 10,
    "carbs": 76.2,
    "fat": 1.5,
    "defaultGrams": 60,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Online nutrition listing",
    "sourceNote": "Assumed Select 100% MP Sharbati variant. Dry flour; retailer values differ from older listings. Check your packet if the variant or label differs.",
    "sourceUrl": "https://blinkit.com/prn/aashirvaad-select-superior-sharbati-whole-wheat-atta/prid/7",
    "sourceStatus": "Online estimate",
    "aliases": [
      "aashirvad sharbati aata"
    ],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-15",
    "catalogOrder": 15,
    "name": "India Gate Super Basmati rice",
    "target": "Rice raw",
    "kcal": 344,
    "protein": 6.7,
    "carbs": 77,
    "fat": 0.5,
    "defaultGrams": 50,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Online nutrition listing",
    "sourceNote": "Dry rice. Community nutrition listing; provisional. Check your packet if the variant or label differs.",
    "sourceUrl": "https://www.fatsecret.co.in/calories-nutrition/india-gate/basmati-rice-super/100g",
    "sourceStatus": "Online estimate",
    "aliases": [],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-16",
    "catalogOrder": 16,
    "name": "Tata Sampann fine besan",
    "target": "Besan",
    "kcal": 384,
    "protein": 21.5,
    "carbs": 62.3,
    "fat": 5.4,
    "defaultGrams": 80,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Online nutrition listing",
    "sourceNote": "100% chana dal fine besan, dry flour. Check your packet if the variant or label differs.",
    "sourceUrl": "https://sastasundar.com/order-otc/tata-sampann-chana-dal-fine-besan-500-g-rkjd3c",
    "sourceStatus": "Online estimate",
    "aliases": [],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-17",
    "catalogOrder": 17,
    "name": "Tata Sampann unpolished kabuli chana — big size",
    "target": "Chana dry",
    "kcal": 378,
    "protein": 20,
    "carbs": 60,
    "fat": 6,
    "defaultGrams": 70,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Online nutrition listing",
    "sourceNote": "Dry weight. Retailer values provisionally treated as per 100 g; the listing does not explicitly state its basis. Check your packet if the variant or label differs.",
    "sourceUrl": "https://instamart.in/p/tata-sampann-unpolished-kabuli-chana-big-size-8T3EF7AFYF",
    "sourceStatus": "Online estimate",
    "aliases": [],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-18",
    "catalogOrder": 18,
    "name": "Rajdhani suji",
    "target": "Suji",
    "kcal": 352,
    "protein": 9,
    "carbs": 78,
    "fat": 1,
    "defaultGrams": 75,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Online nutrition listing",
    "sourceNote": "Manufacturer approximate values per 100 g. Dry weight. Check your packet if the variant or label differs.",
    "sourceUrl": "https://rajdhanigroup.com/service/index/12",
    "sourceStatus": "Manufacturer values",
    "aliases": [],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-19",
    "catalogOrder": 19,
    "name": "Tata Sampann unpolished Chitra rajma",
    "target": "Rajma dry",
    "kcal": null,
    "protein": null,
    "carbs": null,
    "fat": null,
    "defaultGrams": 70,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [
      "kcal",
      "protein",
      "carbs",
      "fat"
    ],
    "source": "Online nutrition listing",
    "sourceNote": "Exact product found, but its nutrition panel could not be verified. Enter packet values to include it in meal totals. Dry weight. Check your packet if the variant or label differs.",
    "sourceUrl": "https://www.tatanutrikorner.com/products/tata-sampann-rajma-chitra",
    "sourceStatus": "Needs nutrition label",
    "aliases": [],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-20",
    "catalogOrder": 20,
    "name": "Tata Sampann unpolished kala chana",
    "target": null,
    "kcal": 378,
    "protein": 20,
    "carbs": 63,
    "fat": 6,
    "defaultGrams": 70,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Online nutrition listing",
    "sourceNote": "Dry weight. Community nutrition listing; provisional. Check your packet if the variant or label differs.",
    "sourceUrl": "https://www.fatsecret.co.in/calories-nutrition/tata-sampann/kala-chana/100g",
    "sourceStatus": "Online estimate",
    "aliases": [],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-21",
    "catalogOrder": 21,
    "name": "Aalu / potato (raw)",
    "target": "Potato",
    "kcal": 77,
    "protein": 2.05,
    "carbs": 17.49,
    "fat": 0.09,
    "defaultGrams": 100,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Online nutrition listing",
    "sourceNote": "Generic raw edible portion, without oil or sauces. USDA-based estimate; varieties differ. Check your packet if the variant or label differs.",
    "sourceUrl": "https://fooddata.the50.store/ingredients/11352-potatoes-flesh-and-skin-raw",
    "sourceStatus": "Raw vegetable estimate",
    "aliases": [
      "aloo",
      "aalu"
    ],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-22",
    "catalogOrder": 22,
    "name": "Gobi / cauliflower (raw)",
    "target": "Cauliflower",
    "kcal": 25,
    "protein": 1.92,
    "carbs": 4.97,
    "fat": 0.28,
    "defaultGrams": 100,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Online nutrition listing",
    "sourceNote": "Generic raw edible portion, without oil or sauces. USDA-based estimate; varieties differ. Check your packet if the variant or label differs.",
    "sourceUrl": "https://food-info.org/foods/cauliflower-raw-2709777",
    "sourceStatus": "Raw vegetable estimate",
    "aliases": [
      "gobi"
    ],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-23",
    "catalogOrder": 23,
    "name": "French beans (raw)",
    "target": "French beans",
    "kcal": 31,
    "protein": 1.83,
    "carbs": 6.97,
    "fat": 0.22,
    "defaultGrams": 100,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Online nutrition listing",
    "sourceNote": "Generic raw edible portion, without oil or sauces. USDA-based estimate; varieties differ. Check your packet if the variant or label differs.",
    "sourceUrl": "https://whatyoueat.io/foods/169961-green-snap-beans",
    "sourceStatus": "Raw vegetable estimate",
    "aliases": [
      "green beans"
    ],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-24",
    "catalogOrder": 24,
    "name": "Bhindi / okra (raw)",
    "target": null,
    "kcal": 33,
    "protein": 1.93,
    "carbs": 7.45,
    "fat": 0.19,
    "defaultGrams": 100,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Online nutrition listing",
    "sourceNote": "Generic raw edible portion, without oil or sauces. USDA-based estimate; varieties differ. Check your packet if the variant or label differs.",
    "sourceUrl": "https://www.nutrifacts.info/foods/169260/okra-raw",
    "sourceStatus": "Raw vegetable estimate",
    "aliases": [
      "bhindi",
      "okra"
    ],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-25",
    "catalogOrder": 25,
    "name": "Pumpkin (raw)",
    "target": "Pumpkin",
    "kcal": 26,
    "protein": 1,
    "carbs": 6.5,
    "fat": 0.1,
    "defaultGrams": 100,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Online nutrition listing",
    "sourceNote": "Generic raw edible portion, without oil or sauces. USDA-based estimate; varieties differ. Check your packet if the variant or label differs.",
    "sourceUrl": "https://www.nutrifacts.info/foods/168448/pumpkin-raw",
    "sourceStatus": "Raw vegetable estimate",
    "aliases": [
      "kaddu"
    ],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-26",
    "catalogOrder": 26,
    "name": "Tomato (raw)",
    "target": null,
    "kcal": 18,
    "protein": 0.88,
    "carbs": 3.89,
    "fat": 0.2,
    "defaultGrams": 100,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Online nutrition listing",
    "sourceNote": "Generic raw edible portion, without oil or sauces. USDA-based estimate; varieties differ. Check your packet if the variant or label differs.",
    "sourceUrl": "https://biomanutrient.app/learn/food/tomatoes-red-ripe-raw/",
    "sourceStatus": "Raw vegetable estimate",
    "aliases": [
      "tomato",
      "tamatar"
    ],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  },
  {
    "seedId": "cutos-label-27",
    "catalogOrder": 27,
    "name": "Noice fresh malai paneer",
    "target": "Paneer",
    "kcal": 313,
    "protein": 17,
    "carbs": 4,
    "fat": 25.8,
    "defaultGrams": 120,
    "unit": "g",
    "nutritionReviewed": true,
    "unknownNutrients": [],
    "source": "Online nutrition listing",
    "sourceNote": "Assumed Fresh Malai Paneer, not the high-protein variant. Community listing; provisional. Check your packet if the variant or label differs.",
    "sourceUrl": "https://www.mynetdiary.com/food/calories-in-fresh-malai-paneer-by-noice-serving-71201377-0.html",
    "sourceStatus": "Online estimate",
    "aliases": [
      "noice company fresh paneer"
    ],
    "labelServing": null,
    "sourceChecked": "2026-10-03"
  }
];
const seedVersion='labels-20261003-v1';
if(state.foodCatalogueVersion!==seedVersion){
 const previous=structuredClone(state);
 try{
  const backupKey='cutos-before-'+seedVersion;
  if(!localStorage.getItem(backupKey))localStorage.setItem(backupKey,JSON.stringify(state));
  state.foodOverrides=state.foodOverrides||{};
  state.customFoods=state.customFoods||[];
  for(const entry of seedFoods){
   const {target,name,...values}=entry;
   const canonical=target||name;
   const update={...values,name:canonical,displayName:name};
   if(target&&foods.some(f=>f.name===target)){
    state.foodOverrides[target]={...state.foodOverrides[target],...update};
   }else{
    const names=[name,...(values.aliases||[])].map(n=>n.toLowerCase());
    const index=state.customFoods.findIndex(f=>f.seedId===values.seedId||names.includes(f.name.toLowerCase()));
    if(index>=0)state.customFoods[index]={...state.customFoods[index],...update};
    else state.customFoods.push(update);
   }
  }
  state.foodCatalogueVersion=seedVersion;save();
 }catch(error){state=previous;toast('Ingredient update could not be saved. Export your data in Setup, free browser storage, then reload.');}
}
const unit=f=>f?.unit==='ml'?'ml':'g';
const title=f=>f.displayName||f.name;
const matches=(f,q)=>[f.name,f.displayName,...(f.aliases||[])].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase());
function sourceHTML(f){
 if(!f.source)return '';
 const link=/^https:\/\//.test(f.sourceUrl||'')?` <a href="${esc(f.sourceUrl)}" target="_blank" rel="noopener noreferrer">View source</a>`:'';
 return `<details class="mf-source"><summary>${esc(f.sourceStatus||'Nutrition source')}${f.userEdited?' · edited by you':''}</summary><p>${esc(f.source)}${link}</p><p>${esc(f.sourceNote||'')}</p>${f.labelServing?`<p>Packet serving: ${f.labelServing} ${unit(f)}.</p>`:''}<p>Nutrition basis: 100 ${unit(f)}. Starting portions are editable and are not a recommended meal size.</p></details>`;
}

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
function catalogue(){return [...foods.map((f,i)=>({...nutrition(f),ref:'b:'+i})),...state.customFoods.map((f,i)=>({...nutrition(f),ref:'c:'+i}))].sort((a,b)=>(a.catalogOrder||999)-(b.catalogOrder||999));}
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
 <section class="mf-meals"><div class="sectionTitle"><h2>Saved meals <small>${list.length}</small></h2></div>${list.length?list.map(g=>`<article class="card mf-saved"><div class="sectionTitle"><div><p class="eyebrow">${e(g.meal)}</p><h3>${e(g.name)}</h3></div><button data-mf-edit="${e(g.id)}">Edit meal</button></div><p>${g.items.length} ingredients · ${e(g.items.map(title).join(', '))}</p>${macroHTML(g.items.map(nutrition))}${warning(g.items.map(nutrition))}<button class="mf-delete" data-mf-delete="${e(g.id)}">Delete meal</button></article>`).join(''):'<div class="card empty">Your meals will appear here. Start with a meal name, then add what went into it.</div>'}</section>
 <details class="card mf-help"><summary>Dinner presets & portion assistant</summary><p>Load a preset into the meal editor, adjust the weights, then save when ready.</p><div class="mf-presets">${dinnerPresets.map((p,i)=>`<button data-mf-preset="${i}">${e(p[0])}</button>`).join('')}</div></details>
 ${libraryOpen?libraryHTML():''}`;
}
function editorHTML(d){return `<section class="card mf-editor"><div class="sectionTitle"><div><p class="eyebrow">${d.editing?'EDIT MEAL':'NEW MEAL'}</p><h2>Build your plate</h2></div><button id="mf-discard">${d.editing?'Cancel':'Discard'}</button></div>
 <div class="mf-meal-meta"><label>Meal name<input id="mf-name" value="${e(d.name)}" placeholder="e.g. Paneer bhurji with roti" maxlength="100"></label><label>Meal time<select id="mf-type">${['Breakfast','Lunch','Snack','Dinner'].map(m=>`<option ${d.meal===m?'selected':''}>${m}</option>`).join('')}</select></label></div>
 <div class="mf-ingredients">${d.items.map((x,i)=>`<article class="mf-row"><div class="mf-row-head"><div><b>${e(title(x))}</b><small id="mf-row-info-${i}">${rowInfo(x)}</small></div><button data-mf-remove="${i}" aria-label="Remove ${e(title(x))}">×</button></div><div class="mf-row-controls"><label>Amount (${unit(x)})<input data-mf-weight="${i}" inputmode="decimal" type="number" min="0.1" step="any" value="${e(x.grams)}"></label><button data-mf-nutrition="${i}">Edit nutrition</button></div></article>`).join('')||'<p class="empty">Add your ingredients below. Weigh them in the same form as the nutrition entry: dry, raw, or cooked.</p>'}</div>
 <button class="mf-add" id="mf-add">+ Add ingredient</button>
 <details class="mf-portion"><summary>Suggest weights for this meal</summary><p>Scales the current ingredient proportions to your calorie target. Review oil and serving sizes before using it.</p><label>Meal target (kcal)<input id="mf-target" type="number" min="100" max="2000" value="650"></label><button id="mf-scale">Suggest weights</button></details>
 <div class="mf-live" id="mf-live" aria-live="polite">${macroHTML(d.items)}${warning(d.items)}</div><p class="mf-hint">Draft saved on this browser. Only saved meals count toward your day.</p><button class="primary mf-wide" id="mf-save">${d.editing?'Save changes':'Save meal'}</button></section>`;}
function rowInfo(x){const t=totals([x]);return `${valid(x.kcal)?show(t.kcal.value)+' kcal':'Calories missing'} · ${valid(x.protein)?show(t.protein.value)+' g protein':'Protein missing'}${keys.some(k=>rawN(x,k)===null)?' · incomplete nutrition':''}`;}
function libraryHTML(){return `<section class="card" id="mf-library-panel"><div class="sectionTitle"><h2>Ingredient library</h2><button id="mf-library-close">Close</button></div><p>Edit your staples or add a nutrition label. Changes apply to future additions; saved meals keep their own nutrition values.</p><input id="mf-library-search" type="search" placeholder="Find an ingredient" aria-label="Search ingredient library"><button id="mf-library-new" class="mf-add">+ Create / scan ingredient</button><div id="mf-library-list">${libraryRows('')}</div></section>`;}
function libraryRows(query){return catalogue().filter(f=>matches(f,query)).map(f=>`<div class="mf-library-row"><div><b>${e(title(f))}</b><small>${show(f.kcal)} kcal · ${show(f.protein)} g protein / 100 ${unit(f)}</small><small>${e(f.sourceStatus||'Custom / original entry')}${f.userEdited?' · edited':''}</small></div><div><button data-mf-food="${f.ref}">Edit</button>${f.ref.startsWith('c:')?`<button data-mf-food-delete="${f.ref}">Delete</button>`:''}</div></div>`).join('')||'<p>No matching ingredient. Create one above.</p>';}
let dialog=null,lastFocus=null,scanId=0;
function closeDialog(){scanId++;dialog?.close();dialog?.remove();dialog=null;lastFocus?.focus();}
function modal(title,content){
 closeDialog();lastFocus=document.activeElement;dialog=document.createElement('dialog');dialog.className='mf-dialog';dialog.innerHTML=`<div class="mf-modal-head"><h2>${e(title)}</h2><button id="mf-close" aria-label="Close dialog">×</button></div>${content}`;
 document.body.appendChild(dialog);dialog.showModal();dialog.querySelector('#mf-close').onclick=closeDialog;dialog.addEventListener('cancel',ev=>{ev.preventDefault();closeDialog();});return dialog;
}
function picker(){
 const el=modal('Add ingredient',`<input id="mf-search" autofocus type="search" placeholder="Search paneer, milk, atta…" aria-label="Search ingredients"><div id="mf-results"></div><button id="mf-create" class="mf-add">+ New ingredient / scan label</button>`);
 const search=()=>{
  const q=el.querySelector('#mf-search').value.trim(),matches=catalogue().filter(f=>matches(f,q));
  el.querySelector('#mf-results').innerHTML=matches.map(f=>`<button class="mf-result" data-mf-pick="${f.ref}"><span><b>${e(title(f))}</b><small>${show(f.kcal)} kcal · ${show(f.protein)} g protein / 100 ${unit(f)}</small><small>${e(f.sourceStatus||'Custom / original entry')}${f.userEdited?' · edited':''}</small></span><span>+</span></button>`).join('')||'<p>Not found. Add it below; you can leave unknown nutrition blank.</p>';
  el.querySelectorAll('[data-mf-pick]').forEach(b=>b.onclick=()=>{const f=catalogue().find(f=>f.ref===b.dataset.mfPick);if(changeDraft(d=>d.items.push(snapshot(f)))){closeDialog();render();}});
 };
 el.querySelector('#mf-search').oninput=search;el.querySelector('#mf-create').onclick=()=>ingredientForm(null,null,true,el.querySelector('#mf-search').value.trim());search();
}
function ingredientForm(f,ref,addToMeal=false,newName=''){
 const isRow=ref?.startsWith('r:'),builtin=ref?.startsWith('b:'),v=nutrition(f||{name:newName,defaultGrams:100});
 const el=modal(isRow?'Edit meal ingredient':f?'Edit ingredient':'New ingredient',`<div class="mf-scan"><label class="mf-add">Scan nutrition label<input id="mf-photo" type="file" accept="image/*"></label><p id="mf-scan-status" role="status">Upload a clear label. Review all extracted values before saving.</p></div><img id="mf-photo-preview" alt="Nutrition label preview" ${v.imageData?'src="'+e(v.imageData)+'"':'hidden'}>
 <form id="mf-ingredient-form"><div class="mf-fields"><label class="mf-span">Ingredient name<input id="mf-f-name" required maxlength="100" value="${e(title(v)||'')}"></label><label>Measure in<select id="mf-f-unit"><option value="g" ${unit(v)==='g'?'selected':''}>Grams (g)</option><option value="ml" ${unit(v)==='ml'?'selected':''}>Millilitres (ml)</option></select></label>${keys.map(k=>`<label>${labels[k]} / 100 <span data-mf-unit>${unit(v)}</span><input id="mf-f-${k}" type="number" min="0" ${k==='kcal'?'max="1000"':'max="100"'} step="any" placeholder="Unknown" value="${valid(v[k])?v[k]:''}"></label>`).join('')}<label>${isRow?'Amount in meal':'Starting portion'} (<span data-mf-unit>${unit(v)}</span>)<input id="mf-f-serving" required type="number" min="0.1" step="any" value="${isRow?v.grams:v.defaultGrams||100}"></label></div><p class="mf-hint">Blank means unknown. Enter 0 only when the label confirms zero. Values must be per 100 <span data-mf-unit>${unit(v)}</span>; convert per-serving labels before saving. Changing units does not convert density.</p>${sourceHTML(v)}<details class="mf-ocr"><summary>OCR text & conversion</summary><textarea id="mf-ocr-text" rows="5" readonly aria-label="Extracted OCR text"></textarea><label>Label’s values are per<select id="mf-basis"><option value="100">100 ${unit(v)}</option><option value="serving">serving</option><option value="unknown">Choose label basis</option></select></label><label>Label serving size (<span data-mf-unit>${unit(v)}</span>)<input id="mf-label-serving" type="number" min="0.1" step="any" value="100"></label><button type="button" id="mf-convert">Convert fields to per 100 <span data-mf-unit>${unit(v)}</span></button><p id="mf-conversion-status"></p></details>${isRow?'<label class="mf-check"><input id="mf-also-library" type="checkbox"> Also update this ingredient in my library for future meals</label>':''}<button class="primary mf-wide" type="submit">${isRow?'Update ingredient':addToMeal?'Save ingredient & add to meal':'Save ingredient'}</button><p id="mf-form-error" role="alert"></p></form>`);
 let imageData=v.imageData||'';
 const syncUnit=()=>{el.querySelectorAll('[data-mf-unit]').forEach(n=>n.textContent=el.querySelector('#mf-f-unit').value);el.querySelector('#mf-basis option[value="100"]').textContent='100 '+el.querySelector('#mf-f-unit').value;};
 el.querySelector('#mf-f-unit').onchange=syncUnit;
 el.querySelector('#mf-convert').onclick=()=>{const g=Number(el.querySelector('#mf-label-serving').value);if(el.querySelector('#mf-basis').value!=='serving'||!g)return;keys.forEach(k=>{const input=el.querySelector('#mf-f-'+k);if(input.value!=='')input.value=String(Math.round(Number(input.value)*100/g*100)/100);});el.querySelector('#mf-basis').value='100';el.querySelector('#mf-conversion-status').textContent='Converted to per 100 '+el.querySelector('#mf-f-unit').value+'. Check the result against the label.';};
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
    el.querySelector('#mf-basis').value=parsed.basis;el.querySelector('#mf-f-unit').value=parsed.unit;syncUnit();
    status.textContent=parsed.message;
    if(parsed.basis!=='100')el.querySelector('.mf-ocr').open=true;
   }finally{if(worker)await worker.terminate();}
  }catch(err){if(token===scanId)status.textContent='Could not scan. Check your connection or enter the values manually. '+err.message;}finally{if(token===scanId)el.querySelector('[type=submit]').disabled=false;}
 };
 el.querySelector('form').onsubmit=ev=>{
  ev.preventDefault();const name=el.querySelector('#mf-f-name').value.trim(),g=Number(el.querySelector('#mf-f-serving').value);
  if(!name||g<=0)return;
  if(el.querySelector('#mf-basis').value!=='100'){el.querySelector('#mf-form-error').textContent='Confirm the label basis. Convert per-serving fields to per 100 of the selected unit before saving.';return;}
  const updated={...v,name:builtin?v.name:name,displayName:name,unit:el.querySelector('#mf-f-unit').value,defaultGrams:g,imageData,nutritionReviewed:true,userEdited:true};delete updated.ref;keys.forEach(k=>updated[k]=number(el.querySelector('#mf-f-'+k).value));updated.unknownNutrients=keys.filter(k=>updated[k]===null);
  const duplicates=catalogue().find(x=>(x.name.toLowerCase()===name.toLowerCase()||title(x).toLowerCase()===name.toLowerCase())&&x.ref!==ref);
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
 const lines=raw.split(/\r?\n/),out={raw,unit:/\b100\s*ml\b|serv(?:ing|e)\s*size[^\n]*\bml\b/i.test(raw)?'ml':'g',basis:/per\s*100\s*(?:g|ml)|100\s*(?:g|ml)/i.test(raw)?'100':/per\s*serv|serving\s*size/i.test(raw)?'serving':'unknown'};
 const serving=raw.match(/serv(?:ing|e)\s*size[^\d\n]{0,20}(\d+(?:[.,]\d+)?)\s*(?:g|ml)/i);out.serving=serving?Number(serving[1].replace(',','.')):null;
 const patterns={kcal:/energy|calories|calorific/i,protein:/protein/i,carbs:/carbohydrate|carbs/i,fat:/^\s*(?:total\s+)?fat\b/i};
 let ambiguous=false;
 keys.forEach(k=>{
  const line=lines.find(l=>patterns[k].test(l));out[k]=null;if(!line)return;
  const numbers=(line.match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>Number(x.replace(',','.')));
  if(numbers.length!==1){ambiguous=true;return;}
  if(k==='kcal'&&!/kcal|calories/i.test(line)){ambiguous=true;return;}
  out[k]=numbers[0];
 });
 out.name=lines.find(l=>l.trim().length>3&&l.trim().length<65&&!/nutrition|energy|calori|protein|fat|carb|sugar|salt|sodium|fiber|fibre|serv|ingredient|\d/i.test(l))?.trim()||'';
 out.message=ambiguous?'Some rows have multiple columns or unclear units. They were left blank; verify them in the label.':out.basis==='serving'?'Values read per serving. Check them, then convert to per 100 of the selected unit below.':out.basis==='unknown'?'Could not confirm the label basis. Verify that all fields are per 100 of the selected unit before saving.':'Label read. Review every value before saving; blank fields were not found.';
 return out;
}
async function loadOCR(){if(window.Tesseract)return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('OCR download failed'));document.head.appendChild(s);});}
async function compress(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{const c=document.createElement('canvas'),scale=Math.min(1,1000/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',.8));};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Image could not be opened'));};img.src=url;});}
function refreshTotals(){const d=draft();document.querySelector('#mf-live').innerHTML=macroHTML(d.items)+warning(d.items);d.items.forEach((x,i)=>{const el=document.querySelector('#mf-row-info-'+i);if(el)el.textContent=rowInfo(x);});}
logFood=function(name,amount,meal='Dinner'){
 const f=foodDef(name);if(!f||!(Number(amount)>0))return;
 if(write(()=>day().food.push({...snapshot(f,Number(amount)),meal}))){toast('Food logged');render();}
};
logPreset=function(index){const p=dinnerPresets[index];if(!p)return;
 if(write(()=>day().food.push(...p[1].map(([name,g])=>({...snapshot(foodDef(name),g),meal:'Dinner'}))))){toast('Dinner added');render();}
};
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
