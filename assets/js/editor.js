/*
 * editor.js — editor de planos.
 *
 * Todo cambio se guarda solo en este navegador (borrador). Para que la web
 * lo muestre, usa "Publicar cambios": descarga data/condominios.js y
 * reemplázalo en el repositorio.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clonar = (o) => JSON.parse(JSON.stringify(o));
  const redondear = (q) => [Math.round(q[0]), Math.round(q[1])];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  const svg = $('plano');
  const lienzo = $('lienzo');
  const props = $('propiedades');
  const POLIGONALES = ['lote', 'via', 'area', 'terreno'];
  const NOMBRES_TIPO = { lote: 'Lote', via: 'Vía', area: 'Área común', terreno: 'Terreno', rotonda: 'Rotonda', texto: 'Texto' };

  const PUBLICADO = {
    sitio: window.SITIO || { nombre: 'Mapa de Lotes' },
    condominios: window.CONDOMINIOS || []
  };

  const MARCAS_POR_DEFECTO = {
    waka: { nombre: 'WAKA', lema: 'Eco-Condominio', color: '#8c1d1d', fondo: 'assets/img/fondo-waka.svg', logo: 'assets/img/logo-waka.svg' },
    ecoraiz: { nombre: 'Ecoraiz', lema: 'Condominios ecológicos', color: '#7a4a26', fondo: 'assets/img/fondo-ecoraiz.svg', logo: 'assets/img/logo-ecoraiz.svg' }
  };
  function normalizar(d) {
    if (!d.sitio) d.sitio = { nombre: 'Mapa de Lotes' };
    if (!d.sitio.marcas || !Object.keys(d.sitio.marcas).length) d.sitio.marcas = clonar(MARCAS_POR_DEFECTO);
    d.condominios.forEach(Plano.normalizarCondominio);
    return d;
  }
  normalizar(PUBLICADO);

  let doc = normalizar(cargarBorrador() || clonar(PUBLICADO));
  if (!doc.condominios.length) doc.condominios.push(condominioVacio('Nuevo condominio', 1600, 1000, 'US$'));

  let condId = doc.condominios.some((c) => c.id === location.hash.slice(1)) ? location.hash.slice(1) : doc.condominios[0].id;
  let herr = 'seleccionar';
  let selId = null;
  let dibujo = null;     // { puntos: [], cursor: [x, y] }
  let arrastre = null;
  let iman = null;       // punto donde se pegó el cursor
  let espacio = false;
  let historial = [];
  let futuro = [];
  const refs = {};       // imagen de referencia por condominio (solo en este navegador)
  let vista = null;

  const cond = () => doc.condominios.find((c) => c.id === condId);
  const forma = (id) => cond() && cond().formas.find((f) => f.id === id);

  /* ======================================================================
   * Borrador e historial
   * ==================================================================== */
  function cargarBorrador() {
    try {
      const b = JSON.parse(localStorage.getItem(Plano.CLAVE_BORRADOR));
      if (b && Array.isArray(b.condominios)) return b;
    } catch (e) { /* sin borrador */ }
    return null;
  }

  let temporizador = null;
  function guardar() {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      try {
        if (hayCambios()) localStorage.setItem(Plano.CLAVE_BORRADOR, JSON.stringify(doc));
        else localStorage.removeItem(Plano.CLAVE_BORRADOR);
      } catch (e) {
        avisar('Este navegador no permite guardar el borrador. Publica los cambios antes de cerrar.');
      }
      $('avisoBorrador').hidden = !hayCambios();
    }, 200);
  }
  function hayCambios() { return JSON.stringify(doc) !== JSON.stringify(PUBLICADO); }

  function instantanea() {
    historial.push(JSON.stringify(doc));
    if (historial.length > 150) historial.shift();
    futuro = [];
    botonesHistorial();
  }
  function restaurar(json) {
    doc = JSON.parse(json);
    if (!cond()) condId = doc.condominios[0].id;
    if (selId && !forma(selId)) selId = null;
    dibujo = null;
    guardar();
    todo();
  }
  function deshacer() {
    if (!historial.length) return;
    futuro.push(JSON.stringify(doc));
    restaurar(historial.pop());
    botonesHistorial();
  }
  function rehacer() {
    if (!futuro.length) return;
    historial.push(JSON.stringify(doc));
    restaurar(futuro.pop());
    botonesHistorial();
  }
  function botonesHistorial() {
    $('btnDeshacer').disabled = !historial.length;
    $('btnRehacer').disabled = !futuro.length;
  }

  /* ======================================================================
   * Utilidades de interfaz
   * ==================================================================== */
  function el(tag, clase, texto) {
    const n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }
  function boton(texto, alClic, clase) {
    const b = el('button', 'btn' + (clase ? ' ' + clase : ''), texto);
    b.type = 'button';
    b.addEventListener('click', alClic);
    return b;
  }

  let tAviso = null;
  function avisar(msg) {
    const a = $('aviso');
    a.textContent = msg;
    a.hidden = false;
    clearTimeout(tAviso);
    tAviso = setTimeout(() => { a.hidden = true; }, 2600);
  }

  /* Ventana modal. construir(cuerpo, pie, cerrar) arma el contenido. */
  function modal(construir) {
    const d = $('modal');
    d.replaceChildren();
    const cuerpo = el('div', 'modal-cuerpo');
    const pie = el('div', 'modal-pie');
    d.append(cuerpo, pie);
    return new Promise((resolver) => {
      const cerrar = (valor) => { d.close(); resolver(valor); };
      d.onclose = () => resolver(undefined);
      construir(cuerpo, pie, cerrar);
      d.showModal();
    });
  }
  function confirmar(titulo, texto, textoBoton, peligro) {
    return modal((cuerpo, pie, cerrar) => {
      cuerpo.append(el('h2', null, titulo), el('p', null, texto));
      pie.append(boton('Cancelar', () => cerrar(false)), boton(textoBoton || 'Aceptar', () => cerrar(true), peligro ? 'btn-primario btn-peligro' : 'btn-primario'));
    }).then((v) => v === true);
  }

  function descargar(nombre, contenido, tipo) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    a.download = nombre;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function copiar(texto, respaldo) {
    const hecho = () => avisar('Copiado al portapapeles');
    try {
      navigator.clipboard.writeText(texto).then(hecho, () => { if (respaldo) { respaldo.select(); avisar('Selecciona y copia con Ctrl+C'); } });
    } catch (e) {
      if (respaldo) { respaldo.select(); avisar('Selecciona y copia con Ctrl+C'); }
    }
  }

  /* ======================================================================
   * Archivo de datos (data/condominios.js)
   * ==================================================================== */
  function json(v) {
    if (Array.isArray(v)) return '[' + v.map(json).join(', ') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ': ' + json(v[k])).join(', ') + '}';
    }
    return JSON.stringify(v);
  }
  function ordenarForma(f) {
    const { puntos, ...resto } = f;
    return puntos ? { ...resto, puntos } : resto;
  }
  function serializar(d) {
    const conds = d.condominios.map((c) => {
      const partes = Object.keys(c).filter((k) => k !== 'formas' && c[k] !== undefined).map((k) => '    ' + JSON.stringify(k) + ': ' + json(c[k]));
      partes.push('    "formas": [\n' + c.formas.map((f) => '      ' + json(ordenarForma(f))).join(',\n') + '\n    ]');
      return '  {\n' + partes.join(',\n') + '\n  }';
    });
    return [
      '/*',
      ' * Datos de los condominios que muestra el sitio.',
      ' * Este archivo lo genera el editor (editor.html → "Publicar cambios").',
      ' * Puedes editarlo a mano: cada forma del plano ocupa una línea.',
      ' */',
      'window.SITIO = ' + json(d.sitio || {}) + ';',
      '',
      'window.CONDOMINIOS = [',
      conds.join(',\n'),
      '];',
      ''
    ].join('\n');
  }

  function leerArchivo(txt) {
    txt = txt.trim();
    if (txt.startsWith('{') || txt.startsWith('[')) return JSON.parse(txt);
    const mC = txt.match(/window\.CONDOMINIOS\s*=\s*(\[[\s\S]*\])\s*;?\s*$/);
    if (!mC) throw new Error('No encontré window.CONDOMINIOS en el archivo.');
    const mS = txt.match(/window\.SITIO\s*=\s*(\{[\s\S]*?\})\s*;/);
    return { sitio: mS ? JSON.parse(mS[1]) : undefined, condominios: JSON.parse(mC[1]) };
  }
  function esCondominio(c) {
    return c && typeof c.id === 'string' && c.lienzo && Array.isArray(c.formas);
  }

  /* ======================================================================
   * Condominios
   * ==================================================================== */
  function slug(texto) {
    const base = String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'condominio';
    let id = base, n = 2;
    while (doc && doc.condominios.some((c) => c.id === id)) id = base + '-' + n++;
    return id;
  }
  // condominio abierto, o null si aún no hay ninguno (al arrancar sin datos)
  function actual() { try { return cond(); } catch (e) { return null; } }
  function condominioVacio(nombre, ancho, alto, moneda) {
    return {
      id: slug(nombre), nombre, ubicacion: '', descripcion: '',
      moneda: moneda || 'US$', whatsapp: '',
      marca: (actual() && actual().marca) || 'waka',
      financiamiento: clonar((actual() && actual().financiamiento) || Plano.financiamientoPorDefecto()),
      lienzo: { ancho, alto }, formas: []
    };
  }
  function nuevoId(tipo) {
    let id;
    do { id = tipo + '-' + Math.random().toString(36).slice(2, 7); } while (forma(id));
    return id;
  }
  function siguienteNumero() {
    const nums = cond().formas.filter((f) => f.tipo === 'lote').map((f) => parseInt(f.numero, 10)).filter((n) => !isNaN(n));
    const n = nums.length ? Math.max(...nums) + 1 : 1;
    return String(n).padStart(2, '0');
  }

  function elegirCondominio(id) {
    condId = id;
    selId = null;
    dibujo = null;
    history.replaceState(null, '', '#' + id);
    cargarReferenciaLocal(id);
    encuadrar();
    todo();
  }

  function nuevoCondominio() {
    modal((cuerpo, pie, cerrar) => {
      cuerpo.append(el('h2', null, 'Nuevo condominio'),
        el('p', 'ayuda', 'Se abre en una pestaña nueva con el lienzo vacío. Luego puedes cargar una foto del plano para calcarla.'));
      const r = el('div', 'rejilla');
      const nombre = campoSimple(r, 'Nombre', 'nuevo-nombre', 'text', '', true);
      const ancho = campoSimple(r, 'Ancho del lienzo', 'nuevo-ancho', 'number', 1600);
      const alto = campoSimple(r, 'Alto del lienzo', 'nuevo-alto', 'number', 1000);
      cuerpo.append(r);
      pie.append(boton('Cancelar', () => cerrar()), boton('Crear', () => {
        const nom = nombre.value.trim();
        if (!nom) { nombre.focus(); return; }
        instantanea();
        const c = condominioVacio(nom, Math.max(200, +ancho.value || 1600), Math.max(200, +alto.value || 1000), cond().moneda);
        doc.condominios.push(c);
        guardar();
        cerrar();
        elegirCondominio(c.id);
        ponerHerr('terreno');
        avisar('Condominio creado. Dibuja el contorno del terreno o carga una imagen de referencia.');
      }, 'btn-primario'));
      setTimeout(() => nombre.focus(), 30);
    });
  }
  function campoSimple(padre, etiqueta, id, tipo, valor, ancho) {
    const l = el('label', 'campo' + (ancho ? ' ancho' : ''), etiqueta);
    const i = el('input');
    i.type = tipo; i.id = id; i.value = valor;
    l.append(i);
    padre.append(l);
    return i;
  }

  /* ======================================================================
   * Imagen de referencia (se guarda en IndexedDB de este navegador)
   * ==================================================================== */
  const RefDB = (() => {
    let promesa = null;
    function abrir() {
      if (!promesa) {
        promesa = new Promise((res, rej) => {
          const r = indexedDB.open('planos-lotes', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('referencias');
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
      }
      return promesa;
    }
    async function operar(modo, fn) {
      const db = await abrir();
      return new Promise((res, rej) => {
        const t = db.transaction('referencias', modo);
        const peticion = fn(t.objectStore('referencias'));
        t.oncomplete = () => res(peticion && peticion.result);
        t.onerror = () => rej(t.error);
      });
    }
    return {
      guardar: (id, blob) => operar('readwrite', (s) => s.put(blob, id)),
      leer: (id) => operar('readonly', (s) => s.get(id)),
      borrar: (id) => operar('readwrite', (s) => s.delete(id))
    };
  })();

  function ref(id) {
    if (!refs[id]) refs[id] = { visible: false, opacidad: 0.5, local: null, leido: false };
    return refs[id];
  }
  function cargarReferenciaLocal(id) {
    const r = ref(id);
    if (r.leido) return;
    r.leido = true;
    RefDB.leer(id).then((blob) => {
      if (blob) { r.local = URL.createObjectURL(blob); if (id === condId) { render(); pintarProps(); } }
    }).catch(() => {});
  }
  function subirReferencia(archivo) {
    const c = cond(), r = ref(c.id);
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      if (!c.formas.length) {
        // lienzo vacío: se ajusta al tamaño de la imagen para calcar 1:1
        const k = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
        instantanea();
        c.lienzo = { ancho: Math.round(img.naturalWidth * k), alto: Math.round(img.naturalHeight * k) };
        guardar();
        encuadrar();
      }
      if (r.local) URL.revokeObjectURL(r.local);
      r.local = url;
      r.visible = true;
      RefDB.guardar(c.id, archivo).catch(() => avisar('La imagen se usará solo mientras esta página esté abierta.'));
      render();
      pintarProps();
    };
    img.onerror = () => avisar('No se pudo leer esa imagen.');
    img.src = url;
  }

  /* ======================================================================
   * Dibujo del plano y superposiciones del editor
   * ==================================================================== */
  function encuadrar() {
    const c = cond();
    const m = 20;
    const base = { x: -m, y: -m, w: c.lienzo.ancho + 2 * m, h: c.lienzo.alto + 2 * m };
    if (vista) vista.reiniciar(base); else vista = new Plano.Vista(svg, base);
  }

  function render() {
    const c = cond();
    Plano.aplicarMarca(doc.sitio, c);
    const r = ref(c.id);
    const src = r.local || c.referencia;
    const { capas, nodos } = Plano.dibujar(svg, c, {
      mantenerVista: true,
      seleccionado: selId,
      referencia: r.visible && src ? { src, opacidad: r.opacidad } : null
    });
    // borde del lienzo
    Plano.crear('rect', {
      x: 0, y: 0, width: c.lienzo.ancho, height: c.lienzo.alto, fill: 'none',
      stroke: 'rgb(0 0 0 / 25%)', 'stroke-dasharray': '6 6', 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none'
    }, capas.referencia);
    if (herr === 'seleccionar') nodos.forEach((g) => g.classList.add('forma-editable'));
    superposiciones(capas.extra, nodos);
  }

  function superposiciones(capa, nodos) {
    const s = vista.escala() || 1;
    const R = 5.5 / s;
    const f = selId && forma(selId);
    if (f) {
      if (f.puntos) {
        Plano.crear('polygon', { points: Plano.ptsStr(f.puntos), class: 'contorno-sel' }, capa);
        f.puntos.forEach((q, i) => Plano.crear('circle', { cx: q[0], cy: q[1], r: R, class: 'manija', 'data-manija': 'v' + i }, capa));
        if (f.tipo === 'lote') {
          const c = Plano.centroide(f.puntos);
          const e = f.etiqueta || {};
          const L = 7 / s;
          Plano.crear('rect', { x: c[0] + (e.dx || 0) - L / 2, y: c[1] + (e.dy || 0) - L / 2, width: L, height: L, class: 'manija-etiqueta', 'data-manija': 'etq' }, capa)
            .appendChild(Plano.crear('title')).textContent = 'Arrastra para mover el texto del lote';
        }
      } else if (f.tipo === 'rotonda') {
        Plano.crear('ellipse', { cx: f.cx, cy: f.cy, rx: f.rx, ry: f.ry, class: 'contorno-sel' }, capa);
        Plano.crear('circle', { cx: f.cx + f.rx, cy: f.cy, r: R, class: 'manija', 'data-manija': 'rx' }, capa);
        Plano.crear('circle', { cx: f.cx, cy: f.cy + f.ry, r: R, class: 'manija', 'data-manija': 'ry' }, capa);
      } else if (f.tipo === 'texto') {
        const g = nodos.get(f.id);
        try {
          const b = g.getBBox();
          const m = 4 / s;
          Plano.crear('rect', { x: b.x - m, y: b.y - m, width: b.width + 2 * m, height: b.height + 2 * m, class: 'contorno-sel', transform: f.giro ? `rotate(${f.giro} ${f.x} ${f.y})` : null }, capa);
        } catch (e) { /* sin medidas todavía */ }
      }
    }
    if (dibujo) {
      const pts = dibujo.cursor ? dibujo.puntos.concat([dibujo.cursor]) : dibujo.puntos;
      if (pts.length > 1) Plano.crear(pts.length > 2 ? 'polygon' : 'polyline', { points: Plano.ptsStr(pts), class: 'previa' }, capa);
      dibujo.puntos.forEach((q, i) => Plano.crear('circle', { cx: q[0], cy: q[1], r: (i === 0 ? 1.5 : 1) * R, class: 'manija' }, capa));
    }
    if (arrastre && arrastre.tipo === 'rotonda' && arrastre.fin) {
      const e = elipseDe(arrastre.inicio, arrastre.fin);
      Plano.crear('ellipse', { cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry, class: 'previa' }, capa);
    }
    if (iman) Plano.crear('circle', { cx: iman[0], cy: iman[1], r: 9 / s, class: 'iman' }, capa);
  }

  function elipseDe(a, b) {
    return {
      cx: Math.round((a[0] + b[0]) / 2), cy: Math.round((a[1] + b[1]) / 2),
      rx: Math.max(3, Math.round(Math.abs(b[0] - a[0]) / 2)), ry: Math.max(3, Math.round(Math.abs(b[1] - a[1]) / 2))
    };
  }

  /* Imán: pega el cursor a esquinas y bordes cercanos. */
  function imantar(p, excluir) {
    const tol = 10 / (vista.escala() || 1);
    let mejor = null, dmin = tol;
    const candidatos = [];
    cond().formas.forEach((f) => { if (f.puntos) candidatos.push([f.id, f.puntos]); });
    if (dibujo) candidatos.push(['__dibujo', dibujo.puntos]);
    candidatos.forEach(([id, pts]) => pts.forEach((q, i) => {
      if (excluir && id === excluir.id && i === excluir.i) return;
      const d = dist(p, q);
      if (d < dmin) { dmin = d; mejor = q; }
    }));
    if (mejor) { iman = mejor.slice(); return mejor.slice(); }
    dmin = tol * 0.7;
    candidatos.forEach(([id, pts]) => {
      if (id === '__dibujo') return;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        if (excluir && id === excluir.id && (i === excluir.i || j === excluir.i)) continue;
        const pr = proyectar(p, pts[i], pts[j]);
        const d = dist(p, pr);
        if (d < dmin) { dmin = d; mejor = pr; }
      }
    });
    iman = mejor ? mejor.slice() : null;
    return mejor ? mejor.slice() : p;
  }
  function proyectar(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L = dx * dx + dy * dy;
    let t = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L : 0;
    t = Math.max(0, Math.min(1, t));
    return [a[0] + t * dx, a[1] + t * dy];
  }

  /* ======================================================================
   * Herramientas
   * ==================================================================== */
  const AYUDAS = {
    seleccionar: 'Clic en una forma para editarla; arrástrala para moverla. Arrastra los puntos azules para ajustar. <kbd>Doble clic</kbd> en un borde agrega un punto; en un punto, lo borra. Flechas: mover fino.',
    mano: 'Arrastra para mover la vista. Rueda del ratón: acercar o alejar.',
    poligono: 'Clic en cada esquina. Termina con <kbd>Enter</kbd>, doble clic o clic en el primer punto. <kbd>Retroceso</kbd> quita el último punto, <kbd>Esc</kbd> cancela. Las esquinas se pegan a las cercanas; mantén <kbd>Alt</kbd> para evitarlo.',
    rotonda: 'Arrastra para dibujar la rotonda.',
    texto: 'Haz clic donde quieras poner el texto.'
  };
  function ponerHerr(h) {
    herr = h;
    dibujo = null;
    iman = null;
    document.querySelectorAll('[data-herr]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.herr === h)));
    lienzo.classList.toggle('modo-mano', h === 'mano');
    lienzo.classList.toggle('modo-dibujo', POLIGONALES.includes(h) || h === 'rotonda' || h === 'texto');
    $('ayudaHerr').innerHTML = AYUDAS[POLIGONALES.includes(h) ? 'poligono' : h];
    render();
  }
  document.querySelectorAll('[data-herr]').forEach((b) => b.addEventListener('click', () => ponerHerr(b.dataset.herr)));

  function cerrarDibujo() {
    if (!dibujo) return;
    const pts = dibujo.puntos.filter((q, i, a) => i === 0 || dist(q, a[i - 1]) > 0.5).map(redondear);
    if (pts.length > 2 && dist(pts[0], pts[pts.length - 1]) < 0.5) pts.pop();
    if (pts.length < 3) { avisar('Marca al menos 3 esquinas.'); return; }
    const tipo = herr;
    let f = { id: nuevoId(tipo), tipo };
    if (tipo === 'lote') Object.assign(f, { id: nuevoId('lote'), numero: siguienteNumero(), estado: 'disponible', area: '', perimetro: '' });
    else f.nombre = tipo === 'via' ? 'Vía' : tipo === 'area' ? 'Área común' : 'Terreno';
    f.puntos = pts;
    instantanea();
    if (tipo === 'terreno') cond().formas.unshift(f); else cond().formas.push(f);
    dibujo = null;
    iman = null;
    selId = f.id;
    guardar();
    render();
    pintarProps();
  }

  function desplazar(f, orig, dx, dy) {
    if (orig.puntos) f.puntos = orig.puntos.map((q) => [Math.round(q[0] + dx), Math.round(q[1] + dy)]);
    if (orig.tipo === 'rotonda') { f.cx = Math.round(orig.cx + dx); f.cy = Math.round(orig.cy + dy); }
    if (orig.tipo === 'texto') { f.x = Math.round(orig.x + dx); f.y = Math.round(orig.y + dy); }
  }

  function duplicar() {
    const f = selId && forma(selId);
    if (!f) return;
    instantanea();
    const n = clonar(f);
    n.id = nuevoId(f.tipo);
    if (n.tipo === 'lote') n.numero = siguienteNumero();
    desplazar(n, f, 20, 20);
    cond().formas.push(n);
    selId = n.id;
    guardar();
    render();
    pintarProps();
  }

  function eliminar() {
    const f = selId && forma(selId);
    if (!f) return;
    instantanea();
    cond().formas = cond().formas.filter((x) => x.id !== f.id);
    selId = null;
    guardar();
    render();
    pintarProps();
    avisar(NOMBRES_TIPO[f.tipo] + ' eliminado. Ctrl+Z para deshacer.');
  }

  function seleccionar(id) {
    selId = id;
    render();
    pintarProps();
  }

  /* ======================================================================
   * Ratón / táctil sobre el plano
   * ==================================================================== */
  svg.addEventListener('pointerdown', (e) => {
    if (e.button === 1 || espacio || herr === 'mano') {
      e.preventDefault();
      arrastre = { tipo: 'pan', x: e.clientX, y: e.clientY };
      svg.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;
    const p = vista.aPlano(e.clientX, e.clientY);

    if (herr === 'seleccionar') {
      const man = e.target.closest('[data-manija]');
      if (man && selId) {
        arrastre = { tipo: 'manija', manija: man.dataset.manija, inicio: p, orig: clonar(forma(selId)), movido: false };
      } else {
        const g = e.target.closest('[data-id]');
        const f = g && forma(g.dataset.id);
        if (f && (f.tipo !== 'terreno' || selId === f.id)) {
          if (selId !== f.id) seleccionar(f.id);
          arrastre = { tipo: 'mover', inicio: p, orig: clonar(f), movido: false };
        } else {
          if (selId) seleccionar(null);
          arrastre = { tipo: 'pan', x: e.clientX, y: e.clientY };
        }
      }
      svg.setPointerCapture(e.pointerId);
      return;
    }

    if (POLIGONALES.includes(herr)) {
      const q = e.altKey ? p : imantar(p);
      if (!dibujo) dibujo = { puntos: [] };
      const tol = 10 / vista.escala();
      if (dibujo.puntos.length >= 3 && dist(q, dibujo.puntos[0]) < tol) { cerrarDibujo(); return; }
      const ult = dibujo.puntos[dibujo.puntos.length - 1];
      if (!ult || dist(ult, q) > 0.5) dibujo.puntos.push(q);
      dibujo.cursor = q;
      render();
      return;
    }

    if (herr === 'rotonda') {
      arrastre = { tipo: 'rotonda', inicio: p, fin: null };
      svg.setPointerCapture(e.pointerId);
      return;
    }

    if (herr === 'texto') {
      instantanea();
      const f = { id: nuevoId('texto'), tipo: 'texto', texto: 'TEXTO', x: Math.round(p[0]), y: Math.round(p[1]), tam: 14 };
      cond().formas.push(f);
      guardar();
      ponerHerr('seleccionar');
      seleccionar(f.id);
      // se enfoca después del clic, si no el navegador le quita el foco
      setTimeout(() => { const i = $('p-texto'); if (i) { i.focus(); i.select(); } }, 60);
    }
  });

  svg.addEventListener('pointermove', (e) => {
    const p = vista.aPlano(e.clientX, e.clientY);
    if (arrastre) {
      if (arrastre.tipo === 'pan') {
        vista.moverPx(e.clientX - arrastre.x, e.clientY - arrastre.y);
        arrastre.x = e.clientX; arrastre.y = e.clientY;
        if (selId) render();
        return;
      }
      const dx = p[0] - arrastre.inicio[0], dy = p[1] - arrastre.inicio[1];
      if (arrastre.tipo === 'rotonda') { arrastre.fin = p; render(); return; }
      const f = forma(selId);
      if (!f) return;
      if (!arrastre.movido) {
        if (Math.hypot(dx, dy) * vista.escala() < 3) return;
        instantanea();
        arrastre.movido = true;
      }
      if (arrastre.tipo === 'mover') {
        desplazar(f, arrastre.orig, dx, dy);
      } else if (arrastre.manija[0] === 'v') {
        const i = +arrastre.manija.slice(1);
        f.puntos[i] = redondear(e.altKey ? p : imantar(p, { id: f.id, i }));
      } else if (arrastre.manija === 'rx') {
        f.rx = Math.max(3, Math.round(Math.abs(p[0] - f.cx)));
      } else if (arrastre.manija === 'ry') {
        f.ry = Math.max(3, Math.round(Math.abs(p[1] - f.cy)));
      } else if (arrastre.manija === 'etq') {
        const o = arrastre.orig.etiqueta || {};
        f.etiqueta = { dx: Math.round((o.dx || 0) + dx), dy: Math.round((o.dy || 0) + dy) };
      }
      render();
      return;
    }
    if (dibujo) {
      dibujo.cursor = e.altKey ? p : imantar(p);
      render();
    } else if (POLIGONALES.includes(herr)) {
      const antes = iman;
      if (!e.altKey) imantar(p); else iman = null;
      if (antes !== iman) render();
    }
  });

  function soltar() {
    if (!arrastre) return;
    const a = arrastre;
    arrastre = null;
    iman = null;
    if (a.tipo === 'rotonda') {
      if (a.fin && dist(a.inicio, a.fin) * vista.escala() > 6) {
        instantanea();
        const f = Object.assign({ id: nuevoId('rotonda'), tipo: 'rotonda', nombre: 'Rotonda' }, elipseDe(a.inicio, a.fin));
        cond().formas.push(f);
        selId = f.id;
        guardar();
        pintarProps();
      }
      render();
      return;
    }
    // sin cambios no se redibuja: así el navegador puede detectar el doble clic
    if (a.movido) { guardar(); pintarProps(); render(); }
  }
  svg.addEventListener('pointerup', soltar);
  svg.addEventListener('pointercancel', soltar);

  svg.addEventListener('dblclick', (e) => {
    if (dibujo) { cerrarDibujo(); return; }
    if (herr !== 'seleccionar') return;
    const p = vista.aPlano(e.clientX, e.clientY);
    // con la captura del puntero el evento llega al <svg>; se busca qué hay debajo
    const debajo = document.elementFromPoint(e.clientX, e.clientY) || svg;
    const man = debajo.closest('[data-manija]');
    const f = selId && forma(selId);
    if (man && f && f.puntos && man.dataset.manija[0] === 'v') {
      if (f.puntos.length <= 3) { avisar('Una forma necesita al menos 3 puntos.'); return; }
      instantanea();
      f.puntos.splice(+man.dataset.manija.slice(1), 1);
      guardar(); render();
      return;
    }
    if (f && f.puntos) {
      const tol = 8 / vista.escala();
      let mejor = null;
      f.puntos.forEach((q, i) => {
        const pr = proyectar(p, q, f.puntos[(i + 1) % f.puntos.length]);
        const d = dist(p, pr);
        if (d < tol && (!mejor || d < mejor.d)) mejor = { d, i, pr };
      });
      if (mejor) {
        instantanea();
        f.puntos.splice(mejor.i + 1, 0, redondear(mejor.pr));
        guardar(); render();
        return;
      }
    }
    const g = debajo.closest('[data-id]');
    if (g && forma(g.dataset.id) && forma(g.dataset.id).tipo === 'terreno') seleccionar(g.dataset.id);
  });

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = vista.aPlano(e.clientX, e.clientY);
    vista.zoom(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p[0], p[1]);
    render();
  }, { passive: false });

  $('zoomMas').addEventListener('click', () => { vista.zoom(1.4); render(); });
  $('zoomMenos').addEventListener('click', () => { vista.zoom(1 / 1.4); render(); });
  $('zoomReset').addEventListener('click', () => { encuadrar(); render(); });

  /* ======================================================================
   * Teclado
   * ==================================================================== */
  const ATAJOS = { v: 'seleccionar', h: 'mano', l: 'lote', r: 'via', a: 'area', t: 'terreno', o: 'rotonda', x: 'texto' };
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select, dialog')) {
      if (e.key === 'Escape' && !e.target.closest('dialog')) e.target.blur();
      return;
    }
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (ctrl && k === 'z') { e.preventDefault(); if (e.shiftKey) rehacer(); else deshacer(); return; }
    if (ctrl && k === 'y') { e.preventDefault(); rehacer(); return; }
    if (ctrl && k === 'd') { e.preventDefault(); duplicar(); return; }
    if (ctrl) return;
    if (e.key === ' ') { e.preventDefault(); if (!espacio) { espacio = true; lienzo.classList.add('modo-mano'); } return; }
    if (e.key === 'Escape') {
      if (dibujo) { dibujo = null; iman = null; render(); }
      else if (herr !== 'seleccionar') ponerHerr('seleccionar');
      else if (selId) seleccionar(null);
      return;
    }
    if (dibujo) {
      if (e.key === 'Enter') { e.preventDefault(); cerrarDibujo(); }
      if (e.key === 'Backspace') { e.preventDefault(); dibujo.puntos.pop(); if (!dibujo.puntos.length) dibujo = null; render(); }
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selId) { e.preventDefault(); eliminar(); return; }
    const flechas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (flechas[e.key] && selId) {
      e.preventDefault();
      const f = forma(selId), paso = e.shiftKey ? 10 : 1;
      if (!e.repeat) instantanea();
      desplazar(f, clonar(f), flechas[e.key][0] * paso, flechas[e.key][1] * paso);
      guardar(); render();
      return;
    }
    if (ATAJOS[k] && !e.altKey) ponerHerr(ATAJOS[k]);
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === ' ') { espacio = false; lienzo.classList.toggle('modo-mano', herr === 'mano'); }
  });

  /* ======================================================================
   * Panel de propiedades
   * ==================================================================== */
  function seccion(titulo) {
    const s = el('section', 'seccion');
    if (titulo) s.append(el('h3', null, titulo));
    props.append(s);
    return s;
  }

  /*
   * campo(padre, etiqueta, clave, valor, alCambiar, opciones)
   * Guarda una instantánea para deshacer al empezar a editar el campo.
   */
  function campo(padre, etiqueta, clave, valor, alCambiar, op = {}) {
    const lab = el('label', 'campo' + (op.ancho ? ' ancho' : ''), etiqueta);
    let inp;
    if (op.opciones) {
      inp = el('select');
      op.opciones.forEach(([v, t]) => { const o = el('option', null, t); o.value = v; inp.append(o); });
    } else if (op.area) {
      inp = el('textarea');
    } else {
      inp = el('input');
      inp.type = op.tipo || 'text';
      if (op.paso) inp.step = op.paso;
      if (op.min != null) inp.min = op.min;
    }
    inp.id = 'p-' + clave;
    inp.value = valor == null ? '' : valor;
    if (op.placeholder) inp.placeholder = op.placeholder;
    let pendiente = true;
    inp.addEventListener('focus', () => { pendiente = true; });
    const evento = op.opciones || inp.type === 'color' ? 'change' : 'input';
    inp.addEventListener(evento, () => {
      if (pendiente) { instantanea(); pendiente = false; }
      alCambiar(inp.value);
      guardar();
      render();
      if (op.refrescar) pintarProps();
    });
    lab.append(inp);
    padre.append(lab);
    return inp;
  }
  const texto = (v) => (v === '' ? undefined : v);
  const numero = (v) => (v === '' || isNaN(+v) ? undefined : +v);

  function pintarProps() {
    const scroll = props.scrollTop;
    props.replaceChildren();
    const f = selId && forma(selId);
    if (f) pintarPropsForma(f); else pintarPropsCondominio();
    props.scrollTop = scroll;
  }

  function pintarPropsForma(f) {
    const cab = el('div', 'fila-botones');
    cab.style.justifyContent = 'space-between';
    cab.style.alignItems = 'center';
    const titulo = el('h2', null, f.tipo === 'lote' ? 'Lote ' + (f.numero || '') : (f.nombre || NOMBRES_TIPO[f.tipo]));
    cab.append(titulo, boton('Listo', () => seleccionar(null)));
    props.append(cab);

    const s = seccion(NOMBRES_TIPO[f.tipo]);
    const r = el('div', 'rejilla');
    s.append(r);

    if (f.tipo === 'lote') {
      campo(r, 'Número', 'numero', f.numero, (v) => { f.numero = v.trim(); titulo.textContent = 'Lote ' + f.numero; });
      campo(r, 'Estado', 'estado', f.estado, (v) => { f.estado = v; },
        { opciones: Object.keys(Plano.ESTADOS).map((k) => [k, Plano.ESTADOS[k].nombre]) });
      campo(r, 'Área (m²)', 'area', f.area, (v) => { f.area = v.trim(); }, { placeholder: '900.00' });
      campo(r, 'Perímetro (ml)', 'perimetro', f.perimetro, (v) => { f.perimetro = v.trim(); });
      campo(r, 'Precio al contado', 'precioContado', f.precioContado, (v) => { f.precioContado = numero(v); resumenPrecio(); }, { tipo: 'number', min: 0, paso: 500, placeholder: '37000' });
      campo(r, 'Precio a crédito de lista', 'precioCredito', f.precioCredito, (v) => { f.precioCredito = numero(v); resumenPrecio(); }, { tipo: 'number', min: 0, paso: 500, placeholder: '40000' });
      campo(r, 'Manzana', 'manzana', f.manzana, (v) => { f.manzana = texto(v.trim()); });
      campo(r, 'Responsable', 'responsable', f.responsable, (v) => { f.responsable = texto(v.trim()); });
      campo(r, 'Medidas de los lados', 'medidas', f.medidas, (v) => { f.medidas = texto(v); }, { ancho: true, placeholder: '48.26 · 22.90 · 48.66 · 22.66 ml' });
      campo(r, 'Nota (se ve en la web)', 'nota', f.nota, (v) => { f.nota = texto(v); }, { ancho: true, area: true });
      campo(r, 'Texto del lote', 'giro', f.giroEtiqueta || 0, (v) => { f.giroEtiqueta = +v || undefined; },
        { opciones: [['0', 'Horizontal'], ['-90', 'Vertical ↑'], ['90', 'Vertical ↓']] });
      const infoPrecio = el('p', 'ayuda');
      s.append(infoPrecio);
      function resumenPrecio() {
        const c = cond(), fin = c.financiamiento;
        const m2 = Plano.precioM2(f);
        const plazos = fin.plazos.map((p) => +p.meses).filter((m) => m > 0).sort((a, b) => a - b);
        const sim = plazos.length && Plano.simular(f, c, +fin.inicialSugerida || 0, plazos[plazos.length - 1]);
        infoPrecio.textContent = [
          isFinite(m2) ? Plano.formatoDinero(m2, c.moneda) + ' por m² al contado.' : '',
          sim ? 'Con inicial de ' + Plano.formatoDinero(sim.inicial, c.moneda, 0) + ': ' + sim.meses + ' cuotas de ' + Plano.formatoDinero(sim.cuota, c.moneda) + ' (total ' + Plano.formatoDinero(sim.total, c.moneda) + ').' : '',
          'La web muestra el precio al contado y el simulador de crédito. ' + (fin.base === 'credito'
            ? 'El crédito se calcula sobre el precio a crédito de lista.'
            : 'El precio a crédito de lista es solo una referencia interna: el crédito se calcula sobre el precio al contado.'),
          'Ojo: el responsable y los precios van dentro del archivo publicado.'
        ].filter(Boolean).join(' ');
      }
      resumenPrecio();
      if (f.etiqueta) s.append(boton('Centrar el texto del lote', () => { instantanea(); delete f.etiqueta; guardar(); render(); pintarProps(); }));
    } else if (f.tipo === 'rotonda') {
      campo(r, 'Centro X', 'cx', f.cx, (v) => { f.cx = numero(v) || 0; }, { tipo: 'number' });
      campo(r, 'Centro Y', 'cy', f.cy, (v) => { f.cy = numero(v) || 0; }, { tipo: 'number' });
      campo(r, 'Radio horizontal', 'rx', f.rx, (v) => { f.rx = Math.max(3, numero(v) || 3); }, { tipo: 'number', min: 3 });
      campo(r, 'Radio vertical', 'ry', f.ry, (v) => { f.ry = Math.max(3, numero(v) || 3); }, { tipo: 'number', min: 3 });
    } else if (f.tipo === 'texto') {
      campo(r, 'Texto', 'texto', f.texto, (v) => { f.texto = v; }, { ancho: true });
      campo(r, 'Tamaño', 'tam', f.tam, (v) => { f.tam = Math.max(4, numero(v) || 14); }, { tipo: 'number', min: 4 });
      campo(r, 'Giro (grados)', 'giroTexto', f.giro || 0, (v) => { f.giro = numero(v) || undefined; }, { tipo: 'number', paso: 5 });
      campoColor(r, f, Plano.COLORES.texto);
    } else {
      campo(r, 'Nombre', 'nombre', f.nombre, (v) => { f.nombre = v; titulo.textContent = v || NOMBRES_TIPO[f.tipo]; }, { ancho: true });
      if (f.tipo === 'via') campoColor(r, f, Plano.COLORES.via);
      if (f.tipo === 'area') {
        campoColor(r, f, '#6f9e4b');
        s.append(el('p', 'ayuda', 'El nombre del área se escribe dentro de ella en el plano.'));
      }
    }

    const acc = seccion('Acciones');
    const fb = el('div', 'fila-botones');
    fb.append(boton('Duplicar', duplicar), boton('Eliminar', eliminar, 'btn-peligro'));
    acc.append(fb);
    if (f.puntos) acc.append(el('p', 'ayuda', 'Arrastra los puntos azules para ajustar la forma. Doble clic en un borde agrega un punto; doble clic en un punto lo borra. Con Alt no se pega a otras esquinas.'));
  }

  function campoColor(padre, f, porDefecto) {
    campo(padre, 'Color', 'color', f.color || porDefecto, (v) => { f.color = v; }, { tipo: 'color', refrescar: true });
    const envoltura = el('div', 'campo', '\u00a0');
    const quitar = boton('Color original', () => { instantanea(); delete f.color; guardar(); render(); pintarProps(); });
    quitar.disabled = !f.color;
    envoltura.append(quitar);
    padre.append(envoltura);
  }

  /* Aplica fn al cambiar el control, guardando antes una instantánea para deshacer. */
  function conHistorial(inp, evento, fn) {
    let pendiente = true;
    inp.addEventListener('focus', () => { pendiente = true; });
    inp.addEventListener(evento, () => {
      if (pendiente) { instantanea(); pendiente = false; }
      fn();
      guardar();
    });
  }

  function seccionMarca(c) {
    const marcas = doc.sitio.marcas;
    const s = seccion('Marca');
    const r = el('div', 'rejilla');
    s.append(r);
    campo(r, 'Marca de este condominio', 'c-marca', c.marca, (v) => { c.marca = v; },
      { ancho: true, refrescar: true, opciones: Object.keys(marcas).map((k) => [k, marcas[k].nombre || k]) });
    const m = marcas[c.marca];
    if (m) {
      const usan = doc.condominios.filter((x) => x.marca === c.marca).length;
      campo(r, 'Nombre de la marca', 'm-nombre', m.nombre, (v) => { m.nombre = v; });
      campo(r, 'Lema', 'm-lema', m.lema, (v) => { m.lema = v; });
      campo(r, 'Color', 'm-color', m.color, (v) => { m.color = v; }, { tipo: 'color' });
      campo(r, 'Logo (opcional)', 'm-logo', m.logo, (v) => { m.logo = v.trim(); }, { placeholder: 'assets/img/logo.png' });
      campo(r, 'Imagen de fondo', 'm-fondo', m.fondo, (v) => { m.fondo = v.trim(); }, { ancho: true, placeholder: 'assets/img/fondo-waka.svg' });
      const ls = el('label', 'campo ancho');
      const cs = el('input');
      cs.type = 'checkbox'; cs.id = 'c-sellos'; cs.checked = c.mostrarSellos !== false; cs.style.width = 'auto';
      conHistorial(cs, 'change', () => { c.mostrarSellos = cs.checked; });
      ls.append(cs, ' Mostrar el nombre y el logo sobre el plano (web y PDF)');
      ls.style.flexDirection = 'row'; ls.style.alignItems = 'center'; ls.style.gap = '8px';
      r.append(ls);
      s.append(el('p', 'ayuda', 'Cambiar la marca afecta a ' + (usan === 1 ? 'este condominio' : 'los ' + usan + ' condominios que la usan') +
        '. Para usar tu propio logo o fondo, sube la imagen a la carpeta assets/img/ del repositorio y escribe aquí su ruta.'));
    }
    s.append(boton('+ Nueva marca', () => {
      modal((cuerpo, pie, cerrar) => {
        cuerpo.append(el('h2', null, 'Nueva marca'));
        const rr = el('div', 'rejilla');
        const nombre = campoSimple(rr, 'Nombre', 'nueva-marca', 'text', '', true);
        cuerpo.append(rr);
        pie.append(boton('Cancelar', () => cerrar()), boton('Crear', () => {
          const nom = nombre.value.trim();
          if (!nom) { nombre.focus(); return; }
          let clave = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'marca';
          while (marcas[clave]) clave += '-2';
          instantanea();
          marcas[clave] = { nombre: nom, lema: '', color: '#2e5a39', fondo: 'assets/img/fondo-waka.svg', logo: '' };
          c.marca = clave;
          guardar(); cerrar(); render(); pintarProps();
        }, 'btn-primario'));
        setTimeout(() => nombre.focus(), 30);
      });
    }));
  }

  function seccionPrecios(c) {
    const fin = c.financiamiento;
    const s = seccion('Precios y crédito');
    const r = el('div', 'rejilla');
    s.append(r);
    const n0 = (v) => numero(v) ?? 0;
    campo(r, 'Moneda', 'c-moneda', c.moneda, (v) => { c.moneda = v; ejemplo(); }, { placeholder: 'US$ o S/' });
    campo(r, 'Tasa anual general (%)', 'f-tasa', fin.tasaAnual, (v) => { fin.tasaAnual = n0(v); ejemplo(); pintarPlazosPH(); }, { tipo: 'number', min: 0, paso: 0.5 });
    campo(r, 'El crédito se calcula sobre', 'f-base', fin.base, (v) => { fin.base = v; ejemplo(); },
      { ancho: true, opciones: Object.keys(Plano.BASES).map((k) => [k, Plano.BASES[k]]) });
    campo(r, 'Tipo de interés', 'f-metodo', fin.metodo, (v) => { fin.metodo = v; ejemplo(); },
      { ancho: true, opciones: Object.keys(Plano.METODOS).map((k) => [k, Plano.METODOS[k]]) });
    campo(r, 'Inicial sugerida', 'f-inicial', fin.inicialSugerida, (v) => { fin.inicialSugerida = n0(v); ejemplo(); }, { tipo: 'number', min: 0, paso: 500 });
    campo(r, 'Inicial mínima', 'f-inicialMin', fin.inicialMinima, (v) => { fin.inicialMinima = n0(v); }, { tipo: 'number', min: 0, paso: 500 });
    campo(r, 'Plazo máximo (meses)', 'f-max', fin.plazoMaximo, (v) => { fin.plazoMaximo = Math.max(1, n0(v)); }, { tipo: 'number', min: 1 });
    campo(r, 'Validez cotización (días)', 'f-validez', fin.validezDias, (v) => { fin.validezDias = Math.max(1, n0(v)); }, { tipo: 'number', min: 1 });
    const lt = el('label', 'campo ancho');
    const ct = el('input');
    ct.type = 'checkbox'; ct.id = 'f-mostrarTasa'; ct.checked = !!fin.mostrarTasa; ct.style.width = 'auto';
    conHistorial(ct, 'change', () => { fin.mostrarTasa = ct.checked; });
    lt.append(ct, ' Mostrar la tasa de interés en la web y en las cotizaciones');
    lt.style.flexDirection = 'row'; lt.style.alignItems = 'center'; lt.style.gap = '8px';
    r.append(lt);

    // Plazos
    s.append(el('h3', null, 'Plazos que se ofrecen'));
    const t = el('table', 'tabla-lotes');
    const cab = el('tr');
    ['Meses', 'Tasa propia (%)', ''].forEach((h) => cab.append(el('th', null, h)));
    t.append(cab);
    const tasasPH = [];
    fin.plazos.forEach((p, i) => {
      const tr = el('tr');
      const im = el('input');
      im.type = 'number'; im.min = '1'; im.value = p.meses; im.id = 'f-plazo-' + i; im.setAttribute('aria-label', 'Meses del plazo ' + (i + 1));
      conHistorial(im, 'input', () => { p.meses = Math.max(1, n0(im.value)); ejemplo(); });
      const it = el('input');
      it.type = 'number'; it.min = '0'; it.step = '0.5'; it.value = p.tasa ?? ''; it.id = 'f-tasa-' + i;
      it.setAttribute('aria-label', 'Tasa propia del plazo de ' + p.meses + ' meses');
      tasasPH.push(it);
      conHistorial(it, 'input', () => { if (it.value === '') delete p.tasa; else p.tasa = n0(it.value); ejemplo(); });
      [im, it].forEach((x) => { x.style.width = '100%'; x.style.padding = '4px 6px'; x.style.border = '1px solid var(--linea)'; x.style.borderRadius = '6px'; x.style.background = 'var(--superficie)'; });
      const quitar = el('button', null, '✕');
      quitar.type = 'button';
      quitar.title = 'Quitar este plazo';
      quitar.addEventListener('click', () => { instantanea(); fin.plazos.splice(i, 1); guardar(); pintarProps(); });
      const td = (x) => { const d = el('td'); d.append(x); return d; };
      tr.append(td(im), td(it), td(quitar));
      t.append(tr);
    });
    s.append(t);
    function pintarPlazosPH() { tasasPH.forEach((x) => { x.placeholder = fin.tasaAnual + ' (general)'; }); }
    pintarPlazosPH();
    s.append(boton('+ Agregar plazo', () => {
      instantanea();
      const max = Math.max(0, ...fin.plazos.map((p) => +p.meses || 0));
      fin.plazos.push({ meses: max + 6 });
      guardar(); pintarProps();
    }));
    s.append(el('p', 'ayuda', 'Deja la tasa propia vacía para usar la tasa general. Con 0, ese plazo va sin intereses. En la web el cliente también puede escribir otro plazo hasta el máximo.'));

    // Precio por m²
    s.append(el('h3', null, 'Precio por m²'));
    const rm = el('div', 'rejilla');
    s.append(rm);
    const im2 = campo(rm, 'Precio al contado por m²', 'f-m2', fin.precioM2, (v) => { fin.precioM2 = numero(v) ?? ''; }, { tipo: 'number', min: 0, paso: 0.5, placeholder: '40' });
    const envolver = el('div', 'campo', '\u00a0');
    envolver.append(boton('Aplicar a disponibles', async () => {
      const pm2 = numero(im2.value);
      if (!pm2) { avisar('Escribe primero el precio por m².'); im2.focus(); return; }
      const ls = c.formas.filter((f) => f.tipo === 'lote' && f.estado === 'disponible' && isFinite(Plano.aNumero(f.area)));
      if (!(await confirmar('Calcular precios por m²', 'Se reemplaza el precio al contado de ' + ls.length + ' lotes disponibles por área × ' +
        Plano.formatoDinero(pm2, c.moneda) + ', redondeado a la centena.', 'Aplicar'))) return;
      instantanea();
      ls.forEach((f) => { f.precioContado = Math.round(Plano.aNumero(f.area) * pm2 / 100) * 100; });
      guardar(); render(); pintarProps();
      avisar('Precios actualizados');
    }));
    rm.append(envolver);

    // Ejemplo en vivo
    const ej = el('div', 'seccion');
    s.append(ej);
    function ejemplo() {
      ej.replaceChildren();
      const l = c.formas.find((f) => f.tipo === 'lote' && f.estado === 'disponible' && isFinite(Plano.precioContado(f)));
      if (!l) return;
      const ini = +fin.inicialSugerida || 0;
      ej.append(el('h3', null, 'Ejemplo: Lote ' + l.numero + ', inicial ' + Plano.formatoDinero(ini, c.moneda, 0)));
      const te = el('table', 'tabla-lotes');
      const ce = el('tr');
      ['Plazo', 'Cuota', 'Total'].forEach((h) => ce.append(el('th', null, h)));
      te.append(ce);
      fin.plazos.map((p) => +p.meses).filter((m) => m > 0).sort((a, b) => a - b).forEach((m) => {
        const x = Plano.simular(l, c, ini, m);
        const tr = el('tr');
        [m + ' meses', Plano.formatoDinero(x.cuota, c.moneda), Plano.formatoDinero(x.total, c.moneda, 0)].forEach((v) => tr.append(el('td', null, v)));
        te.append(tr);
      });
      ej.append(te);
    }
    ejemplo();
  }

  function pintarPropsCondominio() {
    const c = cond();
    props.append(el('h2', null, c.nombre));

    const s1 = seccion('Datos del condominio');
    const r1 = el('div', 'rejilla');
    s1.append(r1);
    campo(r1, 'Nombre', 'c-nombre', c.nombre, (v) => { c.nombre = v; pintarPestanas(); }, { ancho: true });
    campo(r1, 'Ubicación', 'c-ubicacion', c.ubicacion, (v) => { c.ubicacion = v; }, { ancho: true });
    campo(r1, 'Descripción', 'c-descripcion', c.descripcion, (v) => { c.descripcion = v; }, { ancho: true, area: true });
    campo(r1, 'WhatsApp', 'c-whatsapp', c.whatsapp, (v) => { c.whatsapp = v.replace(/[^\d]/g, ''); }, { ancho: true, placeholder: '51987654321' });
    s1.append(el('p', 'ayuda', 'WhatsApp con código de país y sin espacios. Si lo llenas, la ficha de cada lote disponible muestra el botón "Consultar por WhatsApp". Dirección de este plano en la web: index.html#' + c.id));

    seccionMarca(c);
    seccionPrecios(c);

    const sL = seccion('Lotes');
    const ls = c.formas.filter((f) => f.tipo === 'lote').sort((a, b) => String(a.numero).localeCompare(String(b.numero), 'es', { numeric: true }));
    if (!ls.length) {
      sL.append(el('p', 'ayuda', 'Todavía no hay lotes. Usa la herramienta Lote (L) y marca las esquinas de cada uno.'));
    } else {
      const disp = ls.filter((l) => l.estado === 'disponible').length;
      sL.append(el('p', 'ayuda', ls.length + ' lotes · ' + disp + ' disponibles. Cambia el estado aquí mismo o haz clic en el número para ver todos sus datos.'));
      const t = el('table', 'tabla-lotes');
      const cabT = el('tr');
      ['Lote', 'Estado', 'Contado'].forEach((h) => cabT.append(el('th', null, h)));
      t.append(cabT);
      ls.forEach((l) => {
        const tr = el('tr');
        const td1 = el('td');
        const b = el('button');
        b.type = 'button';
        const m = el('i', 'muestra');
        m.style.background = Plano.estadoDe(l).color;
        b.append(m, document.createTextNode(l.numero || '—'));
        b.addEventListener('click', () => seleccionar(l.id));
        td1.append(b);
        const td2 = el('td');
        const sel = el('select');
        sel.setAttribute('aria-label', 'Estado del lote ' + l.numero);
        Object.keys(Plano.ESTADOS).forEach((k) => { const o = el('option', null, Plano.ESTADOS[k].nombre); o.value = k; sel.append(o); });
        sel.value = l.estado;
        sel.addEventListener('change', () => { instantanea(); l.estado = sel.value; m.style.background = Plano.estadoDe(l).color; guardar(); render(); });
        td2.append(sel);
        tr.append(td1, td2, el('td', null, Plano.formatoPrecio(l.precioContado, c.moneda)));
        t.append(tr);
      });
      sL.append(t);
    }

    const otras = c.formas.filter((f) => f.tipo !== 'lote');
    if (otras.length) {
      const sO = seccion('Otras formas');
      const fb = el('div', 'fila-botones');
      otras.forEach((f) => fb.append(boton(f.nombre || f.texto || NOMBRES_TIPO[f.tipo], () => seleccionar(f.id))));
      sO.append(fb);
    }

    const r = ref(c.id);
    const sR = seccion('Imagen para calcar');
    sR.append(el('p', 'ayuda', 'Pon la foto o el PDF (como imagen) del plano detrás del dibujo para trazar encima. No se muestra en la web.'));
    const src = r.local || c.referencia;
    const rr = el('div', 'rejilla');
    sR.append(rr);
    const chk = el('label', 'campo');
    const ci = el('input');
    ci.type = 'checkbox'; ci.id = 'p-ref-visible'; ci.checked = r.visible; ci.disabled = !src;
    ci.addEventListener('change', () => { r.visible = ci.checked; render(); });
    chk.append('Mostrar imagen', ci);
    ci.style.width = 'auto';
    rr.append(chk);
    const op = el('label', 'campo', 'Transparencia');
    const oi = el('input');
    oi.type = 'range'; oi.min = '0.1'; oi.max = '1'; oi.step = '0.05'; oi.value = r.opacidad; oi.id = 'p-ref-opacidad';
    oi.addEventListener('input', () => { r.opacidad = +oi.value; render(); });
    op.append(oi);
    rr.append(op);
    const archivo = el('input');
    archivo.type = 'file'; archivo.accept = 'image/*'; archivo.hidden = true;
    archivo.addEventListener('change', () => { if (archivo.files[0]) subirReferencia(archivo.files[0]); });
    const fbR = el('div', 'fila-botones');
    fbR.append(boton('Cargar imagen…', () => archivo.click()), archivo);
    if (r.local) {
      fbR.append(boton('Quitar imagen cargada', () => {
        URL.revokeObjectURL(r.local); r.local = null;
        RefDB.borrar(c.id).catch(() => {});
        render(); pintarProps();
      }));
    }
    sR.append(fbR);
    if (src) sR.append(el('p', 'ayuda', r.local ? 'Usando la imagen cargada en este navegador.' : 'Usando ' + c.referencia));

    const sC = seccion('Lienzo');
    const rC = el('div', 'rejilla');
    sC.append(rC);
    campo(rC, 'Ancho', 'c-ancho', c.lienzo.ancho, (v) => { c.lienzo.ancho = Math.max(100, numero(v) || 100); encuadrar(); }, { tipo: 'number', min: 100 });
    campo(rC, 'Alto', 'c-alto', c.lienzo.alto, (v) => { c.lienzo.alto = Math.max(100, numero(v) || 100); encuadrar(); }, { tipo: 'number', min: 100 });

    const sS = seccion('Sitio web');
    const rS = el('div', 'rejilla');
    sS.append(rS);
    campo(rS, 'Nombre del sitio', 's-nombre', doc.sitio.nombre, (v) => { doc.sitio.nombre = v; }, { ancho: true });
    campo(rS, 'Texto al pie de la web', 's-pie', doc.sitio.pie, (v) => { doc.sitio.pie = texto(v); }, { ancho: true, placeholder: 'Plano referencial. Áreas y medidas sujetas a verificación.' });

    const sX = seccion('Este condominio');
    const fbX = el('div', 'fila-botones');
    fbX.append(
      boton('Duplicar condominio', () => {
        instantanea();
        const n = clonar(c);
        n.id = slug(c.nombre + ' copia');
        n.nombre = c.nombre + ' (copia)';
        doc.condominios.push(n);
        guardar();
        elegirCondominio(n.id);
      }),
      boton('Exportar (.json)', () => descargar(c.id + '.json', JSON.stringify(c, null, 2), 'application/json')),
      boton('Eliminar condominio', async () => {
        if (doc.condominios.length < 2) { avisar('Debe quedar al menos un condominio.'); return; }
        if (!(await confirmar('Eliminar ' + c.nombre, 'Se borra este condominio y todo su plano del borrador. Puedes deshacerlo con Ctrl+Z mientras no cierres la página.', 'Eliminar', true))) return;
        instantanea();
        doc.condominios = doc.condominios.filter((x) => x.id !== c.id);
        guardar();
        elegirCondominio(doc.condominios[0].id);
      }, 'btn-peligro')
    );
    sX.append(fbX);
  }

  /* ======================================================================
   * Pestañas y acciones de la barra
   * ==================================================================== */
  function pintarPestanas() {
    const nav = $('pestanas');
    nav.replaceChildren();
    doc.condominios.forEach((c) => {
      const b = el('button', 'pestana', c.nombre || c.id);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(c.id === condId));
      b.addEventListener('click', () => elegirCondominio(c.id));
      nav.append(b);
    });
    const nuevo = el('button', 'pestana', '+ Nuevo condominio');
    nuevo.type = 'button';
    nuevo.addEventListener('click', nuevoCondominio);
    nav.append(nuevo);
  }

  $('btnDeshacer').addEventListener('click', deshacer);
  $('btnRehacer').addEventListener('click', rehacer);

  $('btnVista').addEventListener('click', () => {
    // el borrador se escribe al instante para que la vista previa lo encuentre
    clearTimeout(temporizador);
    try { localStorage.setItem(Plano.CLAVE_BORRADOR, JSON.stringify(doc)); } catch (e) { /* nada */ }
    $('btnVista').href = 'index.html?borrador#' + condId;
  });

  $('btnPublicar').addEventListener('click', () => {
    const contenido = serializar(doc);
    modal((cuerpo, pie, cerrar) => {
      cuerpo.append(el('h2', null, 'Publicar cambios en la web'));
      const ol = el('ol');
      ['Descarga el archivo condominios.js con el botón de abajo.',
        'En GitHub, entra a la carpeta data/ del repositorio y reemplaza condominios.js por el archivo descargado (Add file → Upload files).',
        'Guarda el cambio (Commit). La web se actualiza en uno o dos minutos.'
      ].forEach((t) => ol.append(el('li', null, t)));
      cuerpo.append(ol);
      const ta = el('textarea');
      ta.readOnly = true;
      ta.value = contenido;
      ta.id = 'contenidoPublicar';
      ta.setAttribute('aria-label', 'Contenido de condominios.js');
      cuerpo.append(ta);
      pie.append(
        boton('Cerrar', () => cerrar()),
        boton('Copiar contenido', () => copiar(contenido, ta)),
        boton('Descargar condominios.js', () => { descargar('condominios.js', contenido, 'text/javascript'); avisar('Archivo descargado'); }, 'btn-primario')
      );
    });
  });

  $('btnImportar').addEventListener('click', () => $('archivoImportar').click());
  $('archivoImportar').addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (!archivo) return;
    let datos;
    try { datos = leerArchivo(await archivo.text()); } catch (err) {
      avisar('No pude leer ese archivo: ' + err.message);
      return;
    }
    if (esCondominio(datos)) {
      instantanea();
      const i = doc.condominios.findIndex((c) => c.id === datos.id);
      if (i >= 0) doc.condominios[i] = datos; else doc.condominios.push(datos);
      guardar();
      elegirCondominio(datos.id);
      avisar('Condominio importado: ' + datos.nombre);
      return;
    }
    const lista = Array.isArray(datos) ? datos : datos && datos.condominios;
    if (!Array.isArray(lista) || !lista.length || !lista.every(esCondominio)) { avisar('El archivo no tiene condominios válidos.'); return; }
    if (!(await confirmar('Reemplazar todo', 'El archivo trae ' + lista.length + ' condominio(s). Reemplazarán a todos los del editor.', 'Reemplazar'))) return;
    instantanea();
    doc.condominios = lista;
    if (datos.sitio) doc.sitio = datos.sitio;
    guardar();
    elegirCondominio(lista[0].id);
    avisar('Datos importados');
  });

  $('btnDescartar').addEventListener('click', async () => {
    if (!(await confirmar('Descartar borrador', 'Vuelves a los datos publicados en la web. Se pierden los cambios que no hayas publicado.', 'Descartar', true))) return;
    instantanea();
    doc = clonar(PUBLICADO);
    if (!cond()) condId = doc.condominios[0].id;
    selId = null;
    guardar();
    encuadrar();
    todo();
  });

  window.addEventListener('resize', () => render());

  function todo() {
    pintarPestanas();
    render();
    pintarProps();
    botonesHistorial();
    $('avisoBorrador').hidden = !hayCambios();
  }

  encuadrar();
  cargarReferenciaLocal(condId);
  ponerHerr('seleccionar');
  todo();
})();
