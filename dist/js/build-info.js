export const REPOSITORY='https://github.com/michalmedvecky/pre2-web';
export function commitIdentity(value){return typeof value==='string'&&/^[0-9a-f]{40}$/.test(value)?{label:'Commit '+value.slice(0,7),title:value,url:REPOSITORY+'/commit/'+value}:null;}
export async function showBuildInfo(link,fetcher=fetch){
 if(!link)return;
 try{const response=await fetcher(new URL('../build.json',import.meta.url),{cache:'no-store'});if(!response.ok)throw Error('Build metadata unavailable');const info=commitIdentity((await response.json()).commit);if(info){link.textContent=info.label;link.title=info.title;link.href=info.url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Deployed source commit '+info.title);return;}}
 catch{}
 link.textContent='Local / unknown build';link.removeAttribute('href');
}
