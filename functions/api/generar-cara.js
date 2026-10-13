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
// antes de meterla dentro del flujo real.
//
// IMPORTANTE (decisión de producto, no técnica): el personaje en el juego
// es una imagen ESTÁTICA y QUIETA — avanza y salta como un bloque entero,
// no tiene piernas animadas ni nada que se mueva por separado. Por eso acá
// le pedimos a la IA UNA sola pose, de cuerpo completo, parado y quieto.
//
// Por ahora este archivo genera siempre el estilo "doodle" (el que ya
// probamos y aprobamos). Más adelante, cuando sumemos los otros dos
// estilos (retro tipo plataformero y pixel art), este mismo archivo va a
// recibir qué estilo eligió el comprador y va a armar un prompt distinto
// para cada uno — por ahora dejamos esa parte sin construir todavía, para
// no sumar complejidad antes de tener el estilo base funcionando bien.
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
      'Generá un personaje estilo "doodle" minimalista y tierno (como un sticker de boda cute), de ' +
      'CUERPO COMPLETO, de pies a cabeza (incluí piernas y pies, no cortes a la altura de la cadera ' +
      'ni en ningún otro lado). Parado derecho, de pie, mirando de frente, simétrico, en una pose ' +
      'QUIETA Y NEUTRA — no corriendo, no saltando, no caminando, como una foto de perfil de cuerpo ' +
      'entero. Cabeza grande y redonda en proporción al cuerpo, que es chico y simple. Pelo como forma ' +
      'sólida de color plano, SIN mechones ni textura. Ojos simples (puntitos o líneas curvas), boca ' +
      'como línea curva simple, mejillas con un toque de color rosado. Brazos finos tipo línea, CAÍDOS ' +
      'Y SUELTOS a los costados del cuerpo, ligeramente separados del torso — NUNCA cruzados, NUNCA en ' +
      'la cintura. Piernas simples y derechas (sin doblar, sin estar en movimiento), un poco más anchas ' +
      'arriba y más angostas abajo, terminando en pies o calzado simple y chato. TODOS los colores ' +
      'sólidos y lisos, SIN sombreados, SIN degradados, sin textura de ningún tipo. Inspirate en el ' +
      'pelo, tono de piel y vibra general de la foto, pero el resultado tiene que verse como un dibujo ' +
      'plano, no como una ilustración realista. Fondo completamente transparente, nada alrededor del ' +
      'personaje.'
    );
    formParaOpenAI.append('size', '1024x1024');
    formParaOpenAI.append('quality', 'low'); // la económica: ya sabemos que acá le alcanza para una sola pose
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
