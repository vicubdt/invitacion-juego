// ===============================================================
// INVITACIONES-JUEGO — Generador de personajes (LABORATORIO)
// Archivo: functions/api/generar-cara.js
//
// FLUJO ACTUAL:
// - Recibe 1 foto (cumpleaños) o 2 fotos (casamiento).
// - Genera automáticamente 3 opciones:
//     1) doodle
//     2) retro
//     3) pixel
// - Devuelve una estructura con "opciones" para que la interfaz
//   las muestre y el usuario elija una.
//
// AJUSTE ARTÍSTICO DE ESTA VERSIÓN:
// - Menos parecido exacto a la foto.
// - Más prioridad al estilo visual.
// - Doodle y retro deben diferenciarse mucho más entre sí.
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
  doodle: 'Dibujo simple, adorable, suave y caricaturizado.',
  retro: 'Personaje de videojuego clásico, con más presencia visual.',
  pixel: 'Sprite pixelado con píxeles cuadrados visibles.',
};

const PROMPT_COMUN = `
OBJETIVO:
Transformá a la persona de la foto adjunta en UN personaje ORIGINAL para
un videojuego 2D de invitaciones interactivas.

IMPORTANTE:
La foto es solo una REFERENCIA GENERAL. NO busques una copia exacta del
rostro real. NO hace falta que el personaje sea igual a la persona.
Lo importante es que conserve rasgos GENERALES y DISTINTIVOS para que
se sienta identificable, pero siempre priorizando el estilo visual.

PRIORIDAD DE ESTA GENERACIÓN:
1. que el estilo visual sea claro y fuerte
2. que el personaje sea lindo, vendible y consistente
3. que conserve rasgos generales reconocibles
4. NO buscar parecido exacto ni retrato fiel

QUÉ TOMAR DE LA FOTO:
- tono de piel aproximado
- color y peinado general del pelo
- barba o bigote si son notorios
- anteojos si aparecen
- vibra general del rostro
- tipo y color general de la ropa visible

QUÉ NO HACER:
- no copiar exactamente la cara real
- no reproducir facciones de manera precisa
- no hacer retrato semirrealista
- no pegar una cara realista sobre un cuerpo dibujado
- no usar texturas realistas de piel, ojos o pelo
- no copiar el fondo ni los objetos de la foto
- no agregar accesorios inventados llamativos

SIMPLIFICACIÓN:
- resumir los rasgos faciales a una versión caricaturizada
- usar una interpretación visual clara del personaje
- pelo simplificado en masas o bloques
- barba simplificada como forma general si corresponde
- ropa simplificada pero reconocible
- mantener solo la esencia visual de la persona

COMPOSICIÓN:
- mostrar UN SOLO personaje
- cuerpo completo, de cabeza a pies
- pose quieta, de pie
- brazos levemente separados del cuerpo
- piernas y pies bien visibles
- figura centrada
- sin fondo, sin piso, sin escenario, sin texto, sin objetos adicionales
- fondo REALMENTE transparente

CALIDAD:
- personaje prolijo
- silueta clara para verse bien en celular
- anatomía correcta dentro del estilo
- sin extremidades extra, sin dedos de más, sin deformaciones
- resultado atractivo, comercial y consistente
`;

const PROMPTS_ESTILO = {
  doodle: `
ESTILO OBLIGATORIO: DOODLE

PERSONALIDAD VISUAL:
- Debe sentirse tierno, encantador, suave, adorable y muy simple.
- Tiene que parecer una ilustración cute premium, casi como un sticker elegante o personaje de papelería ilustrada.
- Debe ser claramente más dulce y minimalista que el estilo retro.

FORMA Y PROPORCIONES:
- Cabeza visiblemente más grande que el cuerpo.
- Cuerpo pequeño, simplificado y amable.
- Brazos y piernas simples, con muy pocos detalles.
- Manos muy simplificadas.
- Pies y calzado simples.

ROSTRO:
- Cara muy resumida, con pocos trazos.
- Ojos pequeños y simples, tipo óvalo, punto o forma mínima.
- Nariz casi mínima o reducida a un pequeño trazo.
- Boca simple y amable.
- Expresión simpática y serena.
- Rasgos redondeados y suaves.

TRAZO Y COLOR:
- Contornos limpios, suaves y agradables.
- Formas redondeadas.
- Colores planos.
- Casi sin sombreado; como máximo una sombra gráfica muy sutil.
- Nada de volumen fuerte.
- Nada de contraste agresivo.
- Nada de apariencia de personaje de acción o videojuego clásico.

IMPORTANTE:
- NO debe parecer un personaje retro.
- NO debe parecer realista.
- NO debe parecer un muñeco genérico sin encanto.
- Tiene que sentirse claramente “cute”, simple, blando y minimalista.
`,

  retro: `
ESTILO OBLIGATORIO: RETRO

PERSONALIDAD VISUAL:
- Debe sentirse como un personaje de videojuego de plataformas clásico.
- Tiene que verse con más presencia, más actitud visual y más fuerza que el estilo doodle.
- Debe parecer arte promocional o personaje jugable de un platformer 2D clásico.

FORMA Y PROPORCIONES:
- Proporciones caricaturizadas pero más estructuradas y firmes que en doodle.
- Cabeza un poco grande, pero no tan tierna ni tan redonda como en doodle.
- Hombros, manos y zapatos con más peso visual.
- Silueta más sólida y con más carácter.
- Postura más firme y con más energía, aunque siga quieto.

ROSTRO:
- Rostro simplificado, pero con más presencia y definición que en doodle.
- Ojos más expresivos.
- Cejas más marcadas.
- Boca breve pero clara.
- Nariz simple.
- Pelo y barba simplificados en masas definidas.

TRAZO Y COLOR:
- Contornos más marcados.
- Formas algo más angulares o estructuradas.
- Sombreado por bloques más evidente.
- Más contraste.
- Más lectura de volumen que doodle.
- Sensación de diseño de personaje de videojuego.

IMPORTANTE:
- NO debe parecer una ilustración suave o editorial.
- NO debe parecer pixel art.
- NO debe parecer realista.
- Tiene que distinguirse claramente del doodle por su actitud, estructura y presencia visual.
- Diseño original, sin copiar franquicias existentes.
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
- Mantener una silueta clara y legible.
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

    const opciones = await Promise.all(
      ORDEN_ESTILOS.map((estilo) =>
        generarOpcionPorEstilo(fotos, estilo, env.OPENAI_API_KEY)
      )
    );

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
