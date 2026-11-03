import json,urllib.request,io,os,re,concurrent.futures as cf
from PIL import Image,ImageChops
U='Mozilla/5.0 packsim'
P=json.load(open('packinfo.json'));sel,info=P['sel'],P['info']
OUT='/workspace/pokemon-packs/assets/packs'
def get(u):return urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':U}),timeout=60).read()
def slug(t):
    k=t.rsplit('.',1)[0].split('Booster')[-1].strip().replace(' copy','')
    return re.sub(r'[^a-z0-9]+','-',k.lower()).strip('-') or 'pack'
def proc(job):
    dex,t=job
    try:
        im=Image.open(io.BytesIO(get(info[t][0])))
        if im.mode in('RGBA','LA','P'):
            im=im.convert('RGBA');bb=im.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox();im=im.crop(bb)
            bg=Image.new('RGBA',im.size,(200,200,205,255));bg.alpha_composite(im);im=bg.convert('RGB')
        else:
            im=im.convert('RGB');c=im.getpixel((1,1))
            if min(c)>225:
                diff=ImageChops.difference(im,Image.new('RGB',im.size,c)).convert('L').point(lambda v:255 if v>28 else 0);bb=diff.getbbox()
                if bb and (bb[2]-bb[0])>im.size[0]*.6:im=im.crop(bb)
        w,h=im.size;k=slug(t);os.makedirs(f'{OUT}/{dex}/t',exist_ok=True)
        im.resize((512,896),Image.LANCZOS).save(f'{OUT}/{dex}/{k}.webp',quality=84,method=6)
        im.resize((240,420),Image.LANCZOS).save(f'{OUT}/{dex}/t/{k}.webp',quality=80,method=6)
        return dex,k,w,h,None
    except Exception as e:return dex,slug(t),0,0,str(e)
jobs=[]
for dex,ts in sel.items():
    ts=[t for t in ts if t in info]
    hs=[info[t][2] for t in ts]
    keep=[t for t in ts if not(info[t][2]<300 and max(hs)>=500)] or ts
    jobs+=[(dex,t) for t in keep]
with cf.ThreadPoolExecutor(10) as ex:R=list(ex.map(proc,jobs))
art={};low={}
for dex,k,w,h,err in R:
    if err:print('ERR',dex,k,err);continue
    art.setdefault(dex,[]).append(f'assets/packs/{dex}/{k}.webp')
    if h<600:low.setdefault(dex,[]).append(f'{k} {w}x{h}')
json.dump({'art':art,'low':low},open('packout.json','w'),indent=0)
print('done',len(R),sum(len(v) for v in art.values()),'lowsets',len(low))
