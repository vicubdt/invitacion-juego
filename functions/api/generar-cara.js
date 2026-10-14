// ===============================================================
// INVITACIONES-JUEGO — generador de personajes, versión pareja v2
// GitHub: functions/api/generar-cara.js
//
// ENTRADA (multipart/form-data):
//   foto: primera foto (obligatoria)
//   foto2: segunda foto (opcional; casamiento)
//   vestimenta1: "vestido" o "traje" (solo casamiento)
//   vestimenta2: "vestido" o "traje" (solo casamiento)
//
// SALIDA: 3 opciones agrupadas por estilo, con 1 o 2 personajes.
// Se conserva la forma del JSON que ya utiliza test-ia.html.
// NO realiza generación durante el despliegue ni la revisión.
//
// IMPORTANTE: LABORATORIO, NO PRODUCTO FINAL. Todavía requiere
// autenticación, control de una generación por compra, almacenamiento
// persistente, consentimiento para fotos y límite de consumo.
// ===============================================================

const MODELO = 'gpt-image-2.5-flare'; // Conservamos el modelo ya probado.
const CALIDAD = 'high';               // Conservamos la calidad aprobada.
const TAMANO = '1024x1536';
const MAX_FOTO_BYTES = 8 * 1024 * 1024;
const ESTILOS = ['doodle', 'retro', 'pixel'];

const INFO = {
  doodle: {
    etiqueta: 'Doodle',
    descripcion: 'Dibujo simple, adorable, suave y caricaturizado.',
    prompt: `
DOODLE: ilustración editorial 2D premium, tierna y minimalista.
Cabeza redondeada, rostro con ojos simples y nariz mínima; cuerpo
compacto pero NO diminuto; manos y zapatos sencillos. Formas suaves,
trazo uniforme, colores planos, prácticamente sin sombras.
NO retrato, NO render 3D, NO anime detallado, NO hiperrealismo.
El resultado debe funcionar como sticker de videojuego elegante.
`
  },
  retro: {
    etiqueta: 'Retro',
    descripcion: 'Plataformero 2D clásico, gráfico y poco detallado.',
    prompt: `
RETRO: personaje original de videojuego 2D clásico de plataformas,
con formas geométricas y estructura más firme que doodle. NO PIXEL ART.
Cabeza caricaturizada, contorno algo más grueso, manos y zapatos
simplificados, solo 2 tonos planos por material.
Rostro construido con pocos trazos; ojos y cejas gráficos.
Nada de piel realista, arrugas, anatomía marcada, textiles complejos,
pliegues elaborados, iluminación dramática ni semirrealismo.
La diferencia con doodle debe estar en la silueta y en el trazo,
NUNCA en añadir realismo ni detalles excesivos.
`
  },
  pixel: {
    etiqueta: 'Pixel art',
    descripcion: 'Sprite de videojuego con píxeles cuadrados visibles.',
    prompt: `
PIXEL ART: sprite auténtico de videojuego con píxeles cuadrados,
contornos escalonados, paleta limitada y sombreado por bloques.
Rostro con poquísimos píxeles y sin antialiasing ni degradados.
NO ilustración convencional filtrada; crear el personaje como pixel art.
Aunque sea pixelado, conservar exactamente la misma guía de
proporciones de la pareja y el contorno general del cuerpo.
`
  }
};

const GUIA_COMPARTIDA = `
CREÁ UN ÚNICO PERSONAJE ORIGINAL DE VIDEOJUEGO 2D A PARTIR DE LA FOTO.

ORDEN DE PRIORIDADES:
1. Estilo artístico elegido y coherencia con el resto del videojuego.
2. PROPORCIONES CONSISTENTES ENTRE DOS PERSONAJES DE LA MISMA PAREJA.
3. Rasgos generales que permitan identificarse (pelo, barba, tono de
   piel, anteojos y expresión general), SIN copiar el rostro exacto.

GUÍA DE DISEÑO OBLIGATORIA PARA TODOS LOS PERSONAJES DE LA PAREJA:
- Mismo lenguaje de dibujo, misma escala y mismo grosor relativo
  de contornos; misma cantidad de detalle en cara, manos y ropa.
- Altura ilustrada similar a la de otro personaje de este estilo.
- Cabeza (incluido cabello) ~28–30 % de la altura total del personaje.
- Línea de los ojos y proporción cabeza/hombros compatibles.
- Torso ~31 % y piernas/calzado ~40 % de la altura total (orientativo).
- NO una cabeza gigante en uno y pequeña en el otro.
- NO un cuerpo de niño con otro de adulto. Ambos son adultos.
- Se permiten diferencias sutiles de complexión, cabello y vestido,
  sin alterar la arquitectura de personaje compartida.
- Dibujar una sola figura completa, centrada, de pies a cabeza.
- Cuerpo y cara orientados TRES CUARTOS HACIA LA DERECHA del espectador,
  como quien avanza hacia la derecha de la pantalla. Pose quieta,
  erguida, brazos relajados, manos visibles, pies apoyados.
- Figura ocupa ~85 % de la altura del lienzo y tiene margen transparente
  alrededor. No cortar calzado, velo ni cabello.
- Fondo con ALFA TRANSPARENTE REAL: sin piso, escena, texto ni sombra.
- No añadir personas u objetos ajenos. Cuidar las extremidades.

IDENTIFICACIÓN:
Conservar peinado y color generales, tono de piel, barba si existe,
anteojos y otros rasgos distintivos visibles. Simplificar las facciones:
NO parecer fotografía, ni ilustración semirrealista.
La cara no necesita ser igual a la foto: importa reconocerse dentro
del mismo mundo de juego.
`;

