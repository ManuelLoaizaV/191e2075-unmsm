/*
 * visor.js — página pública: pestañas de condominios, plano interactivo,
 * ficha de cada lote con simulador de crédito, y exportación a PDF.
 *
 * Parámetros de la dirección:
 *   index.html#la-finca     abre ese condominio
 *   index.html?embed        oculta cabecera y pie (para usar en un iframe)
 *   index.html?borrador     muestra el borrador guardado por el editor
 */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  if (params.has('embed')) document.documentElement.classList.add('embed');

  var sitio = window.SITIO || {};
  var lista = window.CONDOMINIOS || [];

  if (params.has('borrador')) {
    try {
      var b = JSON.parse(localStorage.getItem(Plano.CLAVE_BORRADOR));
      if (b && Array.isArray(b.condominios)) {
        lista = b.condominios;
        if (b.sitio) sitio = b.sitio;
        document.getElementById('avisoBorrador').hidden = false;
      }
    } catch (e) { /* sin borrador: se usan los datos publicados */ }
  }
  lista.forEach(Plano.normalizarCondominio);

  var $ = function (id) { return document.getElementById(id); };
  var svg = $('plano'), marco = $('marco'), panel = $('panel');
  var estado = { cond: null, sel: null, filtro: null, sim: { inicial: null, meses: null } };
  var vista = null;
  var marca = null;

  function lotes(cond) {
    return cond.formas.filter(function (f) { return f.tipo === 'lote'; })
      .sort(function (a, b) { return String(a.numero).localeCompare(String(b.numero), 'es', { numeric: true }); });
  }
  function disponibles(cond) { return lotes(cond).filter(function (l) { return l.estado === 'disponible'; }); }

  function texto(tag, contenido, clase) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (contenido != null) n.textContent = contenido;
    return n;
  }
  function boton(contenido, clase, alClic) {
    var b = texto('button', contenido, clase);
    b.type = 'button';
    b.addEventListener('click', alClic);
    return b;
  }

  var moneda = function () { return estado.cond.moneda || ''; };
  var dinero = function (v, d) { return Plano.formatoDinero(v, moneda(), d == null ? 0 : d); };
  var fin = function () { return estado.cond.financiamiento; };
  var plazos = function () {
    return (fin().plazos || []).map(function (p) { return +p.meses; }).filter(function (m) { return m > 0; })
      .sort(function (a, b) { return a - b; });
  };

  /* ---------- Marca ---------- */
  function pintarMarca() {
    marca = Plano.aplicarMarca(sitio, estado.cond);
    var nombre = (marca && marca.nombre) || sitio.nombre || 'Mapa de Lotes';
    $('sitioNombre').textContent = nombre;
    $('marcaLema').textContent = (marca && marca.lema) || '';
    var logo = $('marcaLogo');
    if (marca && marca.logo) { logo.src = marca.logo; logo.alt = nombre; logo.hidden = false; }
    else logo.hidden = true;
    // el logo ya trae nombre y lema
    $('sitioNombre').hidden = !!(marca && marca.logo);
    $('marcaLema').hidden = !!(marca && marca.logo);
    document.title = estado.cond.nombre + ' · ' + nombre;
  }

  /* ---------- Pestañas ---------- */
  function pintarPestanas() {
    var nav = $('pestanas');
    nav.replaceChildren();
    lista.forEach(function (c) {
      var b = boton(c.nombre, 'pestana', function () { elegir(c.id, true); });
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(estado.cond && estado.cond.id === c.id));
      nav.appendChild(b);
    });
    nav.hidden = lista.length < 2;
  }

  function elegir(id, cambiarHash) {
    var c = lista.find(function (x) { return x.id === id; }) || lista[0];
    if (!c) {
      $('condNombre').textContent = 'No hay condominios cargados';
      return;
    }
    estado.cond = c;
    estado.sel = null;
    estado.sim = { inicial: +c.financiamiento.inicialSugerida || 0, meses: plazos()[plazos().length - 1] || 12 };
    if (cambiarHash) history.replaceState(null, '', '#' + c.id);
    $('condNombre').textContent = c.nombre;
    $('condUbicacion').textContent = [c.ubicacion, c.descripcion].filter(Boolean).join(' · ');
    pintarMarca();
    pintarPestanas();
    pintarResumen();
    pintarLeyenda($('leyenda'), c);
    Plano.dibujar(svg, c, {});
    Plano.sellos(marco, sitio, c);
    var base = encuadre(c);
    svg.style.aspectRatio = base.w + ' / ' + base.h;
    if (vista) vista.reiniciar(base); else vista = new Plano.Vista(svg, base);
    actualizarTouch();
    redibujar();
    pintarPanel();
  }

  /* Encuadre ajustado al dibujo: sin bordes a los lados ni abajo, un respiro arriba. */
  function encuadre(c) {
    var b = Plano.cajaFormas(c), arriba = 8;
    return { x: b.x, y: b.y - arriba, w: b.w, h: b.h + arriba };
  }

  function redibujar() {
    Plano.dibujar(svg, estado.cond, { seleccionado: estado.sel, filtro: estado.filtro, mantenerVista: true });
  }

  function pintarResumen() {
    var ls = lotes(estado.cond);
    var disp = disponibles(estado.cond).length;
    var r = $('resumen');
    r.replaceChildren();
    [[disp, 'disponibles', 'cifra cifra-verde'], [ls.length, 'lotes en total', 'cifra']].forEach(function (x) {
      var d = texto('div', null, x[2]);
      d.appendChild(texto('b', String(x[0])));
      d.appendChild(texto('small', x[1]));
      r.appendChild(d);
    });
  }

  /* Estados con el mismo color comparten entrada ("Vendido / No disponible"). */
  function pintarLeyenda(ley, c) {
    var usados = {};
    lotes(c).forEach(function (l) { usados[l.estado] = true; });
    ley.replaceChildren();
    var porColor = {};
    Object.keys(Plano.ESTADOS).forEach(function (k) {
      if (!usados[k]) return;
      var col = Plano.ESTADOS[k].color;
      (porColor[col] = porColor[col] || []).push(Plano.ESTADOS[k].nombre);
    });
    Object.keys(porColor).forEach(function (col) {
      var s = texto('span');
      var m = texto('i', null, 'muestra');
      m.style.background = col;
      s.appendChild(m);
      s.appendChild(document.createTextNode(porColor[col].join(' / ')));
      ley.appendChild(s);
    });
  }

  /* Cuota "desde": plazo más largo con la inicial sugerida. */
  function cuotaDesde(l) {
    var ps = plazos();
    if (!ps.length) return null;
    return Plano.simular(l, estado.cond, +fin().inicialSugerida || 0, ps[ps.length - 1]);
  }

  /* ---------- Panel lateral ---------- */
  function pintarPanel() {
    panel.replaceChildren();
    var c = estado.cond;
    var sel = estado.sel && c.formas.find(function (f) { return f.id === estado.sel; });
    if (sel) return pintarDetalle(sel);

    var disp = disponibles(c);
    panel.appendChild(texto('h2', 'Lotes disponibles (' + disp.length + ')'));
    if (!disp.length) {
      panel.appendChild(texto('p', 'No hay lotes disponibles en este momento.', 'vacio'));
      return;
    }
    var ul = texto('ul', null, 'lista-lotes');
    disp.forEach(function (l) {
      var li = document.createElement('li');
      var b = texto('button', null, 'fila-lote');
      b.type = 'button';
      var m = texto('i', null, 'muestra');
      m.style.background = Plano.estadoDe(l).color;
      var info = texto('span');
      info.appendChild(texto('strong', 'Lote ' + l.numero));
      info.appendChild(texto('small', Plano.formatoArea(l.area)));
      var precio = texto('span', null, 'fila-precio');
      var pc = Plano.precioContado(l);
      precio.textContent = isFinite(pc) ? dinero(pc) : 'Consultar';
      var s = cuotaDesde(l);
      if (s) precio.appendChild(texto('span', 'o ' + dinero(s.cuota) + '/mes', 'desde'));
      b.append(m, info, precio);
      b.addEventListener('click', function () { seleccionar(l.id); });
      li.appendChild(b);
      ul.appendChild(li);
    });
    panel.appendChild(ul);
  }

  function pintarDetalle(l) {
    var c = estado.cond;
    var est = Plano.estadoDe(l);
    var d = texto('div', null, 'detalle');

    var cab = texto('div', null, 'detalle-cab');
    var tit = texto('div');
    tit.appendChild(texto('h2', c.nombre));
    tit.appendChild(texto('h3', 'Lote ' + l.numero));
    var pas = texto('span', est.nombre, 'pastilla');
    pas.style.background = est.color;
    cab.append(tit, pas);
    d.appendChild(cab);

    var pc = Plano.precioContado(l);
    if (l.estado === 'disponible' && isFinite(pc)) {
      var pr = texto('div', null, 'precios');
      var caja = texto('div', null, 'precio-caja principal');
      caja.append(texto('small', 'Precio al contado'), texto('b', dinero(pc)));
      var m2 = Plano.precioM2(l);
      if (isFinite(m2)) caja.append(texto('span', dinero(m2, 2) + ' por m²'));
      pr.appendChild(caja);
      d.appendChild(pr);
      d.appendChild(simulador(l));
    }

    var dl = texto('dl', null, 'datos');
    function dato(nombre, valor, ancho) {
      if (!valor) return;
      var w = texto('div', null, ancho ? 'ancho' : '');
      w.append(texto('dt', nombre), texto('dd', valor));
      dl.appendChild(w);
    }
    dato('Área', Plano.formatoArea(l.area));
    dato('Perímetro', l.perimetro ? l.perimetro + ' ml' : '');
    dato('Manzana', l.manzana);
    dato('Medidas de los lados', l.medidas, true);
    dato('Nota', l.nota, true);
    var acc = texto('div', null, 'acciones-ficha');
    if (l.estado === 'disponible' && isFinite(pc)) {
      acc.appendChild(boton('Descargar cotización (PDF)', 'btn btn-primario', function () { imprimirCotizacion(l); }));
    }
    if (l.estado === 'disponible' && c.whatsapp) {
      var num = String(c.whatsapp).replace(/\D/g, '');
      var a = texto('a', 'Consultar por WhatsApp', 'btn');
      a.target = '_blank';
      a.rel = 'noopener';
      a.id = 'enlaceWhatsapp';
      acc.appendChild(a);
      acc.appendChild(texto('span', 'WhatsApp: +' + num, 'sim-nota'));
    }
    d.appendChild(acc);
    if (dl.children.length) d.appendChild(dl);
    d.appendChild(boton('Ver lotes disponibles', 'btn', function () { seleccionar(null); }));
    panel.appendChild(d);
    actualizarSimulador(l);
  }

  /* ---------- Simulador de crédito ---------- */
  var ref = {}; // nodos del simulador que se actualizan sin repintar el panel

  function simulador(l) {
    var f = fin();
    var s = texto('section', null, 'simulador');
    s.setAttribute('aria-label', 'Simulador de crédito');
    s.appendChild(texto('h4', 'Simula tu crédito'));

    // Inicial
    var ci = texto('label', 'Inicial', 'sim-campo');
    var caja = texto('div', null, 'sim-dinero');
    caja.appendChild(texto('span', moneda()));
    var inp = document.createElement('input');
    inp.type = 'number'; inp.id = 'simInicial'; inp.min = '0'; inp.step = '500'; inp.inputMode = 'decimal';
    inp.value = estado.sim.inicial;
    inp.addEventListener('input', function () {
      estado.sim.inicial = inp.value === '' ? 0 : +inp.value;
      actualizarSimulador(l);
    });
    caja.appendChild(inp);
    ci.appendChild(caja);
    ref.notaInicial = texto('span', '', 'sim-nota');
    ci.appendChild(ref.notaInicial);
    s.appendChild(ci);

    // Plazo
    var cp = texto('div', 'Plazo', 'sim-campo');
    var chips = texto('div', null, 'chips');
    ref.chips = [];
    plazos().forEach(function (m) {
      var ch = boton(m + ' meses', 'chip', function () { estado.sim.meses = m; ref.otro.value = ''; actualizarSimulador(l); });
      ch.dataset.meses = m;
      ref.chips.push(ch);
      chips.appendChild(ch);
    });
    var otro = document.createElement('input');
    otro.type = 'number'; otro.min = '1'; otro.max = String(f.plazoMaximo || 60); otro.placeholder = 'Otro';
    otro.className = 'chip-otro'; otro.id = 'simOtro'; otro.setAttribute('aria-label', 'Otro plazo en meses');
    if (plazos().indexOf(estado.sim.meses) < 0) otro.value = estado.sim.meses;
    otro.addEventListener('input', function () {
      var v = Math.round(+otro.value);
      if (v >= 1) { estado.sim.meses = Math.min(v, +f.plazoMaximo || 120); actualizarSimulador(l); }
    });
    ref.otro = otro;
    chips.appendChild(otro);
    cp.appendChild(chips);
    s.appendChild(cp);

    // Resultado
    var r = texto('div', null, 'sim-resultado');
    ref.cuota = texto('div', null, 'sim-cuota');
    r.appendChild(ref.cuota);
    ref.lineas = texto('dl', null, 'sim-lineas');
    r.appendChild(ref.lineas);
    s.appendChild(r);

    // Comparativo de plazos
    var t = texto('table', null, 'tabla-plazos');
    var cab = texto('tr');
    ['Plazo', 'Cuota', 'Total'].forEach(function (h) { cab.appendChild(texto('th', h)); });
    t.appendChild(cab);
    ref.tabla = t;
    s.appendChild(t);
    return s;
  }

  function actualizarSimulador(l) {
    if (!ref.cuota || !document.body.contains(ref.cuota)) return;
    var f = fin();
    var sim = Plano.simular(l, estado.cond, estado.sim.inicial, estado.sim.meses);
    if (!sim) return;

    var bajo = sim.inicial < sim.inicialMinima;
    ref.notaInicial.textContent = bajo
      ? 'La inicial mínima es ' + dinero(sim.inicialMinima) + '.'
      : 'Inicial mínima: ' + dinero(sim.inicialMinima) + '.';
    ref.notaInicial.className = 'sim-nota' + (bajo ? ' alerta' : '');

    ref.chips.forEach(function (ch) { ch.setAttribute('aria-pressed', String(+ch.dataset.meses === sim.meses)); });

    ref.cuota.replaceChildren(texto('small', 'Cuota mensual · ' + sim.meses + ' meses'));
    var b = texto('b', dinero(sim.cuota, 2));
    b.appendChild(texto('span', ' /mes'));
    ref.cuota.appendChild(b);

    ref.lineas.replaceChildren();
    function linea(nombre, valor) { ref.lineas.append(texto('dt', nombre), texto('dd', valor)); }
    linea('Inicial', dinero(sim.inicial));
    linea('Monto a financiar', dinero(sim.saldo));
    if (f.metodo !== 'sin') linea('Intereses', dinero(sim.intereses, 2));
    linea('Total a pagar', dinero(sim.total, 2));
    if (f.mostrarTasa && f.metodo !== 'sin') linea(f.metodo === 'simple' ? 'Tasa anual (simple)' : 'Tasa efectiva anual', sim.tasaAnual + '%');

    while (ref.tabla.rows.length > 1) ref.tabla.deleteRow(1);
    var ps = plazos();
    if (ps.indexOf(sim.meses) < 0) ps = ps.concat([sim.meses]).sort(function (a, b) { return a - b; });
    ps.forEach(function (m) {
      var x = Plano.simular(l, estado.cond, estado.sim.inicial, m);
      var tr = ref.tabla.insertRow();
      if (m === sim.meses) tr.className = 'activo';
      [m + ' meses', dinero(x.cuota, 2), dinero(x.total)].forEach(function (v) { tr.insertCell().textContent = v; });
      tr.addEventListener('click', function () {
        estado.sim.meses = m;
        if (plazos().indexOf(m) >= 0) ref.otro.value = '';
        actualizarSimulador(l);
      });
    });

    var wa = $('enlaceWhatsapp');
    if (wa) {
      var num = String(estado.cond.whatsapp).replace(/\D/g, '');
      var msj = 'Hola, me interesa el Lote ' + l.numero + ' de ' + estado.cond.nombre +
        ' (' + dinero(Plano.precioContado(l)) + ' al contado). Simulé una inicial de ' + dinero(sim.inicial) +
        ' y ' + sim.meses + ' cuotas de ' + dinero(sim.cuota, 2) + '.';
      wa.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(msj);
    }
  }

  function seleccionar(id) {
    estado.sel = id;
    redibujar();
    pintarPanel();
    if (id && window.matchMedia('(max-width: 960px)').matches) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /* ---------- PDF: plano y cotización ---------- */
  function hoy() { return new Date(); }
  function fecha(d) { return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }); }

  function cabeceraHoja(derecha) {
    var cab = texto('div', null, 'hoja-cab');
    var izq = texto('div', null, 'h-marca');
    if (marca && marca.logo) {
      var img = document.createElement('img');
      img.src = marca.logo; img.alt = marca.nombre || '';
      izq.appendChild(img);
    }
    var t = texto('div');
    t.appendChild(texto('b', (marca && marca.nombre) || sitio.nombre || ''));
    if (marca && marca.lema) t.appendChild(texto('small', marca.lema));
    izq.appendChild(t);
    var der = texto('div', null, 'h-der');
    derecha.forEach(function (x) { der.appendChild(texto('div', x)); });
    cab.append(izq, der);
    return cab;
  }

  function planoImpreso(seleccionado, conSellos) {
    var c = estado.cond;
    var m = texto('div', null, 'plano-marco');
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    Plano.dibujar(s, c, { seleccionado: seleccionado });
    var b = encuadre(c);
    s.setAttribute('viewBox', [b.x, b.y, b.w, b.h].join(' '));
    s.style.aspectRatio = b.w + ' / ' + b.h;
    m.appendChild(s);
    if (conSellos) Plano.sellos(m, sitio, c);
    return m;
  }

  function tabla(cabeceras, filas, numericas) {
    var t = document.createElement('table');
    var tr = t.insertRow();
    cabeceras.forEach(function (h, i) {
      var th = texto('th', h, numericas && numericas.indexOf(i) >= 0 ? 'num' : '');
      tr.appendChild(th);
    });
    filas.forEach(function (f) {
      var r = t.insertRow();
      if (f.clase) r.className = f.clase;
      f.celdas.forEach(function (v, i) {
        var td = r.insertCell();
        td.textContent = v;
        if (numericas && numericas.indexOf(i) >= 0) td.className = 'num';
      });
    });
    return t;
  }

  function imprimir(hoja, titulo) {
    var zona = $('impresion');
    zona.replaceChildren(hoja);
    var tituloAnterior = document.title;
    document.title = titulo; // el navegador lo usa como nombre del archivo PDF
    var restaurar = function () { document.title = tituloAnterior; window.removeEventListener('afterprint', restaurar); };
    window.addEventListener('afterprint', restaurar);
    setTimeout(function () { window.print(); }, 50);
  }

  function imprimirPlano() {
    var c = estado.cond;
    var h = texto('div', null, 'hoja hoja-plano');
    h.appendChild(cabeceraHoja([c.nombre, fecha(hoy())]));
    h.appendChild(texto('h1', c.nombre));
    h.appendChild(texto('p', [c.ubicacion, c.descripcion].filter(Boolean).join(' · '), 'h-sub'));
    h.appendChild(planoImpreso(null, true));
    var ley = texto('div', null, 'leyenda');
    pintarLeyenda(ley, c);
    h.appendChild(ley);

    var disp = disponibles(c);
    if (disp.length) {
      var ps = plazos(), largo = ps[ps.length - 1];
      h.appendChild(texto('h2', 'Lotes disponibles'));
      var cab = ['Lote', 'Área', 'Perímetro', 'Al contado'];
      if (largo) cab.push('Cuota en ' + largo + ' meses*');
      h.appendChild(tabla(cab, disp.map(function (l) {
        var s = largo && Plano.simular(l, c, +fin().inicialSugerida || 0, largo);
        var fila = ['Lote ' + l.numero, Plano.formatoArea(l.area), l.perimetro ? l.perimetro + ' ml' : '',
          isFinite(Plano.precioContado(l)) ? dinero(Plano.precioContado(l)) : 'Consultar'];
        if (largo) fila.push(s ? dinero(s.cuota, 2) : '—');
        return { celdas: fila };
      }), [1, 2, 3, 4]));
      if (largo) {
        h.appendChild(texto('p', '* Con inicial de ' + dinero(+fin().inicialSugerida || 0) + '. Cotiza otros plazos en la ficha de cada lote. ' +
          'Precios referenciales sujetos a cambio.', 'pie-hoja'));
      }
    }
    imprimir(h, 'Plano ' + c.nombre);
  }

  function imprimirCotizacion(l) {
    var c = estado.cond, f = fin();
    var sim = Plano.simular(l, c, estado.sim.inicial, estado.sim.meses);
    if (!sim) return;
    var d = hoy();
    var vence = new Date(d.getTime() + (+f.validezDias || 15) * 864e5);
    var h = texto('div', null, 'hoja hoja-cotizacion');
    h.appendChild(cabeceraHoja(['Cotización', fecha(d)]));
    h.appendChild(texto('h1', 'Lote ' + l.numero + ' · ' + c.nombre));
    h.appendChild(texto('p', [c.ubicacion, 'Válida hasta el ' + fecha(vence)].filter(Boolean).join(' · '), 'h-sub'));

    var dos = texto('div', null, 'dos');
    var izq = texto('div');
    izq.appendChild(texto('h2', 'Datos del lote'));
    var filas = [['Área', Plano.formatoArea(l.area)], ['Perímetro', l.perimetro ? l.perimetro + ' ml' : ''],
      ['Manzana', l.manzana || ''], ['Medidas de los lados', l.medidas || ''],
      ['Precio al contado', dinero(Plano.precioContado(l))]];
    var m2 = Plano.precioM2(l);
    if (isFinite(m2)) filas.push(['Precio por m²', dinero(m2, 2)]);
    izq.appendChild(tabla(['Concepto', 'Detalle'], filas.filter(function (x) { return x[1]; }).map(function (x) { return { celdas: x }; }), [1]));
    dos.appendChild(izq);
    var der = texto('div');
    der.appendChild(texto('h2', 'Ubicación en el plano'));
    der.appendChild(planoImpreso(l.id));
    dos.appendChild(der);
    h.appendChild(dos);

    h.appendChild(texto('h2', 'Plan de pago elegido'));
    var plan = [['Precio ' + (f.base === 'credito' && isFinite(Plano.precioCredito(l)) ? 'a crédito de lista' : 'al contado'), dinero(sim.precioBase)],
      ['Inicial', dinero(sim.inicial)], ['Monto a financiar', dinero(sim.saldo)], ['Plazo', sim.meses + ' meses']];
    if (f.metodo !== 'sin' && f.mostrarTasa) plan.push([f.metodo === 'simple' ? 'Tasa anual (simple)' : 'Tasa efectiva anual (TEA)', sim.tasaAnual + '%']);
    plan.push(['Cuota mensual', dinero(sim.cuota, 2)]);
    if (f.metodo !== 'sin') plan.push(['Intereses', dinero(sim.intereses, 2)]);
    plan.push(['Total a pagar', dinero(sim.total, 2)]);
    h.appendChild(tabla(['Concepto', 'Monto'], plan.map(function (x) {
      return { celdas: x, clase: x[0] === 'Cuota mensual' ? 'destacado' : '' };
    }), [1]));

    var ps = plazos();
    if (ps.indexOf(sim.meses) < 0) ps = ps.concat([sim.meses]).sort(function (a, b) { return a - b; });
    h.appendChild(texto('h2', 'Otras opciones con la misma inicial'));
    h.appendChild(tabla(['Plazo', 'Cuota mensual', 'Intereses', 'Total a pagar'], ps.map(function (m) {
      var x = Plano.simular(l, c, sim.inicial, m);
      return { celdas: [m + ' meses', dinero(x.cuota, 2), dinero(x.intereses, 2), dinero(x.total, 2)], clase: m === sim.meses ? 'destacado' : '' };
    }), [1, 2, 3]));

    var nota = 'Cotización referencial, válida por ' + (+f.validezDias || 15) + ' días. Precios, tasas y disponibilidad sujetos a cambio sin previo aviso.';
    if (c.whatsapp) nota += ' Informes por WhatsApp: +' + String(c.whatsapp).replace(/\D/g, '') + '.';
    h.appendChild(texto('p', nota, 'pie-hoja'));
    imprimir(h, 'Cotizacion Lote ' + l.numero + ' ' + c.nombre);
  }

  /* Solo la imagen: plano, fondo y logo a toda la hoja, sin tablas. Para imprimir. */
  function imprimirImagen() {
    // La hoja toma la proporción exacta del plano (ancho A4 horizontal), así
    // el PDF queda recortado al dibujo, sin franjas de fondo sobrantes.
    var b = encuadre(estado.cond);
    var ancho = 297, alto = +(297 * b.h / b.w).toFixed(1);
    if (alto > 210) { alto = 210; ancho = +(210 * b.w / b.h).toFixed(1); }
    var estilo = $('estiloPoster') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'estiloPoster' }));
    estilo.textContent = '@page poster { size: ' + ancho + 'mm ' + alto + 'mm; margin: 0; }';
    var h = texto('div', null, 'hoja-poster');
    h.style.width = ancho + 'mm';
    h.style.height = (alto - 0.3) + 'mm';
    h.appendChild(planoImpreso(null, true));
    imprimir(h, estado.cond.nombre + ' - plano para imprimir');
  }

  $('btnPlanoPdf').addEventListener('click', imprimirPlano);
  $('btnImagenPdf').addEventListener('click', imprimirImagen);

  /* ---------- Filtro ---------- */
  function filtrar(f) {
    estado.filtro = f;
    $('filtroTodos').setAttribute('aria-pressed', String(!f));
    $('filtroDisp').setAttribute('aria-pressed', String(f === 'disponibles'));
    redibujar();
  }
  $('filtroTodos').addEventListener('click', function () { filtrar(null); });
  $('filtroDisp').addEventListener('click', function () { filtrar('disponibles'); });

  /* ---------- Zoom y arrastre ---------- */
  function actualizarTouch() {
    // Sin zoom, el dedo desplaza la página; con zoom, mueve el plano.
    marco.style.touchAction = vista && vista.acercado() ? 'none' : 'pan-x pan-y';
  }
  $('zoomMas').addEventListener('click', function () { vista.zoom(1.4); actualizarTouch(); });
  $('zoomMenos').addEventListener('click', function () { vista.zoom(1 / 1.4); actualizarTouch(); });
  $('zoomReset').addEventListener('click', function () { vista.reiniciar(); actualizarTouch(); });

  svg.addEventListener('wheel', function (e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    var p = vista.aPlano(e.clientX, e.clientY);
    vista.zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, p[0], p[1]);
    actualizarTouch();
  }, { passive: false });

  var arrastre = null, huboArrastre = false;
  svg.addEventListener('pointerdown', function (e) {
    huboArrastre = false;
    if (!vista.acercado()) return;
    arrastre = { x: e.clientX, y: e.clientY, activo: false, id: e.pointerId };
  });
  svg.addEventListener('pointermove', function (e) {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    var dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
    if (!arrastre.activo && Math.hypot(dx, dy) > 5) {
      arrastre.activo = true;
      svg.setPointerCapture(e.pointerId);
    }
    if (arrastre.activo) {
      vista.moverPx(dx, dy);
      arrastre.x = e.clientX; arrastre.y = e.clientY;
      huboArrastre = true;
    }
  });
  function soltar() { arrastre = null; }
  svg.addEventListener('pointerup', soltar);
  svg.addEventListener('pointercancel', soltar);

  svg.addEventListener('click', function (e) {
    if (huboArrastre) return;
    var g = e.target.closest('.forma-lote');
    seleccionar(g ? g.getAttribute('data-id') : null);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && estado.sel && !e.target.closest('input')) seleccionar(null);
  });

  window.addEventListener('hashchange', function () {
    var id = location.hash.slice(1);
    if (id && (!estado.cond || id !== estado.cond.id)) elegir(id, false);
  });

  $('pie').textContent = sitio.pie || 'Plano referencial. Áreas y medidas sujetas a verificación.';

  elegir(location.hash.slice(1), false);

  // Acceso desde la consola o desde otra página: Visor.abrir('16'), Visor.simular(8000, 24)…
  window.Visor = {
    abrir: function (numero) {
      var l = lotes(estado.cond).find(function (x) { return String(x.numero) === String(numero); });
      if (l) seleccionar(l.id);
    },
    simular: function (inicial, meses) {
      estado.sim = { inicial: inicial, meses: meses };
      if (estado.sel) pintarPanel();
    },
    imprimirCotizacion: function () {
      var l = estado.sel && estado.cond.formas.find(function (f) { return f.id === estado.sel; });
      if (l) imprimirCotizacion(l);
    },
    imprimirPlano: imprimirPlano,
    imprimirImagen: imprimirImagen
  };
})();
