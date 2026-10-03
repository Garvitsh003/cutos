/* Preserve the existing laptop data before app/migration scripts run. */
(()=>{try{const raw=localStorage.getItem('cutos-state');if(raw&&!localStorage.getItem('cutos-original-before-cloud-v1'))localStorage.setItem('cutos-original-before-cloud-v1',raw);}catch(error){window.cutosBackupWarning=true;}})();
