import sys,re,os,shutil
src,dst=sys.argv[1],sys.argv[2]
shutil.rmtree(dst,ignore_errors=True); shutil.copytree(src,dst,ignore=shutil.ignore_patterns('sw.js','manifest.json','*.png'))
h=open(src+'/index.html').read().replace('../shared/','')
if not os.path.exists(dst+'/core.css'):
    shutil.copy('/home/user/build/shared/core.css',dst); shutil.copy('/home/user/build/shared/core.js',dst)
h=re.sub(r'<!doctype html>\s*<html[^>]*>\s*<head>','',h,flags=re.I)
h=re.sub(r'<meta charset[^>]*>\s*<meta name="viewport"[^>]*>','',h)
h=re.sub(r'<link rel="(manifest|apple-touch-icon)"[^>]*>','',h)
h=h.replace('</head>','').replace('<body>','').replace('</body>','').replace('</html>','')
open(dst+'/index.html','w').write(h.strip()+'\n')
