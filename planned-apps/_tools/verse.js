// node verse.js "psalms 24:1" "proverbs 3:5-6" ... -> JSON {ref:text}
const fs=require('fs'),path=require('path');const dir='/home/user/build/web/package/json';
const out={};
for(const ref of process.argv.slice(2)){
  const m=ref.match(/^(.+?) (\d+):(\d+)(?:-(\d+))?$/); const [_,book,ch,v1,v2]=m;
  const data=JSON.parse(fs.readFileSync(path.join(dir,book.replace(/ /g,'').toLowerCase()+'.json')));
  const parts=data.filter(x=>x.chapterNumber==+ch&&x.verseNumber>=+v1&&x.verseNumber<=+(v2||v1)&&x.value);
  out[ref]=parts.map(x=>x.value.trim()).join(' ').replace(/\s+/g,' ').trim();
}
console.log(JSON.stringify(out,null,1));
