// ===============================================================
// INVITACIONES-JUEGO — Generador de personajes (LABORATORIO)
// Archivo: functions/api/generar-cara.js
//
// NUEVO FLUJO:
// - Ya NO recibe un estilo elegido por el usuario.
// - Recibe 1 foto (cumpleaños) o 2 fotos (casamiento).
// - Genera automáticamente las 3 opciones:
//     1) doodle
//     2) retro
//     3) pixel
// - Devuelve una estructura con "opciones", para que la interfaz
//   pueda mostrarlas y el usuario elija una.
//
// IMPORTANTE:
// - Esta sigue siendo una herramienta de prueba.
// - El botón "Elegir este estilo" todavía NO impacta en el juego final.
// - Antes de llevarlo a producción hay que sumar autenticación,
//   persistencia, guardado definitivo, límites de uso y control de costos.
// ===============================================================

const MODELO = 'gpt-image-2.5-flare';
const CALIDAD = 'high';
const TAMANO = '1024x1536';
const MAX_FOTO_BYTES = 8 * 1024 * 1024;

const ORDEN_ESTILOS = ['doodle', 'retro', 'pixel'];

const ETIQUETA_ESTILO = {
  doodle: 'Doodle',
  retro: 'Retro',
  pixel: 'Pixel art',
};

const DESCRIPCION_ESTILO = {
  doodle: 'Dibujo simple, caricaturizado y simpático.',
  retro: 'Personaje de videojuego de plataformas clásico.',
  pixel: 'Sprite pixelado con píxeles cuadrados visibles.',
};

const PROMPT_COMUN = `
OBJETIVO:
Transformá a la persona de la foto adjunta en UN personaje ORIGINAL para
un videojuego 2D de invitaciones interactivas. La foto es solo referencia
de identidad. El resultado debe ser una CARICATURA ILUSTRADA, no un retrato.

MUY IMPORTANTE:
- NO copies la cara de manera realista.
- NO hagas una ilustración semirrealista.
- NO pegues un rostro fotográfico sobre un cuerpo dibujado.
- REDIBUJÁ el personaje desde cero en el estilo pedido.
- El resultado debe verse claramente dibujado o diseñado como personaje,
  no como una foto con filtro.

IDENTIDAD A CONSERVAR:
- tono de piel
- peinado y color de pelo
- forma general del rostro
- barba o bigote si existen
- anteojos si existen
- tipo y color general de la ropa visible

SIMPLIFICACIÓN VISUAL:
- reducir muchísimo el detalle facial
- evitar textura de piel, poros, brillos realistas y facciones complejas
- ojos simplificados, nariz simplificada, boca simplificada
- pelo como masas o bloques, no pelo por pelo
- barba como forma simplificada, no pelo por pelo
- ropa simplificada, con lectura clara

COMPOSICIÓN:
- mostrar UN SOLO personaje
- cuerpo completo, de cabeza a pies
- pose quieta, de pie
- brazos levemente separados del cuerpo
- piernas y pies bien visibles
- postura frontal o tres cuartos suave
- figura centrada
- sin fondo, sin piso, sin escenario, sin texto, sin objetos adicionales
- fondo REALMENTE transparente

CALIDAD:
- silueta clara para verse bien en celular
- personaje consistente y prolijo
- sin dedos extra, sin extremidades incorrectas, sin deformaciones
- debe verse como un personaje vendible y de calidad
`;

const PROMPTS_ESTILO = {
  doodle: `
ESTILO OBLIGATORIO: DOODLE
- Ilustración 2D muy simple, amable, caricaturizada y comercial.
- Contornos claros y limpios.
- Formas redondeadas y suaves.
- Cara claramente dibujada, no realista.
- Ojos simples, nariz mínima, boca simple, cejas simples.
- Cabeza un poco más grande que la proporción real, pero sin exagerar.
- Colores planos o con sombra MUY sutil y gráfica.
- Nada de modelado realista.
- Debe sentirse como un personaje doodle premium, prolijo y adorable.
`,

  retro: `
ESTILO OBLIGATORIO: RETRO
- Personaje 2D inspirado en videojuegos de plataformas clásicos de los 90.
- Diseño original, sin copiar franquicias.
- Cabeza un poco grande, manos y pies algo simplificados.
- Rasgos faciales gráficos y caricaturescos.
- Contornos expresivos y lectura rápida.
- Pocos tonos por prenda, sombreado simple por bloques.
- Debe verse como arte retro ilustrado, NO pixel art, NO realismo.
`,

  pixel: `
ESTILO OBLIGATORIO: PIXEL ART
- Crear un sprite de pixel art auténtico.
- Píxeles cuadrados visibles en todo el personaje.
- Baja resolución aparente, ampliada con bordes duros.
- Rasgos faciales representados con pocos píxeles.
- Peinado, barba y ropa resueltos por bloques de color.
- Sin antialiasing, sin degradados, sin suavizado.
- Debe verse como sprite diseñado píxel por píxel, NO foto pixelada.
`,
};

