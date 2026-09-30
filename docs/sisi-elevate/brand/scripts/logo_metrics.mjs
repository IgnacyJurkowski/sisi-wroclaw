// Render Logo.astro glyph and images/argeH1 (with tagline) at 20x, report tight bbox in viewBox units, stem width, and ratios.
import sharp from '/home/user/sisi-tools/node_modules/sharp/dist/index.mjs';
import fs from 'fs';
const R='/home/user/sisi-elevate';
const astro=fs.readFileSync(R+'/src/components/Logo.astro','utf8');
const svg=astro.split('---')[2].trim().replace('overflow="visible" aria-hidden="true"','width="1360" height="1200"');
const cases={'Logo.astro 68x60':[Buffer.from(svg),68,60],'argeH1 344x305':[fs.readFileSync(R+'/public/framerusercontent.com/images/argeH1T4CGYsbX3NA43DW7XvkY.svg'),344,305],'favicon.svg 64':[fs.readFileSync(R+'/public/favicon.svg'),64,64]};
for(const [k,[buf,w,h]] of Object.entries(cases)){
  const {data,info}=await sharp(buf,{density:k.startsWith('Logo')?72:1440}).resize(w*20,h*20).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let minx=1e9,miny=1e9,maxx=-1,maxy=-1; const bgR=data[0],bgG=data[1],bgB=data[2];
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4;
    const isInk = k.startsWith('favicon') ? (data[i]>150) : data[i+3]>128;
    if(isInk){if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;}}
  console.log(k,'bbox(px/20 => viewBox units): x',(minx/20).toFixed(2),'-',((maxx+1)/20).toFixed(2),' y',(miny/20).toFixed(2),'-',((maxy+1)/20).toFixed(2),' -> glyph w',((maxx-minx+1)/20).toFixed(2),'h',((maxy-miny+1)/20).toFixed(2),'of viewBox',w,'x',h);
}
