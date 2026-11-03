// WebKit iPhone 13 screenshots: settings with Backup, and the Home Screen nudge.  node tools/shot_backup.js
const {webkit,devices}=require('@playwright/test');
(async()=>{const b=await webkit.launch();
 const mk=async(extra)=>{const ctx=await b.newContext({...devices['iPhone 13'],serviceWorkers:'block'});const page=await ctx.newPage();
  await page.addInitScript(e=>{if(!sessionStorage.getItem('s')){localStorage.setItem('pps',JSON.stringify({packs:5530,coll:{},hist:[],migrated:1,sets:{}}));if(e)for(const [k,v] of Object.entries(e))localStorage.setItem(k,v);sessionStorage.setItem('s',1)}},extra);
  await page.goto('http://127.0.0.1:8765/');await page.waitForSelector('.tile');return page};
 let p=await mk({ppsBackupAt:String(Date.now()-23*864e5),ppsNudge:String(Date.now()+864e5)});await p.waitForTimeout(9000);await p.locator('#setbtn').click();await p.waitForTimeout(600);await p.screenshot({path:'screenshot-settings-backup.png'});
 p=await mk(null);await p.waitForSelector('#a2hs.on',{timeout:8000});await p.waitForTimeout(8000);await p.screenshot({path:'screenshot-a2hs-nudge.png'});
 await b.close()})();
