// netlify/functions/select-curriculum.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Asegúrate de que la API KEY esté configurada en las variables de entorno de Netlify
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { formData, curriculumForArea } = JSON.parse(event.body);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `
            Eres un experto en el Currículo Nacional de Educación del Perú y un asistente pedagógico.
            Tu tarea es seleccionar los componentes curriculares más pertinentes para una sesión de aprendizaje específica.

            DATOS DE LA SESIÓN:
            - Nivel: ${formData.nivel}
            - Grado: ${formData.grado}
            - Área: ${formData.area}
            - Tema Específico: "${formData.tema}"
            - Selección de Competencia del Usuario: "${formData.competencia}"

            DATOS CURRICULARES DISPONIBLES PARA EL ÁREA:
            ${JSON.stringify(curriculumForArea, null, 2)}

            INSTRUCCIONES:
            1.  Analiza el "Tema Específico".
            2.  Si la "Selección de Competencia del Usuario" es 'ia-suggest', elige la ÚNICA competencia de los datos curriculares que sea más relevante para el tema.
            3.  Si el usuario ya seleccionó una competencia, usa esa.
            4.  A partir de la competencia seleccionada (sea por la IA o por el usuario), escoge la(s) capacidad(es) más directamente relacionadas con el tema.
            5.  Para cada capacidad escogida, precisa y devuelve UN ÚNICO desempeño que se relacione directamente con el tema de la sesión. El desempeño debe ser concreto y observable.

            RESPUESTA:
            Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional antes o después. El objeto debe tener la siguiente estructura exacta, conteniendo solo los elementos que seleccionaste:
            {
              "nombre": "Nombre de la competencia seleccionada",
              "capacidades": [
                {
                  "nombre": "Nombre de la primera capacidad seleccionada",
                  "desempenos": ["El único desempeño precisado para esta capacidad y tema."]
                },
                {
                  "nombre": "Nombre de la segunda capacidad seleccionada (si aplica)",
                  "desempenos": ["El único desempeño precisado para esta capacidad y tema."]
                }
              ]
            }
        `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Limpiar la respuesta para asegurar que sea un JSON válido
    // ESTE ES EL CÓDIGO NUEVO QUE DEBES PEGAR

    let curriculumData;

    // --- INICIO DE LA LÓGICA DE SEGURIDAD ---
    try {
      // 1. Intentamos limpiar y procesar la respuesta de la IA
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      curriculumData = JSON.parse(cleanedText);
    } catch (error) {
      // 2. Si falla, en lugar de 'crashear', creamos un objeto de emergencia
      console.error("Error al procesar la respuesta de la IA. No era un JSON válido.", error);
      console.log("Texto problemático recibido de la IA:", text); // Para depuración

      curriculumData = {
        nombre: "La IA no pudo determinar una competencia para este tema.",
        capacidades: [
          {
            nombre: "Por favor, intenta ser más específico con el tema de la sesión.",
            desempenos: ["O también puedes seleccionar una competencia manualmente del menú desplegable."]
          }
        ]
      };
    }
    // --- FIN DE LA LÓGICA DE SEGURIDAD ---

    return {
      statusCode: 200, // Siempre devolvemos 200 (éxito)
      body: JSON.stringify(curriculumData), // Devolvemos el JSON bueno o el de emergencia
    };

  } catch (error) {
    console.error("Error en la función select-curriculum:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "No se pudo procesar la selección curricular.", details: error.message }),
    };
  }
};
