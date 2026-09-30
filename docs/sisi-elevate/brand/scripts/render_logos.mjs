// Render every SVG logo candidate onto burgundy (#27060f) and white, plus the Logo.astro glyph, into brand/logo-sheet.png
import sharp from '/home/user/sisi-tools/node_modules/sharp/dist/index.mjs';
import fs from 'fs';
const R='/home/user/sisi-elevate';
const OUT=R+'/docs/sisi-elevate/brand';
const astro=fs.readFileSync(R+'/src/components/Logo.astro','utf8');
const svgInline=astro.split('---')[2].trim().replace('overflow="visible" aria-hidden="true"','width="68" height="60"');
const items={
 'Logo.astro (cream, 68x60 viewBox)':Buffer.from(svgInline),
 'favicon.svg (64x64)':fs.readFileSync(R+'/public/favicon.svg'),
 'images/argeH1T4 (cream 344x305)':fs.readFileSync(R+'/public/framerusercontent.com/images/argeH1T4CGYsbX3NA43DW7XvkY.svg'),
 'images/rs7i8J5t (black 64x64)':fs.readFileSync(R+'/public/framerusercontent.com/images/rs7i8J5taDJCK8S9G7qt4Zdnc0.svg'),
 'images/zWC85W1E (white 1080x1080)':fs.readFileSync(R+'/public/framerusercontent.com/images/zWC85W1EXdyaKh1ICMkATnJE.svg'),
};
const cells=[];
let x=0;
const W=300,H=300;
const comps=[];
let i=0;
for(const [name,buf] of Object.entries(items)){
  for(const [bgi,bg] of [['burgundy','#27060f'],['white','#ffffff']]){
    const png=await sharp(buf,{density:300}).resize(240,240,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
    const cell=await sharp({create:{width:W,height:H,channels:4,background:bg}}).composite([{input:png,left:30,top:30}]).png().toBuffer();
    comps.push({input:cell,left:i*W,top:bgi==='burgundy'?0:H});
    if(bgi==='white') i++;
  }
  const m=await sharp(buf,{density:72}).metadata();
  console.log(name,m.width+'x'+m.height,m.format);
}
await sharp({create:{width:W*i,height:H*2,channels:4,background:'#888'}}).composite(comps).png().toFile(OUT+'/logo-sheet.png');
