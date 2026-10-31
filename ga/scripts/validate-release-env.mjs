const image=process.env.IMAGE||'',base=process.env.NGINX_IMAGE||'';
if(!/^ghcr\.io\/[a-z0-9._-]+\/[a-z0-9._/-]+$/.test(image)||image.includes('..')||image==='ghcr.io/michalmedvecky/pre2-web')throw Error('Set repository variable GA_IMAGE_REPOSITORY to a separate lowercase GHCR Golden Axe repository (no tag).');
if(!/^(nginx|docker\.io\/library\/nginx)(:[A-Za-z0-9._-]+)?@sha256:[0-9a-f]{64}$/.test(base))throw Error('Set repository variable GA_NGINX_IMAGE to the official multiarch nginx image pinned by sha256 digest.');
console.log('Validated explicit separate Golden Axe image repository and immutable official nginx base.');
