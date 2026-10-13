// ======================================================
// Esta función corre en los servidores de Cloudflare, NUNCA en el
// navegador del invitado ni del cliente. Por eso es el único lugar
// donde podemos usar la clave secreta de OpenAI (env.OPENAI_API_KEY) sin
// riesgo de que alguien la vea mirando el código de la página.
//
// Qué hace: recibe una foto (enviada desde una página con un formulario),
// le pide a OpenAI que la convierta en un retrato tipo dibujo animado, y
// devuelve esa imagen nueva.
//
// Esta es una PRUEBA AISLADA: todavía no está conectada al juego. La idea
// es primero confirmar que esta conexión con OpenAI funciona bien sola,
// antes de meterla dentro del flujo real (donde se pegaría la cara sobre
// el cuerpo del personaje).
// ======================================================

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Falta configurar OPENAI_API_KEY en Cloudflare (Settings → Environment variables).' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const entrada = await request.formData();
    const foto = entrada.get('foto');

    if (!foto) {
      return new Response(
        JSON.stringify({ error: 'No llegó ninguna foto en el pedido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Armamos el pedido a OpenAI: le mandamos la foto original y una
    // descripción de cómo queremos que la transforme.
    const formParaOpenAI = new FormData();
    formParaOpenAI.append('model', 'gpt-image-1');
    formParaOpenAI.append('image', foto, 'foto.png');
    formParaOpenAI.append(
      'prompt',
      'Generá UNA sola imagen que contenga DOS dibujos del MISMO personaje corriendo, uno al lado ' +
      'del otro, bien separados por un espacio vacío entre ellos (como dos fotos de una secuencia). ' +
      'Estilo "doodle" minimalista y tierno (como un sticker de boda cute), TODOS los colores sólidos ' +
      'y lisos, SIN sombreados, SIN degradados, sin textura de ningún tipo. Cabeza grande y redonda en ' +
      'proporción al cuerpo, que es chico y simple. Pelo como forma sólida de color plano, SIN mechones. ' +
      'Ojos simples (puntitos o líneas curvas), boca como línea curva simple, mejillas con un toque de ' +
      'color rosado. Brazos finos tipo línea, CAÍDOS Y SUELTOS a los costados del cuerpo en las dos ' +
      'poses (nunca cruzados, nunca en la cintura). Inspirate en el pelo, tono de piel y vibra general ' +
      'de la foto, pero el resultado tiene que verse como un dibujo plano, no como una ilustración ' +
      'realista. CUERPO COMPLETO de pies a cabeza en las dos poses (esta vez SÍ con piernas dibujadas, ' +
      'nada de cortar a la altura de la cadera). ' +
      'DIBUJO DE LA IZQUIERDA: personaje corriendo de frente a la cámara, con una pierna adelante y ' +
      'doblada hacia arriba en la rodilla (el pie despegado del piso), y la otra pierna estirada hacia ' +
      'atrás, también despegada del piso — como en plena zancada. ' +
      'DIBUJO DE LA DERECHA: el mismo personaje, mismo diseño exacto (mismo pelo, cara, ropa, colores), ' +
      'pero en el punto medio de la zancada: las dos piernas cerca del centro del cuerpo, ambas rodillas ' +
      'dobladas, como pasando una al lado de la otra. ' +
      'Fondo 100% transparente en TODA la imagen (las dos poses), nada alrededor del personaje en ' +
      'ningún lado.'
    );
    formParaOpenAI.append('size', '1536x1024'); // apaisada: entran mejor las dos poses una al lado de la otra
    formParaOpenAI.append('quality', 'medium'); // subo un escalón de calidad: antes el dibujo era chico y solo, ahora son dos dibujos compartiendo el mismo espacio y cada uno necesita más detalle
    formParaOpenAI.append('background', 'transparent'); // esto saca el fondo de color que vimos en la prueba
    formParaOpenAI.append('output_format', 'png'); // hace falta png (o webp) para que la transparencia funcione
    formParaOpenAI.append('n', '1');

    const respuestaOpenAI = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.OPENAI_API_KEY,
      },
      body: formParaOpenAI,
    });

    const resultado = await respuestaOpenAI.json();

    if (!respuestaOpenAI.ok) {
      console.error('Error de OpenAI:', JSON.stringify(resultado));
      return new Response(
        JSON.stringify({ error: 'OpenAI devolvió un error.', detalle: resultado }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const imagenB64 = resultado?.data?.[0]?.b64_json;
    if (!imagenB64) {
      console.error('Respuesta sin imagen:', JSON.stringify(resultado));
      return new Response(
        JSON.stringify({ error: 'OpenAI no devolvió ninguna imagen.', detalle: resultado }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ imagen: 'data:image/png;base64,' + imagenB64 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error inesperado en generar-cara:', error);
    return new Response(
      JSON.stringify({ error: 'Error inesperado en el servidor.', detalle: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
