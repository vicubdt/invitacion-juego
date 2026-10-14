
// ===============================================================
// INVITACIONES-JUEGO — Generador de personajes (PRUEBA)
// Ubicación en GitHub: functions/api/generar-cara.js
//
// Recibe POST multipart/form-data:
//   foto   : primera foto (obligatoria)
//   foto2  : segunda foto (opcional)
//   estilo : doodle | retro | pixel (opcional, por defecto doodle)
//
// Devuelve { imagen, imagen2?, imagenes, estilo, cantidad }.
// Conserva "imagen" para que funcione la página de test original.
// IMPORTANTE: este endpoint aún NO debe ofrecerse a compradores.
// Antes de comercializarlo necesitará autorización, límite de uso,
// control de gastos, almacenamiento seguro y gestión de consentimiento.
// ===============================================================

const MODELO = 'gpt-image-2.5-flare';
const CALIDAD = 'high';
const TAMANO = '1024x1536';
const MAX_FOTO_BYTES = 8 * 1024 * 1024;

// MISMA DIRECCIÓN ARTÍSTICA GENERAL PARA TODOS LOS ESTILOS:
// son personajes de videojuego, NO retratos fotorrealistas.
const PROMPT_COMUN = `
OBJETIVO: transformá la persona de la foto adjunta en UN personaje
CARICATURIZADO, DE CUERPO COMPLETO, para un videojuego 2D de
invitaciones a fiestas. La foto sirve únicamente como REFERENCIA
DE IDENTIDAD. REDIBUJÁ el personaje desde cero.

MUY IMPORTANTE — CARICATURA, NO RETRATO:
- La cara tiene que estar claramente ILUSTRADA, no calcada, no fotografiada.
- Simplificá muchísimo el rostro: pocos trazos y formas básicas. Sin
  texturas de piel, poros, arrugas finas, brillos fotográficos, pestañas
  individuales, iris detallados, dientes realistas ni barba pelo por pelo.
- Los ojos NO deben parecer ojos de una fotografía. Dibujalos como
  elementos gráficos simples propios del estilo elegido.
- La nariz y la boca deben resolverse en formas muy simples.
- El pelo debe convertirse en masas o grupos de formas, no en hebras.
- Si hay barba, representala como una forma o área simplificada.
- NO uses una cara realista pegada sobre un cuerpo ilustrado.
- NO generes una ilustración semirrealista, retrato digital, pintura
  realista, imagen 3D, render CGI o filtro de foto.

CONSERVAR LA IDENTIDAD SIN COPIAR EL ROSTRO:
- Mantené la combinación de rasgos fácilmente reconocibles:
  color y forma general del pelo, peinado, tono de piel, barba o bigote,
  anteojos y accesorios verdaderamente visibles, silueta facial general.
- Simplificá TODOS esos rasgos a un lenguaje gráfico consistente.
- Conservá el tipo y color de la ropa que se ve. Si solo aparece el
  torso, completá el pantalón y el calzado de forma sencilla y discreta.
- No agregues disfraces, sombreros, mochilas ni accesorios inventados.
- No copies el fondo ni los objetos de la fotografía.

COMPOSICIÓN PARA EL JUEGO:
- Un único personaje, parado, de frente o tres cuartos suave.
- Pose neutra, brazos separados levemente del cuerpo, manos visibles.
- Dos piernas y ambos pies totalmente visibles; postura sin movimiento.
- Cuerpo entero de la cabeza a los zapatos, sin recortar ninguna parte.
- Figura centrada y grande, con margen transparente alrededor.
- Silueta clara al verla pequeña en la pantalla de un celular.
- Sin texto, firma, insignia, objetos sueltos, piso ni escenario.
- Fondo REALMENTE TRANSPARENTE (alfa), sin sombra sobre el suelo.

CALIDAD:
Debe verse como un personaje ORIGINAL de un videojuego 2D cuidado,
no como una foto con efecto artístico ni como un emoji genérico.
Evitá anatomía incorrecta, dedos extra y detalles aleatorios.
`;

