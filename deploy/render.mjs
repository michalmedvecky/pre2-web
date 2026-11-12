import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const dns=/^[a-z0-9](?:[-a-z0-9]*[a-z0-9])?$/;
function name(value,key){if(typeof value!=='string'||value.length>63||!dns.test(value))throw Error(`${key} must be an explicit DNS label`);return value;}
export function validate(config){
 if(!config||typeof config!=='object'||Array.isArray(config))throw Error('Expected a JSON object');
 const allowed=new Set(['kubeContext','namespace','image','imagePullSecret','expose','host','tlsSecret','ingressClass','ingressController','httpsEntrypoint']);for(const key of Object.keys(config))if(!allowed.has(key))throw Error(`Unknown configuration key: ${key}`);
 if(typeof config.kubeContext!=='string'||!config.kubeContext.trim()||/[\r\n\0]/.test(config.kubeContext))throw Error('kubeContext is required; rendering never selects or contacts it');
 name(config.namespace,'namespace');if(!/^ghcr\.io\/michalmedvecky\/remastered@sha256:[a-f0-9]{64}$/.test(config.image||''))throw Error('image must be ghcr.io/michalmedvecky/remastered@sha256:<64 lowercase hex digits>');
 if(typeof config.expose!=='boolean')throw Error('expose must be boolean');
 for(const key of ['imagePullSecret','tlsSecret','ingressClass']){if(config[key]!==undefined&&typeof config[key]!=='string')throw Error(`${key} must be a string`);if(config[key])name(config[key],key);}
 if(config.expose){if(config.host!=='remastered.500miles.cz')throw Error('host must be remastered.500miles.cz');name(config.tlsSecret,'tlsSecret');name(config.ingressClass,'ingressClass');if(!['traefik','standard'].includes(config.ingressController))throw Error('ingressController must explicitly be traefik or standard');if(config.ingressController==='traefik')name(config.httpsEntrypoint,'httpsEntrypoint');else if(config.httpsEntrypoint)throw Error('httpsEntrypoint applies only to Traefik');}
 return config;
}
export function render(raw){const c=validate(raw),labels={'app.kubernetes.io/name':'remastered','app.kubernetes.io/part-of':'remastered'},metadata={name:'remastered',namespace:c.namespace,labels};
 const probe={httpGet:{path:'/healthz',port:'http'},timeoutSeconds:2};
 const pod={automountServiceAccountToken:false,securityContext:{runAsNonRoot:true,runAsUser:10001,runAsGroup:10001,seccompProfile:{type:'RuntimeDefault'}},containers:[{name:'remastered',image:c.image,imagePullPolicy:'IfNotPresent',ports:[{name:'http',containerPort:8080}],securityContext:{allowPrivilegeEscalation:false,readOnlyRootFilesystem:true,capabilities:{drop:['ALL']}},resources:{requests:{cpu:'25m',memory:'32Mi'},limits:{cpu:'500m',memory:'192Mi'}},readinessProbe:{...probe,periodSeconds:5},livenessProbe:{...probe,initialDelaySeconds:5,periodSeconds:10},volumeMounts:[{name:'tmp',mountPath:'/tmp'}]}],volumes:[{name:'tmp',emptyDir:{sizeLimit:'64Mi'}}]};
 if(c.imagePullSecret)pod.imagePullSecrets=[{name:c.imagePullSecret}];
 const items=[{apiVersion:'apps/v1',kind:'Deployment',metadata,spec:{replicas:2,revisionHistoryLimit:3,strategy:{type:'RollingUpdate',rollingUpdate:{maxUnavailable:0,maxSurge:1}},selector:{matchLabels:{'app.kubernetes.io/name':'remastered'}},template:{metadata:{labels},spec:pod}}},{apiVersion:'v1',kind:'Service',metadata,spec:{type:'ClusterIP',selector:{'app.kubernetes.io/name':'remastered'},ports:[{name:'http',port:80,targetPort:'http'}]}}];
 if(c.expose)items.push({apiVersion:'networking.k8s.io/v1',kind:'Ingress',metadata:{...metadata,...(c.ingressController==='traefik'?{annotations:{'traefik.ingress.kubernetes.io/router.tls':'true','traefik.ingress.kubernetes.io/router.entrypoints':c.httpsEntrypoint}}:{})},spec:{ingressClassName:c.ingressClass,tls:[{hosts:[c.host],secretName:c.tlsSecret}],rules:[{host:c.host,http:{paths:[{path:'/',pathType:'Prefix',backend:{service:{name:'remastered',port:{number:80}}}}]}}]}});
 return{apiVersion:'v1',kind:'List',items};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{if(process.argv.length!==3)throw Error('Usage: node deploy/render.mjs deploy/config.local.json > /tmp/remastered.json');console.log(JSON.stringify(render(JSON.parse(await readFile(process.argv[2],'utf8'))),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
