/* Rip City: collection transfer from the old rippermon.netlify.app origin.
   #transfer=<base64url(deflate-raw(JSON))> (plain base64 JSON also accepted) holding the pps* keys (same set as Backup Export).
   Merged with bkMerge (never wipes what is already here), written, hash stripped, then one reload so every module reads it. */
async function xfDecode(raw){let s=raw;try{s=decodeURIComponent(raw)}catch(e){}s=s.replace(/-/g,"+").replace(/_/g,"/").replace(/[^A-Za-z0-9+/=]/g,"");while(s.length%4)s+="=";
 const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
 let txt=null;if(window.DecompressionStream){try{txt=await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text()}catch(e){txt=null}}
 if(txt==null)txt=new TextDecoder().decode(u);
 const j=JSON.parse(txt),d=j&&j.data&&typeof j.data==="object"?j.data:j,out={};
 for(const [k,v] of Object.entries(d||{}))if(/^pps/.test(k)&&!BK.skip.test(k)&&typeof v==="string")out[k]=v;
 if(!Object.keys(out).length)return null;if(out.pps){const p=JSON.parse(out.pps);if(!p||typeof p!=="object")return null}return out}
(async function xfRun(){
 let moved=null;try{moved=sessionStorage.getItem("ppsMoved");if(moved)sessionStorage.removeItem("ppsMoved")}catch(e){}
 if(moved)setTimeout(()=>bkToast("Collection moved over from Rippermon ✓"),500);
 const m=/^#transfer=(.*)$/s.exec(location.hash);if(!m)return;const X=window.__xfer||{};
 const strip=()=>{try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}},done=t=>{strip();X.restore&&X.restore();if(t)bkToast(t)};
 let inc=null;try{inc=await xfDecode(m[1])}catch(e){inc=null}
 if(!inc)return done("Couldn't read the moved collection. Use Settings → Import with a backup file.");
 const next=bkMerge(bkSnapshot(),inc);X.w=1;const ok=bkWrite(next);X.w=0;
 if(!ok)return done("Not enough storage to move the collection. Nothing was changed.");
 try{sessionStorage.setItem("ppsMoved","1")}catch(e){}strip();window.__xferDone=1;location.reload()})();
