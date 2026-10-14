
const MODELO_IMAGEN = 'gpt-image-2.5-flare';
const CALIDAD_IMAGEN = 'high';
const TAMANO_IMAGEN = '1024x1536';
const MAX_FOTO_BYTES = 8 * 1024 * 1024;

const INSTRUCCIONES_ESTILO = {
  doodle: `
ESTILO DOODLE ILUSTRADO PREMIUM:
- Ilustración 2D moderna, cálida, divertida y profesional, como el arte de un videojuego independiente muy cuidado.
- Silueta redondeada, proporciones ligeramente caricaturizadas y expresiones naturales.
- Cabeza apenas más grande que la real, pero NO enorme. Cuerpo completo creíble dentro del estilo.
- Rostro simplificado SIN borrar sus rasgos distintivos. Ojos, cejas, nariz, boca y barba deben conservar diferencias individuales.
- Contornos limpios de grosor consistente; colores armónicos, con sombras muy sutiles si mejoran el acabado.
- Evitar muñeco infantil genérico, emoji, stick figure, manos de palitos y cabeza perfectamente circular.`,

  retro: `
ESTILO RETRO DE PLATAFORMAS DE 16 BITS:
- Personaje 2D inspirado en la dirección artística de videojuegos de plataformas de los años noventa, con identidad visual original.
- Formas definidas, volumen estilizado, sombras por bloques y una paleta de colores armoniosa.
- Detalles suficientes para reconocer el peinado, el rostro, la barba y la ropa de la persona.
- Proporciones propias de un personaje de videojuego retro, con anatomía legible y postura firme.
- Bordes nítidos y acabado artesanal; evitar apariencia de sticker moderno o ilustración fotográfica.
- NO copiar personajes, disfraces, símbolos ni diseños de franquicias existentes.`,

  pixel: `
ESTILO PIXEL ART:
- Sprite 2D original de cuerpo completo, construido visualmente con píxeles cuadrados claramente perceptibles.
- Resolución aparente baja y grupos de píxeles deliberados, con contornos escalonados consistentes.
- Paleta limitada pero suficiente para distinguir el tono de piel, peinado, barba, rostro y prendas.
- Silueta fuerte y legible al reducir su tamaño en la pantalla de un celular.
- Sombras pixeladas por bloques, sin antialiasing, sin bordes suavizados y sin mezcla de estilos.
- NO aplicar solamente un filtro pixelado a una ilustración normal: diseñar el personaje como auténtico arte pixelado.`,
};

const INSTRUCCIONES_COMUNES = `
TAREA:
Convertí exclusivamente a la persona de la fotografía adjunta en UN personaje original de videojuego 2D, de cuerpo completo, listo para usar como protagonista de una invitación interactiva de alta calidad.

PRIORIDAD 1 — IDENTIDAD Y PARECIDO:
Usá la fotografía como referencia principal, NO como inspiración vaga.
Conservá todo lo que sea visible y distintivo: forma general del rostro, peinado y color de pelo, línea del cabello, cejas, nariz, ojos, sonrisa, tono de piel, barba o bigote, anteojos y otros accesorios reales.
Conservá el tipo y los colores de la ropa que se ve en la foto, simplificándolos de acuerdo con el estilo visual.
No agregues sombreros, disfraces, mochilas, joyas, accesorios ni cambios de peinado que no estén en la referencia.
Si las piernas, los zapatos o parte de la ropa no se ven, completá discretamente esas zonas de forma coherente y sencilla, sin inventar detalles llamativos. No afirmes conocer características que la foto no muestra.
La persona debe resultar reconocible para alguien que conoce su fotografía, sin pretender exactitud fotográfica.

PRIORIDAD 2 — DISEÑO DE PERSONAJE PARA JUEGO:
Dibujá UNA SOLA figura completa, desde la parte superior del pelo hasta la suela de ambos zapatos.
Pose neutra y quieta, de pie, sin correr ni saltar. Brazos relajados y separados del torso; piernas y pies claramente visibles y separados.
Postura frontal o apenas girada en tres cuartos, con silueta ordenada y fácil de leer cuando aparece pequeña en el celular.
Mantené el rostro expresivo y amable, acorde a la expresión original sin exagerarla.
Centrado, vertical, ocupando aproximadamente el 85 % de la altura del lienzo y dejando un margen fino en todos los lados.
Proporciones naturales dentro del estilo escogido; NO estirar ni aplastar el cuerpo.

PRIORIDAD 3 — ENTREGA TÉCNICA:
Un solo personaje aislado. Fondo TOTALMENTE transparente, con transparencia real (canal alfa).
Sin piso, paisaje, sombras proyectadas en el suelo, recuadros, marcos, letras, nombres, logotipos ni otros objetos.
No recortes la cabeza, el cabello, las manos, las piernas ni el calzado.
Ilustración prolija, profesional y consistente, sin extremidades extras, dedos deformados ni elementos superpuestos por error.
No agregues otras personas. No hagas una hoja de sprites ni varias poses.
`;

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