function vestimentaIndividual() {
  return `
EVENTO: CUMPLEAÑOS / UN PROTAGONISTA.
Conservar la ropa que se vea en la foto, simplificada según el estilo.
Si está cortada o no es legible, completar con conjunto discreto,
preferentemente ropa negra o colores neutros. No crear ropa nupcial.
`;
}

function vestimentaCasamiento(vestimenta) {
  if (vestimenta === 'vestido') return `
EVENTO: CASAMIENTO. ROPA OBLIGATORIA: VESTIDO DE NOVIA.
Vestido blanco o marfil reconocible, sencillo y de líneas limpias.
Se puede incluir velo discreto, sin exceso de volantes o texturas.
Mantener las proporciones de cabeza, tronco y piernas compartidas;
el vestido NO debe achicar visualmente la cabeza ni alargar el cuerpo.
`;
  return `
EVENTO: CASAMIENTO. ROPA OBLIGATORIA: TRAJE.
Saco, camisa y pantalón de vestir en tonos oscuros, versiones simples.
No exagerar hombros, manos, anchura del torso ni tamaño de zapatos.
No usar detalles ni texturas fotográficas.
`;
}

function promptPara({ estilo, esCasamiento, vestimenta, usarReferencia }) {
  const referencia = usarReferencia ? `
HAY DOS IMÁGENES DE ENTRADA:
IMAGEN 1 = fotografía de la SEGUNDA PERSONA: es la ÚNICA referencia
para pelo, rostro, piel y demás rasgos de identidad.
IMAGEN 2 = personaje YA ILUSTRADO de la PRIMERA PERSONA:
utilizalo ÚNICAMENTE como MODELO DE ESTILO Y PROPORCIONES.
Repetí grosor de contornos, simplicidad, relación cabeza/cuerpo,
tamaño de ojos, silueta y paleta general de la imagen 2.
NO copies la cara, el peinado, el género, la vestimenta, el color
de piel o los accesorios de la imagen 2.
Dibujá SOLO a la persona de la imagen 1 con la ropa pedida.
` : `
HAY UNA IMAGEN DE ENTRADA: la fotografía de esta persona.
Usá la guía común de proporciones como plantilla de diseño para
que una segunda persona generada después combine visualmente.
`;
  return [GUIA_COMPARTIDA, referencia,
    esCasamiento ? vestimentaCasamiento(vestimenta) : vestimentaIndividual(),
    INFO[estilo].prompt].join('\n');
}

function responder(datos, estado = 200) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function normalizarVestimenta(v) {
  const x = String(v || '').toLowerCase().trim();
  return x === 'vestido' || x === 'traje' ? x : null;
}

async function validarFoto(foto, etiqueta) {
  if (!foto || typeof foto.size !== 'number' || typeof foto.slice !== 'function')
    return `Falta ${etiqueta}.`;
  if (foto.size <= 0 || foto.size > MAX_FOTO_BYTES)
    return `${etiqueta} debe pesar entre 1 byte y 8 MB.`;
  if (!['image/jpeg','image/png','image/webp'].includes(foto.type))
    return `${etiqueta} debe ser JPG, PNG o WebP.`;
  const b = new Uint8Array(await foto.slice(0, 12).arrayBuffer());
  const esJPG = b[0] === 255 && b[1] === 216 && b[2] === 255;
  const esPNG = b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71;
  const esWebP = String.fromCharCode(...b.slice(0,4)) === 'RIFF'
      && String.fromCharCode(...b.slice(8,12)) === 'WEBP';
  const firmaOK = foto.type === 'image/jpeg' ? esJPG
    : foto.type === 'image/png' ? esPNG : esWebP;
  return firmaOK ? null : `${etiqueta} no parece ser una imagen válida.`;
}

