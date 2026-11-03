import json,urllib.request,io,concurrent.futures as cf
from PIL import Image
exec(open('master.py').read())
U='Mozilla/5.0 packsim';O='/workspace/pokemon-packs/assets/logos/'
def get(u):return urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':U}),timeout=40).read()
def do(t):
    dex,ptcg=t[0],t[2]
    r=json.load(open(f'raw/{dex}.json'));us=[]
    if r.get('logo'):us.append(r['logo']+'.png')
    us.append(f'https://images.pokemontcg.io/{ptcg}/logo.png')
    for u in us:
        try:
            im=Image.open(io.BytesIO(get(u))).convert('RGBA');im=im.crop(im.getchannel('A').getbbox())
            im.thumbnail((780,300),Image.LANCZOS);c=Image.new('RGBA',(800,320));c.paste(im,((800-im.width)//2,(320-im.height)//2))
            c.resize((640,256),Image.LANCZOS).save(O+dex+'.webp',quality=88,method=6)
            c.resize((480,192),Image.LANCZOS).save(O+dex+'-480.webp',quality=86,method=6)
            return dex,u
        except Exception as e:pass
    return dex,None
with cf.ThreadPoolExecutor(10) as ex:R=list(ex.map(do,M))
print([r for r in R if not r[1]]);print(sum(1 for r in R if r[1] and 'pokemontcg' in r[1]),'from ptcg')
