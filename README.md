# Mapa de Lotes

Plataforma web para mostrar planos de condominios con sus lotes. Al tocar un lote
se ve su ficha: estado, área, perímetro, medidas, precio al contado y un
**simulador de crédito** (inicial, plazo, cuota, intereses). La ficha se descarga
como **cotización en PDF** y el plano completo también. Todos los condominios
comparten el mismo estilo, cada uno tiene su propia pestaña y usa una **marca**
(WAKA, Ecoraiz…) con su color y su fondo.

Hay dos páginas:

| Página | Para quién | Qué hace |
| --- | --- | --- |
| `index.html` | Visitantes de la web | Plano interactivo, lista de lotes disponibles y ficha de cada lote. |
| `editor.html` | Tú | Dibujar y editar planos, cambiar estados y precios, crear condominios nuevos. |

No necesita servidor ni base de datos: son archivos estáticos. Funciona abriendo
`index.html` con doble clic o publicándolo en GitHub Pages.

## Estructura

```
index.html              visor público
editor.html             editor de planos
data/condominios.js     TODOS los datos (condominios, lotes, vías, precios…)
assets/js/plano.js      dibujo del plano (compartido: mismo estilo en todo)
assets/js/visor.js      lógica del visor
assets/js/editor.js     lógica del editor
assets/css/estilo.css   estilos
assets/img/             fondos de las marcas e imágenes para calcar
```

## Publicar la web con GitHub Pages

1. Une esta rama con `main` (o la rama que quieras publicar).
2. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**,
   elige `main` y la carpeta `/ (root)`.
3. En uno o dos minutos la web queda en `https://<tu-usuario>.github.io/<repositorio>/`.

### Ponerlo dentro de otra página web

Con un enlace directo a un condominio:

```
https://<tu-usuario>.github.io/<repositorio>/#la-finca
```

O incrustado (sin cabecera ni pie) con un `iframe`:

```html
<iframe src="https://<tu-usuario>.github.io/<repositorio>/?embed#la-finca"
        style="width:100%;height:900px;border:0" loading="lazy"></iframe>
```

## Cómo editar

1. Abre `editor.html`.
2. Haz los cambios. Se guardan solos en tu navegador (borrador).
3. **Vista previa** abre la web con tu borrador para revisarla.
4. **Publicar cambios** descarga `condominios.js`. Súbelo a la carpeta `data/`
   del repositorio reemplazando el anterior (en GitHub: *Add file → Upload files*).

> El borrador vive solo en el navegador donde editas. Si cambias de computadora,
> publica primero o usa **Importar** con el archivo `condominios.js`.

### Herramientas y atajos

| Herramienta | Tecla | Uso |
| --- | --- | --- |
| Mover | `V` | Clic para seleccionar; arrastra la forma o sus puntos azules. |
| Vista | `H` o mantener `Espacio` | Arrastra para desplazarte. La rueda del ratón acerca y aleja. |
| Lote | `L` | Clic en cada esquina; termina con `Enter`, doble clic o clic en el primer punto. |
| Vía | `R` | Igual que lote. Para calles, pasajes o carretera (color editable). |
| Área | `A` | Áreas comunes (club, parque…). Su nombre se escribe dentro. |
| Terreno | `T` | Contorno del terreno; se pinta como seto verde. |
| Rotonda | `O` | Arrastra para dibujarla. |
| Texto | `X` | Clic donde va el texto. |

Más atajos: `Ctrl+Z` deshacer, `Ctrl+Y` rehacer, `Ctrl+D` duplicar,
`Supr` eliminar, flechas para mover fino (`Shift` = 10 unidades), `Esc` cancelar.
Las esquinas se pegan a esquinas y bordes cercanos para que los lotes vecinos
compartan borde; mantén `Alt` para evitarlo. Doble clic en un borde agrega un
punto; doble clic en un punto lo borra. El cuadrito azul de un lote mueve su texto.

### Crear otro condominio

1. En el editor: **+ Nuevo condominio**.
2. En el panel derecho, **Imagen para calcar → Cargar imagen…** con la foto del
   plano. Si el lienzo está vacío, se ajusta al tamaño de la imagen.
3. Dibuja el terreno (`T`), las vías (`R`), las áreas (`A`) y los lotes (`L`)
   encima de la foto. Luego oculta la foto y completa los datos de cada lote.
4. **Publicar cambios**.

Si quieres que la foto de referencia quede disponible en cualquier computadora,
súbela a `assets/img/` y pon esa ruta en el campo `referencia` del condominio.

## Precios y crédito

Cada lote tiene dos precios (se editan en su ficha del editor):

- **Precio al contado**: el que se muestra en la web.
- **Precio a crédito de lista**: referencia interna. Solo se usa para calcular
  si eliges esa base en la configuración del crédito.

La configuración del crédito es por condominio (editor → sin nada seleccionado →
**Precios y crédito**):