const PROMPTS_ESTILO = {
  doodle: `
ESTILO OBLIGATORIO: DOODLE / DIBUJO EDITORIAL MUY SIMPLE.
- Dibujo 2D hecho de formas suaves y redondeadas, fresco y simpático.
- Contornos definidos con grosor uniforme y ligeramente orgánico.
- Colores planos. CERO degradados fotográficos. A lo sumo una pequeña
  sombra de color plano, nunca modelado realista.
- Cara deliberadamente esquemática: ojos como formas ovaladas o puntos,
  cejas como trazos, nariz como pequeño trazo, boca como línea expresiva.
- Pelo en 2 a 5 masas de color, sin textura ni mechones individuales.
- Barba o bigote como una sola forma gráfica, si corresponde.
- Proporciones caricaturescas: cabeza visiblemente más grande que
  la natural y cuerpo simplificado, pero sin convertirse en un bebé.
- Brazos, piernas, ropa y zapatos resueltos con formas sencillas.
- Debería poder reproducirse como una ilustración vectorial limpia.
- NO estilo manga, NO muñeco 3D, NO realismo, NO retrato detallado.
`,

  retro: `
ESTILO OBLIGATORIO: PERSONAJE RETRO DE PLATAFORMAS, ARTE 2D CLÁSICO.
- Inspiración en los videojuegos de plataformas de los años 90,
  pero diseño 100% ORIGINAL y sin copiar personajes conocidos.
- Silueta compacta, expresiva y dinámica AUNQUE LA POSE SEA QUIETA.
- Cabeza un poco grande, manos y calzado ligeramente exagerados.
- Rasgos faciales muy gráficos: ojos simples, nariz pequeña, boca breve,
  pelo y barba como zonas sólidas de color. NADA de cara fotográfica.
- Contorno exterior expresivo y contornos interiores mínimos.
- Iluminación con solamente 2 o 3 tonos planos por material,
  como arte promocional de un juego clásico de consola.
- Formas geométricas bien diseñadas, contraste fuerte y lectura rápida.
- NO foto pintada, NO sombreado suave, NO textura realista.
- A DIFERENCIA DE PIXEL ART: NO mostrar cuadrícula de píxeles ni
  bordes escalonados. Debe verse como un sprite retro ilustrado nítido.
`,

  pixel: `
ESTILO OBLIGATORIO: PIXEL ART AUTÉNTICO DE VIDEOJUEGO.
- Construí el personaje como un sprite de baja resolución aparente,
  aproximadamente 64 x 96 píxeles de diseño, ampliado con píxeles
  CUADRADOS de bordes perfectamente duros (nearest-neighbor).
- Cada parte de la cara debe estar representada por muy pocos píxeles.
  NO intentes reproducir los ojos ni la piel de forma realista.
- Peinado, barba, tono de piel y ropa deben reconocerse mediante
  BLOQUES DE COLOR, no por detalles diminutos.
- Usá una paleta limitada y sombras en 1 o 2 bloques por zona.
- Sin antialiasing, sin difuminados, sin pinceladas y sin degradados.
- Bordes escalonados claramente pixelados en TODO el personaje,
  incluidos rostro, pelo, manos, ropa y calzado.
- NO foto con filtro pixelado. NO ilustración convencional con fondo
  cuadriculado. Debe ser un sprite dibujado píxel por píxel.
`,
};