function normalizarEstilo(valor) {
  const estilo = String(valor || 'doodle').trim().toLowerCase();
  if (estilo === 'pixel-art' || estilo === 'pixel_art' || estilo === 'pixelart') return 'pixel';
  if (estilo === 'retro-16bits' || estilo === '16bits') return 'retro';
  return estilo;
}

async function validarFoto(archivo, nombre) {
  if (!archivo || typeof archivo.arrayBuffer !== 'function' || typeof archivo.slice !== 'function') {
    return `Falta ${nombre}. Subí una foto JPG, PNG o WebP.`;
  }
  if (!archivo.size || archivo.size > MAX_FOTO_BYTES) {
    return `${nombre} debe pesar más de 0 bytes y como máximo 8 MB.`;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
    return `${nombre} debe estar en formato JPG, PNG o WebP (no HEIC).`;
  }

  const b = new Uint8Array(await archivo.slice(0, 12).arrayBuffer());
  const esJPG = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const esPNG = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const esWebP = String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...b.slice(8, 12)) === 'WEBP';

  const valido = (archivo.type === 'image/jpeg' && esJPG) ||
    (archivo.type === 'image/png' && esPNG) ||
    (archivo.type === 'image/webp' && esWebP);

  return valido ? null : `${nombre} no parece ser una imagen válida.`;
}

async function generarUnaImagen(foto, estilo, apiKey) {
  const formulario = new FormData();

  formulario.append('model', MODELO_IMAGEN);
  formulario.append('image', foto, foto.name || 'referencia.png');
  formulario.append('prompt', INSTRUCCIONES_COMUNES + '\n' + INSTRUCCIONES_ESTILO[estilo]);
  formulario.append('size', TAMANO_IMAGEN);
  formulario.append('quality', CALIDAD_IMAGEN);
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
      `OpenAI respondió con estado ${respuesta.status}. Consultá el registro de Cloudflare.`
    );
  }

  const base64 = resultado?.data?.[0]?.b64_json;

  if (typeof base64 !== 'string' || !base64.length) {
    throw new Error('OpenAI no devolvió la imagen esperada.');
  }

  return `data:image/png;base64,${base64}`;
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
    const estilo = normalizarEstilo(entrada.get('estilo'));

    if (!Object.hasOwn(INSTRUCCIONES_ESTILO, estilo)) {
      return responderJSON({
        error: 'Estilo no válido. Elegí doodle, retro o pixel.'
      }, 400);
    }

    const errorFoto1 = await validarFoto(foto, 'La primera foto');

    if (errorFoto1) {
      return responderJSON({ error: errorFoto1 }, 400);
    }

    const tieneSegundaFoto = foto2 !== null && foto2 !== '';

    if (tieneSegundaFoto) {
      const errorFoto2 = await validarFoto(foto2, 'La segunda foto');

      if (errorFoto2) {
        return responderJSON({ error: errorFoto2 }, 400);
      }
    }

    // Cada protagonista se genera independientemente.
    // Si hay dos fotos, las solicitudes se procesan en paralelo.
    const fotos = tieneSegundaFoto ? [foto, foto2] : [foto];

    const imagenes = await Promise.all(
      fotos.map(archivo =>
        generarUnaImagen(archivo, estilo, env.OPENAI_API_KEY)
      )
    );

    return responderJSON({
      imagen: imagenes[0],
      ...(imagenes.length === 2 ? { imagen2: imagenes[1] } : {}),
      imagenes,
      estilo,
      cantidad: imagenes.length,
    });

  } catch (error) {
    console.error('Fallo en generar-cara:', error);

    return responderJSON({
      error: 'No se pudieron generar los personajes.',
      detalle: String(error?.message || error),
    }, 502);
  }
}