| Opción | Qué hace |
| --- | --- |
| El crédito se calcula sobre | *Precio al contado + intereses* (por defecto) o *Precio a crédito de lista*. |
| Tipo de interés | *Cuota fija con TEA* (sistema francés, como los bancos), *Interés simple anual* o *Sin intereses*. |
| Tasa anual general | TEA en %. Por defecto 10%. |
| Plazos | Los plazos que se ofrecen (12, 18, 20, 24…). Cada uno puede tener su propia tasa; vacía = la general, 0 = sin intereses. |
| Inicial sugerida / mínima | La sugerida aparece al abrir el simulador; si el cliente pone menos que la mínima, se le avisa. |
| Plazo máximo | Tope para el campo "Otro" plazo del simulador. |
| Precio por m² | Con "Aplicar a disponibles" calcula el precio al contado de cada lote disponible como área × precio por m², redondeado a la centena. |
| Validez de la cotización | Días que figura como válida la cotización en PDF. |

Fórmula con cuota fija: tasa mensual = (1 + TEA)^(1/12) − 1 y
cuota = saldo × i / (1 − (1 + i)^−n), donde saldo = precio − inicial.
Ejemplo: 37,000 al contado con 8,000 de inicial y TEA 10% da 24 cuotas de
US$ 1,332.44 (total US$ 39,978.56).

## PDF

- **Imagen para imprimir (PDF)**, encima del plano: solo el plano con el fondo,
  el nombre del condominio y el logo, a toda la hoja (A4 horizontal, sin márgenes
  ni tablas). Es el que se imprime o se manda como imagen.
- **Plano con precios (PDF)**: plano horizontal y tabla de lotes disponibles con
  su precio y su cuota de referencia.
- **Descargar cotización (PDF)**, en la ficha de un lote: datos del lote, su
  ubicación marcada en el plano, el plan de pago que se simuló y las demás opciones
  de plazo con la misma inicial.

Los dos abren la ventana de impresión del navegador: elige **Guardar como PDF**.
En el celular funciona igual (Compartir → Imprimir → Guardar PDF).

## Marcas (WAKA, Ecoraiz)

Las marcas están en `data/condominios.js` (`SITIO.marcas`) y cada condominio dice
cuál usa (`"marca": "waka"`). Cada marca tiene nombre, lema, color, logo opcional y
una imagen de fondo (el paisaje detrás del plano y de la página). Todo se cambia en
el editor → **Marca**, y ahí mismo se crean marcas nuevas.

Los fondos incluidos son `assets/img/fondo-waka.svg` (viñedo verde) y
`assets/img/fondo-ecoraiz.svg` (tonos tierra), y los logos `assets/img/logo-waka.svg`
y `assets/img/logo-ecoraiz.svg`. Esos logos son una versión dibujada para el sitio:
para usar el archivo oficial, súbelo a `assets/img/` y escribe su ruta en la marca.

Sobre el plano aparecen, como en los planos impresos, el nombre del condominio con
uvas (arriba a la izquierda) y el logo de la marca (abajo a la derecha). Se apagan
por condominio en el editor → Marca.

## Estados de los lotes

| Estado | Color |
| --- | --- |
| Disponible | verde |
| Separado | naranja |
| Reservado | azul |
| Vendido | rojo |
| No disponible | rojo (el mismo que vendido) |

Los estados y colores están en `assets/js/plano.js` (`ESTADOS`). En el mapa, los
lotes disponibles muestran número, área y perímetro (el precio solo aparece en la ficha
al tocar el lote); los demás, número y estado.

## Datos de La Finca

El plano se digitalizó desde la foto original (`assets/img/la-finca-referencia.webp`)
detectando cada lote por su color, así que las formas calzan con la foto.

- Verdes (disponibles) con precio: lotes 03, 11, 12, 16, 17, 18, 27, 28, 30 y 34.
  `precioContado` es el valor en azul de la lista y `precioCredito` el valor en verde.
- 16, 17 y 18 tienen 1000 m² y 150 ml.
- Los demás (26 lotes) están en rojo como *Vendido*.
- La foto tapa con "VENDIDO" el número de varios lotes; se numeraron siguiendo
  el orden del plano (01–11 a la izquierda de abajo hacia arriba, 12, 13–18 bajando,
  19–24 subiendo, 25, 26–35 a la derecha bajando). El lote junto al ingreso no
  tiene número en la foto: quedó como 36. Todo se corrige desde el editor.
- Las medidas de los lados se leyeron de los números pequeños de la foto. Verifícalas.
- Moneda: `US$`. Se cambia en el editor (campo *Moneda*).

**Importante:** todo lo que está en `data/condominios.js` es público cuando la web
está publicada, aunque el visor no lo muestre. Eso incluye `precioCredito` y
`responsable`. Si esos datos son privados, bórralos antes de publicar.
