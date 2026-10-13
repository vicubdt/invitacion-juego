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
      'Generá un personaje estilo "doodle" minimalista y tierno (como un sticker de boda cute), ' +
      'de cuerpo entero PERO CORTADO A LA ALTURA DE LA CADERA: incluí cabeza, torso y brazos, ' +
      'SIN piernas ni cadera. MUY IMPORTANTE sobre el corte de abajo: el torso tiene que terminar ' +
      'en una línea RECTA y HORIZONTAL perfecta, como si el dibujo hubiera sido cortado con una ' +
      'tijera justo a la altura de la cadera. NO dibujes el torso como una forma redondeada ni en ' +
      'forma de panza u óvalo que se achica hacia abajo: el contorno izquierdo y derecho del torso ' +
      'tienen que bajar derechos (verticales) y terminar en esa línea horizontal, sin curvarse hacia ' +
      'adentro. NO agregues ninguna línea, piso, sombra ni elemento debajo del corte: después de esa ' +
      'línea horizontal no va nada más, todo transparente. MUY IMPORTANTE sobre los brazos: los brazos ' +
      'tienen que estar CAÍDOS Y SUELTOS a los costados del cuerpo, ligeramente separados del torso, ' +
      'como si el personaje estuviera parado relajado — NUNCA cruzados, NUNCA apoyados en la cintura, ' +
      'NUNCA juntos adelante. Cabeza grande y redonda en proporción al torso, que es chico y simple. ' +
      'Pelo como una forma sólida de color plano, SIN mechones ni textura. Ojos simples (puntitos o ' +
      'líneas curvas), boca como una línea curva simple, mejillas con un toque de color rosado. Brazos ' +
      'finos tipo línea. TODOS los colores sólidos y lisos, SIN sombreados, SIN degradados, sin textura ' +
      'de ningún tipo. Inspirate en el pelo, tono de piel y vibra general de la foto, pero el resultado ' +
      'final tiene que verse como un dibujo plano, no como una ilustración realista. De pie, mirando de ' +
      'frente, simétrico. Fondo completamente transparente, nada alrededor del personaje.'
    );
    formParaOpenAI.append('size', '1024x1024');
    formParaOpenAI.append('quality', 'low'); // la más económica: para una cara chica no hace falta más resolución
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
