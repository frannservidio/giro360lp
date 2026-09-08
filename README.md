# Giro 360 — Portfolio de colaboraciones

Sitio estático (solo frontend) para que las marcas conozcan Giro 360 y se contacten.

## Estructura

```
Portfolio Giro 360/
├── index.html              # Página única
├── serve.py                # Servidor estático mínimo para ver en local
├── assets/
│   ├── css/styles.css      # Todos los estilos
│   ├── js/main.js          # Menú mobile, scroll-spy, aparición, fachada de videos, carga de fotos
│   └── img/
│       ├── logo-giro360.svg
│       ├── hero-estudio.jpg
│       ├── equipo/         # sofi/fran/thiago/carolina/santino .jpg (ver LEEME.txt)
│       ├── marcas/         # logos de marca en .png (ver LEEME.txt) — opcional
│       └── programa/       # 01.jpg … 05.jpg — galería "El programa en vivo"
└── README.md
```

Los originales full-res de las fotos están fuera del proyecto en
`../Giro360-fotos-originales/` (no se deployean).

## Ver en local

No necesita build:

- Abrir `index.html` en el navegador (doble clic), o
- `python serve.py` y entrar a http://127.0.0.1:8139

## Secciones (todo el texto está en `index.html`)

- **Hero + stats** — 0221comar es "el medio donde sale en vivo".
- **La audiencia** (`#audiencia`) — 4 números + barras de género y edad.
  Datos de Instagram (30 y 90 días). Actualizá los números en `index.html` y los
  `style="width:NN%"` de cada `.bar-row .bf`.
- **Sobre** (`#sobre`, nav "Nosotros") — texto + ficha de datos.
- **Segmentos** (`#segmentos`) — 3 tarjetas (`.segment.tec` / `.pol` / `.mus`).
- **El programa en vivo** (`#programa`) — galería bento de `assets/img/programa/01–05.jpg`.
  Cambiá una foto reemplazando el archivo con el mismo nombre.
- **Cómo trabajamos** (`#trabajamos`) — 3 pasos.
- **Marcas** (`#marcas`) — 12 tiles. Poné el logo de cada marca en
  `assets/img/marcas/` (nombres en su LEEME.txt). Sin archivo, la tarjeta muestra
  solo el nombre. Cada logo va sobre un recuadro blanco.
- **Casos en video** (`#casos`) — 15 reels de Instagram en fachada: la card carga
  el reel embebido al hacer clic. `data-url` = link del reel sin `?stkn`.
- **Testimonios** (`#testimonios`) — carrusel de mensajes. Flechas + swipe + auto-scroll
  al acercar el cursor a los bordes. Para sumar uno: duplicá un `.quote` dentro de `.qc-track`.
- **Equipo** (`#equipo`) — 5 personas, fotos en `assets/img/equipo/`.
- **Contacto** (`#contacto`) — email `giro360contacto@gmail.com` + DM
  `https://ig.me/m/giro360lp`.

## Cache de estilos/JS

`styles.css` y `main.js` se cargan con `?v=N` para evitar cache viejo al iterar.
Subí ese número cuando cambies esos archivos (o dejalo, no molesta en producción).

## Deploy (Vercel)

Repo: https://github.com/frannservidio/giro360lp

Sitio 100% estático, sin build ni backend. Una sola vez:

1. En vercel.com → **Add New → Project → Import** `frannservidio/giro360lp`.
2. Framework Preset: **Other**. Build Command y Output Directory: **vacíos**.
   Root Directory: `.`
3. **Deploy**.

Después, cada `git push` a `main` redeploya solo.

Para cambiar contenido: editás los archivos, `git add -A && git commit -m "..."
&& git push`. Ver en local con `python serve.py` antes de pushear.

## Pendientes

- Media kit PDF descargable.
- Grilla de formatos que una marca puede contratar.
- Logos de las marcas en `assets/img/marcas/`.
- Sumar seguidores de TikTok / YouTube / X a "La audiencia" (hoy solo Instagram).
- El logo es un PNG dentro de un SVG (export de Canva); para tamaños grandes
  conviene un vector real.
