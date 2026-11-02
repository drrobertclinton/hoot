const days=require('/home/user/build/src-devotional/days.src.js');const {execFileSync}=require('child_process');
const v=JSON.parse(execFileSync('node',['/home/user/build/tools/verse.js',...days.map(d=>d.ref)]));
const bal=t=>{const o=(t.match(/“/g)||[]).length,c=(t.match(/”/g)||[]).length;if(o>c&&t.startsWith('“'))return t.slice(1);if(c>o&&t.endsWith('”'))t=t.slice(0,-1);if(o>c&&!t.startsWith('“'))t+='”';return t.replace(/^for /,'For ').replace(/;$/,'.')};
const out=days.map((d,i)=>({day:i+1,week:d.week,title:d.title,ref:d.show,verse:bal(v[d.ref]),thought:d.thought,act:d.act,ask:d.ask}));
require('fs').writeFileSync('/home/user/build/devotional/days.js','window.DAYS='+JSON.stringify(out)+';\n');
console.log(out.map(d=>d.day+' '+d.ref+' | '+d.verse.slice(0,40)+'…'+d.verse.slice(-12)).join('\n'));