function archivoDeReferencia(base64) {
  // La primera generación se adjunta a la segunda como REFERENCIA
  // de estilo. No es una generación nueva: es la misma imagen creada.
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return new File([bytes], 'modelo-estilo-pareja.png', { type:'image/png' });
}

async function crearImagen({ foto, estilo, apiKey, esCasamiento, vestimenta, referenciaB64 }) {
  const datos = new FormData();
  datos.append('model', MODELO);
  if (referenciaB64) {
    // OpenAI Images Edits acepta varias imágenes bajo image[].
    datos.append('image[]', foto, foto.name || 'persona.jpg');
    datos.append('image[]', archivoDeReferencia(referenciaB64), 'modelo-estilo-pareja.png');
  } else {
    datos.append('image', foto, foto.name || 'persona.jpg');
  }
  datos.append('prompt', promptPara({
    estilo, esCasamiento, vestimenta, usarReferencia: Boolean(referenciaB64)
  }));
  datos.append('size', TAMANO);
  datos.append('quality', CALIDAD);
  datos.append('background', 'transparent');
  datos.append('output_format', 'png');
  datos.append('n', '1');

  const r = await fetch('https://api.openai.com/v1/images/edits', {
    method:'POST', headers:{Authorization: `Bearer ${apiKey}`}, body:datos
  });
  const json = await r.json().catch(() => null);
  if (!r.ok) {
    console.error('Error OpenAI', { estilo, codigo:r.status, detalle:json?.error?.message });
    throw new Error('La API de imágenes no completó una generación.');
  }
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64 || typeof b64 !== 'string')
    throw new Error('La API no devolvió una imagen.');
  return b64;
}

async function generarEstilo({ estilo, fotos, vestimentas, apiKey }) {
  const esCasamiento = fotos.length === 2;
  // La primera persona se genera sin referencia externa.
  const primera = await crearImagen({
    foto:fotos[0], estilo, apiKey, esCasamiento,
    vestimenta:esCasamiento ? vestimentas[0] : null,
    referenciaB64:null
  });
  const personajes = [`data:image/png;base64,${primera}`];
  if (esCasamiento) {
    // La segunda ve la primera ilustración para igualar el estilo.
    const segunda = await crearImagen({
      foto:fotos[1], estilo, apiKey, esCasamiento,
      vestimenta:vestimentas[1], referenciaB64:primera
    });
    personajes.push(`data:image/png;base64,${segunda}`);
  }
  return {
    estilo,
    etiqueta:INFO[estilo].etiqueta,
    descripcion:INFO[estilo].descripcion,
    personajes
  };
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.OPENAI_API_KEY)
      return responder({error:'Falta configurar OPENAI_API_KEY en Cloudflare.'},500);
    if (!(request.headers.get('content-type') || '').toLowerCase().includes('multipart/form-data'))
      return responder({error:'El formulario debe ser multipart/form-data.'},415);

    const entrada = await request.formData();
    const foto = entrada.get('foto');
    const foto2 = entrada.get('foto2');
    const e1 = await validarFoto(foto,'La primera foto');
    if (e1) return responder({error:e1},400);
    const esCasamiento = foto2 !== null && foto2 !== '';
    if (esCasamiento) {
      const e2 = await validarFoto(foto2,'La segunda foto');
      if (e2) return responder({error:e2},400);
    }
    const vestimentas = esCasamiento ? [
      normalizarVestimenta(entrada.get('vestimenta1')),
      normalizarVestimenta(entrada.get('vestimenta2'))
    ] : [];
    if (esCasamiento && vestimentas.some(x => !x))
      return responder({error:'Elegí la vestimenta de ambos protagonistas.'},400);

    const fotos = esCasamiento ? [foto,foto2] : [foto];
    // Tres estilos en paralelo. Dentro de cada estilo, el segundo
    // personaje se hace DESPUÉS del primero, con referencia visual.
    const opciones = await Promise.all(
      ESTILOS.map(estilo => generarEstilo({
        estilo,fotos,vestimentas,apiKey:env.OPENAI_API_KEY
      }))
    );

    return responder({
      versionFlujo:'tres_opciones_pareja_v2',
      tipoEvento:esCasamiento ? 'casamiento' : 'individual',
      cantidadProtagonistas:fotos.length,
      estilos:ESTILOS,
      vestimentas,
      opciones,
      imagen:opciones[0].personajes[0],
      ...(esCasamiento ? {imagen2:opciones[0].personajes[1]} : {})
    });
  } catch (error) {
    console.error('Fallo generador v2:',error);
    // No exponer mensajes internos ni datos de fotos al navegador.
    return responder({error:'No se pudieron generar todas las opciones. Consultá el registro de Cloudflare.'},502);
  }
}