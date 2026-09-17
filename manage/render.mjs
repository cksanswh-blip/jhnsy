import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeJson=s=>JSON.stringify(s).replace(/</g,'\\u003c');
const closed='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,noarchive"><title>초대가 마무리되었습니다</title><body><main><h1>함께해 주셔서 감사합니다.</h1><p>청첩장 공개 기간이 종료되었습니다.</p></main></body></html>';
export function validateRegistry(registry){
 if(registry?.version!==1||!Array.isArray(registry.invitations))throw Error('Invalid registry');
 const seen=new Set();
 for(const x of registry.invitations){
  if(!/^[a-z0-9][a-z0-9-]{2,59}$/.test(x.slug)||['index','assets','manage','docs','jhnsy'].includes(x.slug)||seen.has(x.slug))throw Error('Invalid or duplicate slug');seen.add(x.slug);
  if(!['published','revoked','expired'].includes(x.status)||!Number.isFinite(Date.parse(x.expiresAt)))throw Error('Invalid lifecycle');
  if(Object.keys(x).some(k=>!['slug','status','expiresAt','title','description','target','image','icon'].includes(k)))throw Error('Private/unknown fields cannot enter Git');
  if(x.status!=='published')continue;
  for(const field of ['target','image']){const u=new URL(x[field]);const valid=u.origin==='https://egofathomin.com'&&u.pathname.startsWith('/wedding/')||(field==='image'&&u.origin==='https://wedding.egofathomin.com'&&u.pathname.startsWith('/'+x.slug+'/'));if(!valid||u.username||u.password||u.search||u.hash)throw Error('Invalid public destination');}
  if(typeof x.title!=='string'||x.title.length>120||typeof x.description!=='string'||x.description.length>300)throw Error('Invalid metadata');
 }
 return registry;
}
export function renderShare(x,now=new Date()){
 if(x.status!=='published'||now.getTime()>=Date.parse(x.expiresAt))return closed;
 const share='https://wedding.egofathomin.com/'+x.slug+'/';
 return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,noarchive"><meta name="referrer" content="no-referrer"><link rel="canonical" href="${share}"><title>${escape(x.title)}</title><meta property="og:type" content="website"><meta property="og:site_name" content="Egoin Wedding"><meta property="og:title" content="${escape(x.title)}"><meta property="og:description" content="${escape(x.description)}"><meta property="og:url" content="${share}"><meta property="og:image" content="${escape(x.image)}"><meta property="og:image:secure_url" content="${escape(x.image)}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><link rel="icon" type="image/svg+xml" href="/assets/heart.svg"><link rel="icon" type="image/png" href="/assets/heart-180.png"><link rel="apple-touch-icon" sizes="180x180" href="/assets/heart-180.png"></head><body><main><h1>${escape(x.title)}</h1><p>${escape(x.description)}</p><a href="${escape(x.target)}">청첩장 열기</a></main><script>if(Date.now()>=Date.parse(${safeJson(x.expiresAt)})){document.title='초대가 마무리되었습니다';document.querySelector('main').textContent='청첩장 공개 기간이 종료되었습니다. 함께해 주셔서 감사합니다.';document.querySelectorAll('meta[property^="og:"]').forEach(x=>x.remove());}else{location.replace(${safeJson(x.target)});}</script></body></html>`;
}
export async function buildRegistry(registry,root,now=new Date()){
 validateRegistry(registry);const updated=structuredClone(registry);
 for(const x of updated.invitations){
  if(x.status==='published'&&now.getTime()>=Date.parse(x.expiresAt))x.status='expired';
  if(x.status!=='published'){delete x.title;delete x.description;delete x.target;delete x.image;}
  const dir=path.resolve(root,x.slug);if(!dir.startsWith(path.resolve(root)+path.sep))throw Error('Unsafe output');
  await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'index.html'),renderShare(x,now));
 }
 return updated;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [registryFile,root]=process.argv.slice(2);if(!registryFile||!root)throw Error('Usage: node render.mjs registry.json output-root');
 const updated=await buildRegistry(JSON.parse(await readFile(registryFile,'utf8')),root);await writeFile(registryFile,JSON.stringify(updated,null,2)+'\n');
 console.log('Managed share pages synchronized:',updated.invitations.length);
}
