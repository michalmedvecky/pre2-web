// Source identity comes only from the image's served metadata, never a local HEAD guess.
export function repositoryURL(value) {
  if(typeof value!=='string')return null;
  const match=/^https:\/\/github\.com\/([A-Za-z0-9][A-Za-z0-9-]*)\/([A-Za-z0-9_.-]+)\/?$/.exec(value);
  if(!match||['.','..'].includes(match[2]))return null;
  return `https://github.com/${match[1]}/${match[2]}`;
}
export function buildIdentity(value) {
  const data=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const repository=repositoryURL(data.repository);
  const sourceSnapshot=typeof data.sourceSnapshot==='string'&&/^(?:sha256:)?[0-9a-f]{64}$/.test(data.sourceSnapshot)?data.sourceSnapshot.replace(/^sha256:/,''):null;
  const verified=!!(repository&&data.buildSource==='ci'&&data.dirty===false&&typeof data.commit==='string'&&/^[0-9a-f]{40}$/.test(data.commit));
  const dirty=data.dirty===true||data.buildSource==='dirty-snapshot';
  const status=verified?'ci':dirty?'dirty-snapshot':data.buildSource==='local'?'local':'unknown';
  return{repository,commit:verified?data.commit:null,commitURL:verified?`${repository}/commit/${data.commit}`:null,sourceSnapshot,status,label:verified?`Commit ${data.commit.slice(0,7)}`:dirty?'Working snapshot':status==='local'?'Local build':'Unverified build'};
}
function apply(link,{label,url,title}) {
  if(!link)return;link.textContent=label;link.title=title;link.setAttribute('aria-label',title);
  if(url){link.href=url;link.target='_blank';link.rel='noopener noreferrer';}
  else{link.removeAttribute('href');link.removeAttribute('target');link.removeAttribute('rel');}
}
export async function showBuildInfo(repositoryLink,commitLink,{fetcher=fetch,metadataURL=new URL('../build.json',import.meta.url)}={}) {
  let identity=buildIdentity(null);
  try{const response=await fetcher(metadataURL,{cache:'no-store'});if(!response.ok)throw Error('Build metadata unavailable');identity=buildIdentity(await response.json());}catch{}
  apply(repositoryLink,{label:'GitHub',url:identity.repository,title:identity.repository?'Golden Axe source repository':'Source repository address has not been verified'});
  const title=identity.commit?`Source commit of this image: ${identity.commit}`:identity.status==='dirty-snapshot'?'Uncommitted working snapshot; build commit is unverified':'Build commit is unverified';
  apply(commitLink,{label:identity.label,url:identity.commitURL,title:title+(identity.sourceSnapshot?` · Source snapshot sha256:${identity.sourceSnapshot}`:'')});
  return identity;
}
