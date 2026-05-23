from pathlib import Path
from PIL import Image, ImageOps

project = Path('/home/ubuntu/santorini')
source = Path('/home/ubuntu/upload/logo-amtrs.jpg')
public = project / 'public'
app = project / 'app'
public.mkdir(exist_ok=True)

# Arquivo original para uso no menu e em componentes.
menu_logo = public / 'logo-amtrs.jpg'

with Image.open(source) as img:
    img = img.convert('RGB')
    img.save(menu_logo, quality=92, optimize=True)

    # Favicon quadrado: usa recorte central, adequado à imagem fornecida.
    square = ImageOps.fit(img, (512, 512), method=Image.Resampling.LANCZOS, centering=(0.5, 0.45))
    square.save(public / 'logo-amtrs-icon.png', optimize=True)

    # Ícones em tamanhos comuns.
    for size in (16, 32, 48, 180, 192, 512):
        resized = square.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(public / f'logo-amtrs-{size}.png', optimize=True)

    # Favicon ICO para compatibilidade com Next/browser.
    # O Next/Turbopack exige frames PNG internos em RGBA para decodificar corretamente.
    icon_sizes = [(16, 16), (32, 32), (48, 48)]
    square.convert('RGBA').save(app / 'favicon.ico', sizes=icon_sizes)

print('Ativos gerados:')
for path in [menu_logo, public / 'logo-amtrs-icon.png', app / 'favicon.ico']:
    print(path)
