#!/usr/bin/env node
// Zero-dependency VR deployment: resolve a tested GHCR tag, pin its digest, then apply.
import {readFile,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export const IMAGE='ghcr.io/michalmedvecky/pre2-web';
const root=new URL('../deploy/vr/',import.meta.url);
const name=(v,label)=>{if(v.trim()!==v||!/^[a-z0-9](?:[-a-z0-9.]*[a-z0-9])?$/.test(v)||v.length>253)throw Error(`Invalid ${label}`);return v;};
export async function resolveImage(){
 const auth=await fetch('https://ghcr.io/token?service=ghcr.io&scope=repository:michalmedvecky/pre2-web:pull',{signal:AbortSignal.timeout(15000)});
 if(!auth.ok)throw Error('Cannot obtain public GHCR pull access. For a private package pass --image with its exact digest and --pull-secret.');
 const {token}=await auth.json();if(!token)throw Error('GHCR did not return a pull token');
 const r=await fetch('https://ghcr.io/v2/michalmedvecky/pre2-web/manifests/vr-quest',{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json'},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error(`Cannot resolve the tested VR image (HTTP ${r.status}). Check that Publish Quest VR image succeeded and the GHCR package is public, or pass --image with an exact digest.`);
 const digest=r.headers.get('docker-content-digest'),index=await r.json();
 for(const arch of ['amd64','arm64'])if(!index.manifests?.some(m=>m.platform?.os==='linux'&&m.platform?.architecture===arch))throw Error(`VR image is missing linux/${arch}`);
 if(!/^sha256:[a-f0-9]{64}$/.test(digest||''))throw Error('GHCR did not return a valid image digest');return `${IMAGE}@${digest}`;
}
export async function render({image,host,ingressClass='nginx',tlsSecret='pre2-vr-tls',pullSecret,noIngress=false}){
 if((image||'').trim()!==image||!new RegExp('^'+IMAGE.replaceAll('.','\\.')+'@sha256:[a-f0-9]{64}$').test(image||''))throw Error(`--image must be ${IMAGE}@sha256:<64 hex characters>; mutable tags are not accepted`);
 let workloads=await readFile(new URL('kubernetes.yaml',root),'utf8');
 workloads=workloads.replace(`image: ${IMAGE}:vr-quest`,`image: ${image}`);
 if(pullSecret){name(pullSecret,'pull secret');workloads=workloads.replace('      automountServiceAccountToken:',`      imagePullSecrets:\n        - name: ${JSON.stringify(pullSecret)}\n      automountServiceAccountToken:`);}
 let ingress=null;if(!noIngress){if(!host)throw Error('Provide --host for your HTTPS domain, or --no-ingress');name(host,'hostname');name(ingressClass,'ingress class');name(tlsSecret,'TLS secret');ingress=(await readFile(new URL('ingress.yaml',root),'utf8')).replaceAll('pre2-vr.example.com',host).replace('ingressClassName: nginx',`ingressClassName: ${JSON.stringify(ingressClass)}`).replace('secretName: pre2-vr-tls',`secretName: ${JSON.stringify(tlsSecret)}`);}
 return {workloads,ingress};
}
async function main(args){
 const options={},flags=new Set(['--no-ingress']);for(let i=0;i<args.length;i++){const key=args[i];if(key==='--help'){console.log('node scripts/deploy-vr.mjs --context CLUSTER --host DOMAIN [--ingress-class nginx] [--tls-secret NAME] [--pull-secret NAME] [--image ghcr.io/michalmedvecky/pre2-web@sha256:...] [--no-ingress] [--render-only DIRECTORY]');return;}if(flags.has(key)){options[key]=true;continue;}if(!['--context','--host','--ingress-class','--tls-secret','--pull-secret','--image','--render-only'].includes(key)||!args[i+1]||args[i+1].startsWith('--'))throw Error(`Unknown or incomplete option: ${key}`);options[key]=args[++i];}
 if(!options['--render-only']&&!options['--context'])throw Error('Provide --context explicitly to select the destination cluster');
 // Validate host/config before any network request.
 await render({image:options['--image']||`${IMAGE}@sha256:${'0'.repeat(64)}`,host:options['--host'],ingressClass:options['--ingress-class'],tlsSecret:options['--tls-secret'],pullSecret:options['--pull-secret'],noIngress:options['--no-ingress']});
 const image=options['--image']||await resolveImage(),files=await render({image,host:options['--host'],ingressClass:options['--ingress-class'],tlsSecret:options['--tls-secret'],pullSecret:options['--pull-secret'],noIngress:options['--no-ingress']});
 const temporary=!options['--render-only'],directory=temporary?await mkdtemp(path.join(tmpdir(),'pre2-vr-deploy-')):path.resolve(options['--render-only']);await mkdir(directory,{recursive:true});
 try{const workload=path.join(directory,'kubernetes.yaml'),ingress=path.join(directory,'ingress.yaml');await writeFile(workload,files.workloads);if(files.ingress)await writeFile(ingress,files.ingress);else await rm(ingress,{force:true});console.log(`VR image: ${image}`);
  if(!temporary){console.log(`Rendered manifests: ${directory}`);return;}
  const context=options['--context'];const kubectl=(...a)=>{const r=spawnSync('kubectl',['--context',context,...a],{stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)throw Error(`kubectl failed (${r.status})`);};
  console.log(`Deploying only namespace pre2-vr to context ${context}`);kubectl('apply','-f',workload);if(files.ingress)kubectl('apply','-f',ingress);kubectl('-n','pre2-vr','rollout','status','deployment/pre2-vr','--timeout=180s');console.log(files.ingress?`Open https://${options['--host']}/vr/ on Quest.`:'VR rollout complete; existing ingress configuration preserved.');
 }finally{if(temporary)await rm(directory,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
