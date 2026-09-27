/*
 * Datos de los condominios que muestra el sitio.
 * Este archivo lo genera el editor (editor.html → "Publicar cambios").
 * Puedes editarlo a mano: cada forma del plano ocupa una línea.
 */
window.SITIO = {"nombre": "Mapa de Lotes", "marcas": {"waka": {"nombre": "WAKA", "lema": "Eco-Condominio", "color": "#8c1d1d", "fondo": "assets/img/fondo-waka.svg", "logo": "assets/img/logo-waka.svg"}, "ecoraiz": {"nombre": "Ecoraiz", "lema": "Condominios ecológicos", "color": "#7a4a26", "fondo": "assets/img/fondo-ecoraiz.svg", "logo": "assets/img/logo-ecoraiz.svg"}}};

window.CONDOMINIOS = [
  {
    "id": "la-finca",
    "nombre": "La Finca",
    "marca": "waka",
    "mostrarSellos": true,
    "ubicacion": "El Carmen, Chincha",
    "descripcion": "Eco-condominio Waka. Lotes campestres de 730 a 1,000 m² junto a la carretera Chincha – El Carmen.",
    "moneda": "US$",
    "whatsapp": "",
    "lienzo": {"ancho": 1755, "alto": 906},
    "referencia": "assets/img/la-finca-referencia.webp",
    "financiamiento": {"base": "contado", "metodo": "frances", "tasaAnual": 10, "inicialSugerida": 8000, "inicialMinima": 5000, "plazos": [{"meses": 12}, {"meses": 18}, {"meses": 20}, {"meses": 24}], "plazoMaximo": 36, "precioM2": "", "validezDias": 15, "mostrarTasa": true},
    "formas": [
      {"id": "terreno", "tipo": "terreno", "nombre": "Terreno", "puntos": [[599, 27], [1748, 9], [1146, 866], [4, 868]]},
      {"id": "area-club", "tipo": "area", "nombre": "Club house y piscina", "puntos": [[414, 752], [576, 752], [589, 858], [366, 858]]},
      {"id": "area-deportiva", "tipo": "area", "nombre": "Zona deportiva", "puntos": [[630, 752], [764, 752], [764, 858], [625, 858]]},
      {"id": "carretera", "tipo": "via", "nombre": "Carretera Chincha – El Carmen", "color": "#8d9189", "puntos": [[0, 864], [1755, 864], [1755, 906], [0, 906]]},
      {"id": "via-izquierda", "tipo": "via", "nombre": "Vía izquierda", "puntos": [[868, 96], [908, 96], [381, 790], [341, 790]]},
      {"id": "via-derecha", "tipo": "via", "nombre": "Vía derecha", "puntos": [[1385, 80], [1423, 80], [883, 794], [841, 745], [882, 745]]},
      {"id": "area-de-paso", "tipo": "via", "nombre": "Área de paso", "puntos": [[400, 716], [934, 716], [911, 749], [375, 749]]},
      {"id": "ingreso", "tipo": "via", "nombre": "Ingreso", "puntos": [[580, 747], [626, 747], [622, 866], [594, 866]]},
      {"id": "rotonda-izquierda", "tipo": "rotonda", "nombre": "Rotonda", "cx": 884, "cy": 100, "rx": 36, "ry": 26},
      {"id": "rotonda-derecha", "tipo": "rotonda", "nombre": "Rotonda", "cx": 1404, "cy": 82, "rx": 35, "ry": 24},
      {"id": "lote-01", "tipo": "lote", "numero": "01", "estado": "vendido", "area": "933.21", "perimetro": "148.92", "puntos": [[58.4, 799.7], [387.7, 795.5], [359.4, 858], [17.2, 858]]},
      {"id": "lote-02", "tipo": "lote", "numero": "02", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[115.5, 719.1], [390.4, 714], [332.5, 790.2], [62.7, 793.6]]},
      {"id": "lote-03", "tipo": "lote", "numero": "03", "estado": "disponible", "area": "896.20", "perimetro": "138.29", "precioContado": 37000, "precioCredito": 40000, "responsable": "Freddy", "medidas": "47.83 · 20.86 · 47.85 · 21.75 ml", "puntos": [[175.3, 634.5], [449, 637], [395, 708], [119.8, 713]]},
      {"id": "lote-04", "tipo": "lote", "numero": "04", "estado": "vendido", "area": "898.76", "perimetro": "138.24", "puntos": [[233.7, 552], [510.9, 555.4], [453.5, 631], [179.5, 628.5]]},
      {"id": "lote-05", "tipo": "lote", "numero": "05", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[288.1, 475.1], [571.8, 475.4], [515.5, 549.5], [237.9, 546.1]]},
      {"id": "lote-06", "tipo": "lote", "numero": "06", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[340.8, 400.5], [628.7, 400.5], [576.3, 469.4], [292.3, 469.1]]},
      {"id": "lote-07", "tipo": "lote", "numero": "07", "estado": "vendido", "area": "902.27", "perimetro": "141.47", "puntos": [[396, 322.6], [690.6, 319], [633.3, 394.5], [345.1, 394.5]]},
      {"id": "lote-08", "tipo": "lote", "numero": "08", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[447.6, 249.7], [749.8, 241.1], [695.2, 313], [400.3, 316.5]]},
      {"id": "lote-09", "tipo": "lote", "numero": "09", "estado": "vendido", "area": "900.03", "perimetro": "145.37", "puntos": [[500.4, 175], [805.7, 167.6], [754.5, 235], [451.9, 243.5]]},
      {"id": "lote-10", "tipo": "lote", "numero": "10", "estado": "vendido", "area": "899.01", "perimetro": "141.88", "puntos": [[555.2, 97.6], [504.7, 168.9], [810.3, 161.5], [846.3, 114.1], [843.4, 108.3], [842.1, 102.1], [842.4, 95.8], [843.9, 90.4]]},
      {"id": "lote-11", "tipo": "lote", "numero": "11", "estado": "disponible", "area": "731.90", "perimetro": "138.35", "precioContado": 30000, "precioCredito": 37000, "responsable": "Freddy", "medidas": "53.45 · 12.59 · 49.28 · 15.56 + curva ml", "puntos": [[912.4, 27.1], [601.6, 32], [559.5, 91.5], [847.4, 84.3], [854.3, 77.4], [863, 72.3], [873.1, 69.1], [883.2, 68]]},
      {"id": "lote-12", "tipo": "lote", "numero": "12", "estado": "disponible", "area": "827.38", "perimetro": "132.61", "precioContado": 32000, "precioCredito": 37000, "responsable": "Freddy", "medidas": "43.04 · 23.60 · 37.61 + curva ml", "puntos": [[1142.6, 110], [1208.7, 22.4], [919.8, 27], [890.4, 68.4], [898.8, 70.1], [907.3, 73.4], [913.7, 77.4], [919.7, 83.1], [923.8, 89.7], [925.6, 95.8], [925.8, 103.1], [924.1, 109.5]]},
      {"id": "lote-13", "tipo": "lote", "numero": "13", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[835.3, 201.1], [1072.5, 202.9], [1138.1, 116], [920.7, 115.5], [914.7, 121.9], [907.3, 126.6], [897.5, 130.3], [887.9, 131.9]]},
      {"id": "lote-14", "tipo": "lote", "numero": "14", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[830.8, 207.1], [1068, 208.9], [994.5, 306.4], [753.6, 308.6]]},
      {"id": "lote-15", "tipo": "lote", "numero": "15", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[749, 314.6], [989.9, 312.4], [916.8, 409.4], [677.2, 409.1]]},
      {"id": "lote-16", "tipo": "lote", "numero": "16", "estado": "disponible", "area": "1000", "perimetro": "150", "precioContado": 40000, "precioCredito": 45000, "responsable": "Freddy", "puntos": [[672.7, 415.1], [912.2, 415.4], [839.8, 511.4], [596.3, 515.6]]},
      {"id": "lote-17", "tipo": "lote", "numero": "17", "estado": "disponible", "area": "1000", "perimetro": "150", "precioContado": 40000, "precioCredito": 45000, "responsable": "Freddy", "puntos": [[591.7, 521.7], [835.2, 517.5], [762.5, 613.9], [519.9, 616.1]]},
      {"id": "lote-18", "tipo": "lote", "numero": "18", "estado": "disponible", "area": "1000", "perimetro": "150", "precioContado": 40000, "precioCredito": 45000, "responsable": "Freddy", "puntos": [[515.3, 622.2], [757.9, 619.9], [690, 710], [448.5, 710]]},
      {"id": "lote-19", "tipo": "lote", "numero": "19", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[784.2, 595.1], [987.6, 596.9], [901.4, 710], [697.5, 710]]},
      {"id": "lote-20", "tipo": "lote", "numero": "20", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[872.5, 478], [1077.8, 478.5], [992.2, 590.9], [788.7, 589.1]]},
      {"id": "lote-21", "tipo": "lote", "numero": "21", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[961.5, 360.1], [1168.6, 359.4], [1082.4, 472.5], [877, 472]]},
      {"id": "lote-22", "tipo": "lote", "numero": "22", "estado": "vendido", "area": "", "perimetro": "", "nota": "En el plano original figuraba como SEPARADO.", "puntos": [[1050.9, 241.6], [1258.1, 241.9], [1173.1, 353.4], [966, 354.1]]},
      {"id": "lote-23", "tipo": "lote", "numero": "23", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[1094.2, 184.1], [1302.3, 183.9], [1262.6, 235.9], [1055.4, 235.6]]},
      {"id": "lote-24", "tipo": "lote", "numero": "24", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[1136.5, 128.1], [1344.9, 127.9], [1306.9, 177.9], [1098.8, 178.1]]},
      {"id": "lote-25", "tipo": "lote", "numero": "25", "estado": "vendido", "area": "866.53", "perimetro": "133.32", "puntos": [[1429.5, 19], [1216.3, 22.3], [1141, 122.1], [1347.9, 121.9], [1368.1, 96.5], [1364.4, 89.8], [1363, 82], [1364.4, 74.2], [1368.5, 67], [1375, 60.8], [1383.5, 56], [1393.4, 53], [1403.4, 52]]},
      {"id": "lote-26", "tipo": "lote", "numero": "26", "estado": "vendido", "area": "780.91", "perimetro": "135.56", "puntos": [[1692.7, 79], [1738.3, 14.2], [1437.3, 18.9], [1410.7, 52.4], [1418.4, 53.9], [1424.5, 56], [1430, 58.8], [1434.8, 62.2], [1439.5, 67], [1442.4, 71.4], [1444.2, 76.1], [1445, 81.3]]},
      {"id": "lote-27", "tipo": "lote", "numero": "27", "estado": "disponible", "area": "976.12", "perimetro": "142.59", "precioContado": 37000, "precioCredito": 40000, "responsable": "Freddy", "medidas": "44.25 · 24.34 · 46.99 · 16.42 + curva ml", "puntos": [[1361.8, 175.5], [1629.5, 169], [1688.4, 85.1], [1444.3, 87.4], [1442.8, 91.6], [1440.2, 96.1], [1436.5, 100.3], [1433, 103.2], [1427.9, 106.4], [1422.1, 108.9], [1410.5, 111.6]]},
      {"id": "lote-28", "tipo": "lote", "numero": "28", "estado": "disponible", "area": "971.10", "perimetro": "142.02", "precioContado": 37000, "precioCredito": 40000, "responsable": "Freddy", "medidas": "46.99 · 23.60 · 47.63 · 23.60 ml", "puntos": [[1357.1, 181.6], [1625.2, 175.1], [1566, 259.4], [1293.9, 264.6]]},
      {"id": "lote-29", "tipo": "lote", "numero": "29", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[1289.3, 270.7], [1561.7, 265.5], [1504.9, 346.4], [1228.4, 350.6]]},
      {"id": "lote-30", "tipo": "lote", "numero": "30", "estado": "disponible", "area": "961.17", "perimetro": "142.48", "precioContado": 37000, "precioCredito": 40000, "responsable": "Freddy", "medidas": "48.26 · 22.90 · 48.66 · 22.66 ml", "puntos": [[1223.8, 356.6], [1500.6, 352.5], [1441.2, 437], [1161, 439]]},
      {"id": "lote-31", "tipo": "lote", "numero": "31", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[1156.4, 445.1], [1437, 443], [1383.7, 518.9], [1099.2, 520.1]]},
      {"id": "lote-32", "tipo": "lote", "numero": "32", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[1094.6, 526.2], [1379.5, 524.9], [1324.7, 602.9], [1036.4, 602.6]]},
      {"id": "lote-33", "tipo": "lote", "numero": "33", "estado": "vendido", "area": "949.11", "perimetro": "143.90", "puntos": [[1031.8, 608.5], [1320.5, 608.9], [1267.4, 684.5], [973.1, 685.5]]},
      {"id": "lote-34", "tipo": "lote", "numero": "34", "estado": "disponible", "area": "945.30", "perimetro": "144.34", "precioContado": 37000, "precioCredito": 40000, "responsable": "Freddy", "medidas": "50.64 · 21.17 · 51.20 · 21.32 ml", "puntos": [[968.6, 691.5], [1263.2, 690.5], [1209.8, 766.5], [910.7, 767.5]]},
      {"id": "lote-35", "tipo": "lote", "numero": "35", "estado": "vendido", "area": "", "perimetro": "", "puntos": [[906.1, 773.6], [1205.6, 772.5], [1145.5, 858], [841.7, 858]]},
      {"id": "lote-36", "tipo": "lote", "numero": "36", "estado": "vendido", "area": "", "perimetro": "", "nota": "Número provisional: en el plano original este lote no muestra número.", "giroEtiqueta": -90, "puntos": [[770, 755], [841, 755], [877, 801], [835, 858], [770, 858]]},
      {"id": "texto-paso", "tipo": "texto", "texto": "ÁREA DE PASO", "x": 648, "y": 737, "tam": 13, "color": "#4a4420"},
      {"id": "texto-carretera", "tipo": "texto", "texto": "CARRETERA CHINCHA – EL CARMEN", "x": 877, "y": 892, "tam": 15, "color": "#f5f5ef"}
    ]
  }
];
