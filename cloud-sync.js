/* CutOS account sync. Local writes happen first; cloud updates use version checks. */
(()=>{
'use strict';
const {merge,equal,copy,validate}=window.CutOSSyncCore;
const arrivedFromEmail=/access_token=|error_description=/.test(window.location.hash);
const META='cutos-cloud-meta-v1',RECOVERY='cutos-cloud-recovery-v1';
const config=window.CUTOS_SYNC_CONFIG||{};
const publicKey=(()=>{const key=config.publishableKey||'';if(key.startsWith('sb_publishable_'))return true;try{return JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{return false;}})();
const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url||'')&&publicKey;
let client=null,user=null,busy=false,timer=null,initialRow=null,conflict=null,lastSync='',status='Saved on this browser',phase=configured?'loading':'unconfigured',email='',meta=null,multiTab=false,pendingApply=null;
try{meta=JSON.parse(localStorage.getItem(META)||'null');}catch{}
const documentData=()=>Object.fromEntries(Object.entries(copy(state)).filter(([k])=>!['tab','selectedDate'].includes(k)));
const localSave=save;
function dirty(){return !!meta&&!equal(documentData(),meta.base);}
function message(text){status=text;const el=document.querySelector('#cs-status');if(el)el.textContent=text;const badge=document.querySelector('#cs-badge');if(badge)badge.textContent=text;}
function repaint(){render();}
function backup(data=state,label='backup'){
 const blob=new Blob([JSON.stringify({format:'cutos-backup-v1',exportedAt:new Date().toISOString(),data:copy(data)},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cutos-'+label+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function preserve(reason,extra){localStorage.setItem(RECOVERY,JSON.stringify({reason,savedAt:new Date().toISOString(),data:copy(state),extra}));}
function install(data,nextMeta){
 validate(data);
 const previous=copy(state),oldMeta=meta,oldRaw=localStorage.getItem('cutos-state'),oldMetaRaw=localStorage.getItem(META);
 try{
  state={...structuredClone(defaults),...copy(data),tab:state.tab,selectedDate:state.selectedDate};
  localSave();localStorage.setItem(META,JSON.stringify(nextMeta));meta=nextMeta;
  foods.forEach(f=>{if(state.foodOverrides?.[f.name])Object.assign(f,state.foodOverrides[f.name]);});
 }catch(error){state=previous;meta=oldMeta;try{if(oldRaw!==null)localStorage.setItem('cutos-state',oldRaw);else localStorage.removeItem('cutos-state');if(oldMetaRaw!==null)localStorage.setItem(META,oldMetaRaw);else localStorage.removeItem(META);}catch{}throw Error('Browser storage is full. Download a backup before freeing space.');}
}
function editing(){return !!document.querySelector('dialog[open]')||document.activeElement?.matches('input,textarea,select');}
function schedule(){clearTimeout(timer);if(user&&phase==='ready')timer=setTimeout(()=>sync(),900);}
save=function(){localSave();if(user&&phase==='ready'){message(dirty()?'Saved here · waiting to sync':status);schedule();}};
async function readRemote(){const {data,error}=await client.from('cutos_documents').select('version,data,updated_at').eq('user_id',user.id).maybeSingle();if(error)throw error;if(data)validate(data.data);return data;}
async function commit(data,version){validate(data);const {data:result,error}=await client.rpc('cutos_save',{expected_version:version,new_data:data});if(error)throw error;validate(result.data);return result;}
function bound(){return user&&meta?.owner===user.id&&meta?.project===config.url;}
function accountStill(id){if(multiTab)throw Error('Another tab changed data. Reload before syncing.');if(!user||user.id!==id)throw Error('Account changed. Your local data is unchanged.');}
async function settle(result,captured,id){
 accountStill(id);
 if(editing()){pendingApply={result,captured,id};message('Cloud saved · finish editing to refresh this view');schedule();return;}
 pendingApply=null;
 // Include edits made locally while the network request was in flight.
 const pending=merge(captured,documentData(),result.data);
 const next={owner:id,project:config.url,base:copy(result.data),version:result.version};
 if(pending.conflicts.length){
  // Keep the current state and the old base until the user resolves this race.
  conflict={remote:result,paths:pending.conflicts};phase='conflict';message('Changes need review · both versions kept');repaint();return;
 }
 install(pending.data,next);lastSync=new Date().toLocaleTimeString();phase='ready';conflict=null;
 message(dirty()?'Saved here · waiting to sync':'Synced · '+lastSync);if(!editing())repaint();if(dirty())schedule();
}
async function sync(){
 if(busy||!bound()||phase!=='ready'||multiTab)return;
 if(navigator.onLine===false){message('Offline · changes saved on this browser');return;}
 if(editing()){schedule();return;}
 busy=true;const id=user.id,captured=documentData();message('Syncing…');
 try{
  if(pendingApply){await settle(pendingApply.result,pendingApply.captured,pendingApply.id);return;}
  const remote=await readRemote();accountStill(id);
  if(!remote){phase='missing';message('Cloud record missing. Your browser copy is safe.');repaint();return;}
  const merged=merge(meta.base,captured,remote.data);
  if(merged.conflicts.length){conflict={remote,paths:merged.conflicts};phase='conflict';message('Changes need review · both versions kept');repaint();return;}
  const result=equal(merged.data,remote.data)?remote:await commit(merged.data,remote.version);
  await settle(result,captured,id);
 }catch(error){message(error.code==='40001'?'Another device saved first · retrying':'Saved here · sync failed: '+error.message);if(error.code==='40001')schedule();}
 finally{busy=false;}
}
async function identify(session){
 const next=session?.user||null;
 if(next?.id===user?.id)return;
 user=next;conflict=null;initialRow=null;pendingApply=null;if(user&&arrivedFromEmail)state.tab='settings';
 if(!user){phase=configured?'signedout':'unconfigured';message('Saved on this browser · sign in to sync');repaint();return;}
 if(meta&&(meta.owner!==user.id||meta.project!==config.url)){phase='accountMismatch';message('This browser is linked to another account or project. Its data has not been uploaded.');repaint();return;}
 if(bound()){phase='ready';message('Checking your saved account data…');repaint();schedule();return;}
 phase='loading';message('Checking account…');repaint();
 try{const id=user.id;initialRow=await readRemote();accountStill(id);phase='migration';message(initialRow?'Account data found · choose how to connect this browser':'Ready to upload this browser’s existing data');repaint();}
 catch(error){phase='initialError';message('Could not check account: '+error.message);repaint();}
}
async function uploadExisting(){
 if(busy||!user||meta||phase!=='migration'||initialRow)return;busy=true;const id=user.id,captured=documentData();
 try{backup();preserve('Before initial cloud upload');const result=await commit(captured,0);await settle(result,captured,id);}
 catch(error){message('Upload not completed. Browser data is unchanged: '+error.message);if(error.code==='40001'){initialRow=await readRemote();phase='migration';repaint();}}
 finally{busy=false;}
}
async function loadAccount(){
 if(busy||!user||meta||phase!=='migration')return;busy=true;
 try{const id=user.id,remote=await readRemote();accountStill(id);if(!remote)throw Error('No cloud data found. Upload your laptop first.');backup();preserve('Before loading account');install(remote.data,{owner:id,project:config.url,base:copy(remote.data),version:remote.version});phase='ready';message('Synced · account data loaded');repaint();}
 catch(error){message('Could not load account. Browser copy is unchanged: '+error.message);}finally{busy=false;}
}
async function resolveConflict(prefer){
 if(busy||!bound()||phase!=='conflict')return;busy=true;
 try{const id=user.id,remote=await readRemote();accountStill(id);if(!remote)throw Error('Cloud record missing');const local=documentData();backup({local,cloud:remote.data,base:meta.base},'conflict-copies');preserve('Before conflict resolution',{cloud:remote.data,base:meta.base});
  const result=prefer==='local'?merge(meta.base,local,remote.data):merge(meta.base,remote.data,local);
  // Set the baseline to the fetched cloud revision; the chosen changes are queued normally.
  install(result.data,{...meta,base:copy(remote.data),version:remote.version});conflict=null;phase='ready';message('Choices saved here · syncing…');repaint();schedule();
 }catch(error){message('Resolution not completed: '+error.message);}finally{busy=false;}
}
function panel(){
 let body='';
 if(phase==='unconfigured')body='<p>Cloud sync needs its one-time connection setup. Your existing data is still saved on this browser. Download a backup now.</p>';
 else if(!user)body=`<p>Use the same email on your laptop and phone.</p><form id="cs-email-form"><label>Email<input id="cs-email" type="email" autocomplete="email" required value="${esc(email)}"></label><button type="submit">Email me a sign-in link</button></form><p>No password or code needed. Open the emailed link to sign in. For your first upload, use the laptop browser that holds your meals.</p>`;
 else {
  body=`<p>Signed in as <b>${esc(user.email||'your account')}</b></p>`;
  if(phase==='migration')body+=initialRow?'<p>Your account already has data. Download this browser’s backup before loading it. To keep extra entries from this browser, save the backup and import it after connecting.</p><button id="cs-load" class="primary">Load my account data</button>':'<p>Start on your laptop, where your existing meals are stored. This uploads meals, workouts, ingredients, targets and drafts. A backup download starts first.</p><button id="cs-upload" class="primary">Upload this browser’s data</button>';
  if(phase==='accountMismatch')body+='<p>Sign out and use the account previously connected to this browser. Automatic cross-account migration is blocked.</p>';
  if(phase==='initialError')body+='<button id="cs-retry">Retry connection</button>';
  if(phase==='missing')body+='<p>Automatic uploads are paused. Download your browser backup before investigating the account database.</p>';
  if(phase==='conflict')body+=`<p>Both devices changed the same ${conflict.paths.length===1?'field':'fields'}. Separate edits are already preserved in the proposed merge. Choose which conflicting values to keep; copies of both versions download first.</p><details><summary>Review changed fields</summary><ul>${conflict.paths.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></details><button id="cs-local">Keep this device’s conflicting values</button><button id="cs-cloud">Keep account’s conflicting values</button>`;
  if(phase==='ready')body+='<button id="cs-sync">Sync now</button>';
  body+='<button id="cs-signout">Sign out</button>';
 }
 return `<section class="card cs-panel"><h2>Account & backup</h2><p id="cs-status" role="status">${esc(status)}</p>${window.cutosBackupWarning?'<p>Automatic backup could not fit in browser storage. Download a backup before connecting.</p>':''}${body}<div class="cs-backups"><button id="cs-backup">Download current backup</button><button id="cs-original">Download pre-sync backup</button><label>Import a CutOS backup<input id="cs-import" type="file" accept=".json,application/json"></label><p>Offline edits stay on this browser until it is online and signed in. The app checks for updates while open and when you return.</p></div></section>`;
}
const previousSettings=settingsView,previousBind=bind,previousHeader=header;
settingsView=function(){return panel()+previousSettings();};
header=function(){return previousHeader()+`<div class="cs-badge" id="cs-badge" role="status">${esc(status)}</div>`;};
bind=function(){previousBind();if(state.tab!=='settings')return;
 // Avoid the old unscoped reset action deleting the only local copy during migration.
 $('#resetBtn')?.remove();
 $('#cs-backup')?.addEventListener('click',()=>backup());
 $('#cs-original')?.addEventListener('click',()=>{const raw=localStorage.getItem('cutos-original-before-cloud-v1');if(raw)backup(JSON.parse(raw),'before-cloud');else backup();});
 $('#cs-email')?.addEventListener('input',ev=>email=ev.target.value);
 $('#cs-email-form')?.addEventListener('submit',async ev=>{ev.preventDefault();if(!client)return;email=$('#cs-email').value.trim();try{const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin+window.location.pathname}});if(error)throw error;message('Sign-in link sent. Open the newest email link on this device, in the browser you use for CutOS.');}catch(error){message('Could not send sign-in link: '+error.message);}});
 $('#cs-upload')?.addEventListener('click',uploadExisting);$('#cs-load')?.addEventListener('click',loadAccount);$('#cs-sync')?.addEventListener('click',()=>sync());
 $('#cs-local')?.addEventListener('click',()=>resolveConflict('local'));$('#cs-cloud')?.addEventListener('click',()=>resolveConflict('cloud'));
 $('#cs-retry')?.addEventListener('click',async()=>{const {data,error}=await client.auth.getSession();if(error)return message(error.message);user=null;await identify(data.session);});
 $('#cs-signout')?.addEventListener('click',async()=>{if(busy)return message('Wait for the current sync to finish.');if(dirty()&&!confirm('Some changes are only on this browser. Sign out and keep them here?'))return;const {error}=await client.auth.signOut({scope:'local'});if(error)return message(error.message);await identify(null);});
 $('#cs-import')?.addEventListener('change',async ev=>{const file=ev.target.files?.[0];if(!file)return;if(busy||['accountMismatch','conflict','loading'].includes(phase))return message('Finish connecting or resolving changes before importing.');try{if(file.size>16000000)throw Error('File is too large');const raw=JSON.parse(await file.text()),data=validate(raw.data||raw);if(!confirm('Merge this backup into the current browser data? Current values win for conflicting fields; separate meals are retained. A current backup downloads first.'))return;backup();preserve('Before backup import');const merged=merge(undefined,documentData(),data).data;install(merged,meta);repaint();schedule();message('Backup imported on this browser'+(bound()?' · waiting to sync':''));}catch(error){message('Import failed: '+error.message);}});
};
window.addEventListener('online',()=>{message('Online · checking saved changes');schedule();});
window.addEventListener('offline',()=>message('Offline · changes saved on this browser'));
window.addEventListener('focus',schedule);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
window.addEventListener('storage',ev=>{if(ev.key==='cutos-state'||ev.key===META){multiTab=true;message('Another tab changed this browser’s data. Reload this tab before editing.');}});
// Do not keep saving stale state after detecting another tab's changes.
const syncedSave=save;save=function(){if(multiTab)throw Error('Reload this tab to use the newest browser data.');syncedSave();};
setInterval(()=>{if(!document.hidden)schedule();},15000);
async function start(){
 if(!configured){repaint();return;}
 try{if(!window.supabase)throw Error('Sign-in library unavailable. Reconnect to the internet and reload.');client=window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}});
  client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>identify(session),0));
  const {data,error}=await client.auth.getSession();if(error)throw error;await identify(data.session);if(!data.session){phase='signedout';message('Saved on this browser · sign in to sync');repaint();}
 }catch(error){phase='signedout';message('Connection unavailable: '+error.message);repaint();}
}
window.CutOSCloud={backup,sync};
start();
})();