function responderJSON(datos, estado = 200) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function validarFoto(archivo, nombre) {
  if (!archivo || typeof archivo.arrayBuffer !== 'function' || typeof archivo.slice !== 'function') {
    return `Falta ${nombre}. Subí una foto JPG, PNG o WebP.`;
  }

  if (!archivo.size || archivo.size > MAX_FOTO_BYTES) {
    return `${nombre} debe pesar más de 0 bytes y como máximo 8 MB.`;
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
    return `${nombre} debe estar en formato JPG, PNG o WebP.`;
  }

  const b = new Uint8Array(await archivo.slice(0, 12).arrayBuffer());
  const esJPG = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const esPNG = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const esWebP =
    String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...b.slice(8, 12)) === 'WEBP';

  const valido =
    (archivo.type === 'image/jpeg' && esJPG) ||
    (archivo.type === 'image/png' && esPNG) ||
    (archivo.type === 'image/webp' && esWebP);

  return valido ? null : `${nombre} no parece ser una imagen válida.`;
}

function construirPrompt(estilo) {
  return `${PROMPT_COMUN}\n${PROMPTS_ESTILO[estilo]}`;
}

async function generarUnaImagen(foto, estilo, apiKey) {
  const formulario = new FormData();

  formulario.append('model', MODELO);
  formulario.append('image', foto, foto.name || 'referencia.png');
  formulario.append('prompt', construirPrompt(estilo));
  formulario.append('size', TAMANO);
  formulario.append('quality', CALIDAD);
  formulario.append('background', 'transparent');
  formulario.append('output_format', 'png');
  formulario.append('n', '1');

  const respuesta = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formulario,
  });

  const resultado = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    console.error(
      'Error de la API de imágenes:',
      respuesta.status,
      resultado?.error?.message || 'Sin detalle'
    );
    throw new Error(
      `OpenAI respondió con estado ${respuesta.status}. Revisá el log de Cloudflare.`
    );
  }

  const base64 = resultado?.data?.[0]?.b64_json;

  if (typeof base64 !== 'string' || !base64.length) {
    throw new Error('OpenAI no devolvió la imagen esperada.');
  }

  return `data:image/png;base64,${base64}`;
}

async function generarOpcionPorEstilo(fotos, estilo, apiKey) {
  const personajes = await Promise.all(
    fotos.map((archivo) => generarUnaImagen(archivo, estilo, apiKey))
  );

  return {
    estilo,
    etiqueta: ETIQUETA_ESTILO[estilo],
    descripcion: DESCRIPCION_ESTILO[estilo],
    personajes,
  };
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.OPENAI_API_KEY) {
      return responderJSON({
        error: 'Falta OPENAI_API_KEY en las variables de entorno de Cloudflare.'
      }, 500);
    }

    if (!request.headers.get('content-type')?.toLowerCase().includes('multipart/form-data')) {
      return responderJSON({
        error: 'El formulario debe enviarse como multipart/form-data.'
      }, 415);
    }

    const entrada = await request.formData();
    const foto = entrada.get('foto');
    const foto2 = entrada.get('foto2');

    const errorFoto1 = await validarFoto(foto, 'la primera foto');
    if (errorFoto1) {
      return responderJSON({ error: errorFoto1 }, 400);
    }

    const tieneSegundaFoto = foto2 !== null && foto2 !== '';

    if (tieneSegundaFoto) {
      const errorFoto2 = await validarFoto(foto2, 'la segunda foto');
      if (errorFoto2) {
        return responderJSON({ error: errorFoto2 }, 400);
      }
    }

    const fotos = tieneSegundaFoto ? [foto, foto2] : [foto];

    // Generamos automáticamente las 3 opciones.
    const opciones = await Promise.all(
      ORDEN_ESTILOS.map((estilo) =>
        generarOpcionPorEstilo(fotos, estilo, env.OPENAI_API_KEY)
      )
    );

    // Compatibilidad mínima con pruebas anteriores:
    const primeraOpcion = opciones[0] || null;

    return responderJSON({
      versionFlujo: 'tres_opciones',
      cantidadProtagonistas: fotos.length,
      estilos: ORDEN_ESTILOS,
      opciones,
      imagen: primeraOpcion?.personajes?.[0] || null,
      ...(fotos.length === 2 ? { imagen2: primeraOpcion?.personajes?.[1] || null } : {}),
    });

  } catch (error) {
    console.error('Fallo en generar-cara:', error);

    return responderJSON({
      error: 'No se pudieron generar las opciones de personaje.',
      detalle: String(error?.message || error),
    }, 502);
  }
}