function json(datos, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function estiloValido(valor) {
  const nombre = String(valor || 'doodle').trim().toLowerCase();
  const alias = {
    'pixel-art': 'pixel', pixelart: 'pixel', 'pixel_art': 'pixel',
    '16bits': 'retro', 'retro-16bits': 'retro',
  };
  const estilo = alias[nombre] || nombre;
  return Object.prototype.hasOwnProperty.call(PROMPTS_ESTILO, estilo)
    ? estilo : null;
}

async function errorDeFoto(foto, etiqueta) {
  if (!foto || typeof foto.slice !== 'function' || typeof foto.size !== 'number') {
    return `Falta ${etiqueta}. Elegí una imagen JPG, PNG o WebP.`;
  }
  if (!foto.size || foto.size > MAX_FOTO_BYTES) {
    return `${etiqueta} debe pesar entre 1 byte y 8 MB.`;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(foto.type)) {
    return `${etiqueta} debe ser JPG, PNG o WebP.`;
  }

  // Verificación rápida del encabezado real (no solo la extensión).
  const bytes = new Uint8Array(await foto.slice(0, 12).arrayBuffer());
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if ((foto.type === 'image/jpeg' && jpg) ||
      (foto.type === 'image/png' && png) ||
      (foto.type === 'image/webp' && webp)) return null;
  return `${etiqueta} no parece un archivo de imagen válido.`;
}

async function generarPersonaje(foto, estilo, apiKey) {
  const datos = new FormData();
  datos.append('model', MODELO);
  datos.append('image', foto, foto.name || 'foto.png');
  datos.append('prompt', `${PROMPT_COMUN}\n${PROMPTS_ESTILO[estilo]}`);
  datos.append('size', TAMANO);
  datos.append('quality', CALIDAD);
  datos.append('background', 'transparent');
  datos.append('output_format', 'png');
  datos.append('n', '1');
  // No se envía input_fidelity: no corresponde a este modelo.

  const respuesta = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: datos,
  });
  const resultado = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    // El error técnico queda solo en Cloudflare, sin exponerlo al cliente.
    console.error('OpenAI:', respuesta.status, resultado?.error?.message || 'Error desconocido');
    throw new Error('OpenAI no pudo generar la imagen. Revisá los registros de Cloudflare.');
  }
  const base64 = resultado?.data?.[0]?.b64_json;
  if (!base64 || typeof base64 !== 'string') {
    throw new Error('OpenAI respondió sin una imagen válida.');
  }
  return `data:image/png;base64,${base64}`;
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.OPENAI_API_KEY) {
      return json({ error: 'Falta configurar OPENAI_API_KEY en Cloudflare.' }, 500);
    }
    if (!(request.headers.get('content-type') || '').toLowerCase().includes('multipart/form-data')) {
      return json({ error: 'El pedido debe enviarse como multipart/form-data.' }, 415);
    }

    const entrada = await request.formData();
    const estilo = estiloValido(entrada.get('estilo'));
    if (!estilo) return json({ error: 'Estilo inválido: elegí doodle, retro o pixel.' }, 400);

    const foto = entrada.get('foto');
    const foto2 = entrada.get('foto2');
    const error1 = await errorDeFoto(foto, 'La primera foto');
    if (error1) return json({ error: error1 }, 400);
    if (foto2 !== null && foto2 !== '') {
      const error2 = await errorDeFoto(foto2, 'La segunda foto');
      if (error2) return json({ error: error2 }, 400);
    }

    // Dos protagonistas: dos imágenes independientes para poder colocarlos
    // por separado en el juego. Ambos usan el mismo estilo elegido.
    const fotos = foto2 && foto2 !== '' ? [foto, foto2] : [foto];
    const imagenes = await Promise.all(
      fotos.map(archivo => generarPersonaje(archivo, estilo, env.OPENAI_API_KEY))
    );

    return json({
      imagen: imagenes[0], // Compatibilidad con test-ia anterior.
      ...(imagenes.length === 2 ? { imagen2: imagenes[1] } : {}),
      imagenes,
      estilo,
      cantidad: imagenes.length,
    });
  } catch (error) {
    console.error('Error en generar-cara:', error);
    return json({
      error: 'No se pudo generar el personaje. Probá nuevamente más tarde.',
    }, 502);
  }
}
