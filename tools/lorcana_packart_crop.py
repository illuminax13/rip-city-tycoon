from PIL import Image, ImageOps
import numpy as np, sys, os, json
OUT='/tmp/lor/crops'
def mask(im):
    if im.mode in('RGBA','LA','P'):
        a=np.array(im.convert('RGBA'))[:,:,3]
        if a.min()<10: return a>40
    rgb=np.array(im.convert('RGB')).astype(int)
    corners=[rgb[2,2],rgb[2,-3],rgb[-3,2],rgb[-3,-3]]
    bg=np.median(corners,axis=0)
    return np.abs(rgb-bg).sum(2)>45
def segs(m,n):
    H,W=m.shape
    col=m.sum(0)>H*0.03
    runs=[];s=None
    for x,v in enumerate(list(col)+[False]):
        if v and s is None:s=x
        if not v and s is not None:runs.append([s,x]);s=None
    # merge small gaps
    mr=[]
    for r in runs:
        if mr and r[0]-mr[-1][1]<4: mr[-1][1]=r[1]
        else: mr.append(r)
    mr=[r for r in mr if r[1]-r[0]>W/(n*3)]
    if len(mr)!=n:
        xs=np.where(col)[0];a,b=xs[0],xs[-1]+1;w=(b-a)/n
        mr=[[int(a+i*w),int(a+(i+1)*w)] for i in range(n)]
    out=[]
    for a,b in mr:
        rows=np.where(m[:,a:b].sum(1)>(b-a)*0.05)[0]
        out.append((a,int(rows[0]),b,int(rows[-1])+1))
    return out
def run(src,n,dex,names):
    im=Image.open(src);m=mask(im)
    os.makedirs(f'{OUT}/{dex}',exist_ok=True)
    rgb=im.convert('RGBA');bgc=(255,255,255)
    res=[]
    for (a,t,b,bt),nm in zip(segs(m,n),names):
        c=rgb.crop((a,t,b,bt));flat=Image.new('RGB',c.size,bgc);flat.paste(c,mask=c.split()[3])
        size=(768,1344) if c.size[0]>=420 else (512,896)
        f=ImageOps.fit(flat,size,Image.LANCZOS,centering=(0.5,0.5))
        f.save(f'{OUT}/{dex}/{nm}.webp',quality=86,method=6);f.save(f'{OUT}/{dex}/{nm}.jpg',quality=86)
        res.append((nm,c.size,size))
    print(dex,res)
if __name__=='__main__':
    for job in json.load(open(sys.argv[1])): run(*job)
