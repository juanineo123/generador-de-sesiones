// Archivo: netlify/functions/generate-session.js (Versión Final Definitiva)

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Método no permitido. Solo se aceptan solicitudes POST.' }),
        };
    }

    let formData;
    try {
        formData = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'El cuerpo de la solicitud no es un JSON válido.' }),
        };
    }

    const { teacherName, course, level, grade, sessionTime, topic, competenciaSeleccionada } = formData;

    if (!teacherName || !course || !level || !grade || !sessionTime || !topic) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Faltan datos en el formulario. Todos los campos son requeridos.' }),
        };
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error de configuración del servidor: La clave API de Gemini no está disponible.' }),
        };
    }

    let contextoDeCompetencia = `Debes determinar y generar la competencia (o competencias) del Currículo Nacional Peruano que sean más relevantes para el área de "${course}", el grado "${grade}" y el tema "${topic}".`;

    if (competenciaSeleccionada) {
        contextoDeCompetencia = `El docente ha preseleccionado una competencia específica. Debes enfocar la sesión de aprendizaje en esta única competencia: "${competenciaSeleccionada}".`;
    }
    
    const promptParaGemini = `
Eres un experto en el Currículo Nacional de Educación Básica del Perú (CNEB). Genera una sesión de aprendizaje completa en formato JSON.
La sesión es para:
- Docente: ${teacherName}
- Curso/Área: ${course}
- Nivel: ${level}
- Grado: ${grade}
- Tiempo: ${sessionTime} minutos
- Tema: "${topic}"

Instrucciones para los Propósitos de Aprendizaje:
${contextoDeCompetencia}
Asegúrate de que las capacidades y desempeños que generes sean coherentes con la competencia.
---
REGLA CRÍTICA E INQUEBRANTABLE: Para cada competencia, debes usar ÚNICA Y EXCLUSIVAMENTE el número y contenido de las capacidades oficiales que le corresponden según el CNEB. Está terminantemente prohibido inventar, añadir o modificar capacidades. Tu precisión en este punto es fundamental.
---
La sección "competencias" en el JSON de salida es obligatoria y no puede estar vacía.

Otras Instrucciones:
- Genera un título creativo para la sesión.
- La secuencia didáctica debe tener actividades para el inicio, desarrollo y cierre.
- Incluye una sección 'tareaAlumno' y una 'rúbrica' relevantes.

El JSON debe seguir este esquema exacto:
`;
    
    const schemaEsperado = {
        type: "OBJECT",
        properties: {
            "sessionTitle": { type: "STRING", description: "Un título creativo y conciso para la sesión de aprendizaje, basado en el tema." },
            "competencias": {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        "nombre": { type: "STRING" },
                        "capacidades": { type: "ARRAY", items: { type: "STRING" } },
                        "desempenos_precisados": { type: "ARRAY", items: { type: "STRING" } }
                    },
                    required: ["nombre", "capacidades", "desempenos_precisados"]
                }
            },
            "competenciasTransversales": {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: { "nombre": { type: "STRING" }, "capacidades": { type: "ARRAY", items: { type: "STRING" } } },
                    required: ["nombre", "capacidades"]
                }
            },
            "enfoquesTransversales": { type: "ARRAY", items: { type: "STRING" } },
            "criteriosEvaluacion": { type: "ARRAY", items: { type: "STRING" } },
            "secuenciaDidactica": {
                type: "OBJECT",
                properties: {
                    "inicio": { type: "OBJECT", properties: { "tiempoEstimado": { type: "STRING" }, "actividades": { type: "ARRAY", items: { type: "STRING" } } }, required: ["tiempoEstimado", "actividades"] },
                    "desarrollo": { type: "OBJECT", properties: { "tiempoEstimado": { type: "STRING" }, "actividades": { type: "ARRAY", items: { type: "STRING" } } }, required: ["tiempoEstimado", "actividades"] },
                    "cierre": { type: "OBJECT", properties: { "tiempoEstimado": { type: "STRING" }, "actividades": { type: "ARRAY", items: { type: "STRING" } } }, required: ["tiempoEstimado", "actividades"] }
                },
                required: ["inicio", "desarrollo", "cierre"]
            },
            "tareaAlumno": { type: "ARRAY", items: { type: "STRING" } },
            "rubrica": {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: { "criterio": { type: "STRING" }, "enInicio": { type: "STRING" }, "enProceso": { type: "STRING" }, "logrado": { type: "STRING" }, "destacado": { type: "STRING" } },
                    required: ["criterio", "enInicio", "enProceso", "logrado", "destacado"]
                }
            }
        },
        required: ["sessionTitle", "competencias", "competenciasTransversales", "enfoquesTransversales", "criteriosEvaluacion", "secuenciaDidactica", "tareaAlumno", "rubrica"]
    };

    const payloadParaGemini = {
        contents: [{ role: "user", parts: [{ text: promptParaGemini + "\n" + JSON.stringify(schemaEsperado, null, 2) }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schemaEsperado, 
            temperature: 0.7, 
        }
    };
    
    const urlApiGemini = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const respuestaGemini = await fetch(urlApiGemini, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadParaGemini),
        });

        if (!respuestaGemini.ok) {
            const errorBody = await respuestaGemini.text();
            throw new Error(`Error de la API de Gemini: ${respuestaGemini.status} ${errorBody}`);
        }

        const resultadoJsonGemini = await respuestaGemini.json();

        if (resultadoJsonGemini.candidates?.[0]?.content?.parts?.[0]?.text) {
            const datosSesionGenerada = JSON.parse(resultadoJsonGemini.candidates[0].content.parts[0].text);
            return {
                statusCode: 200,
                body: JSON.stringify(datosSesionGenerada),
            };
        } else {
             throw new Error("La respuesta de la API de Gemini no tuvo el formato esperado o fue bloqueada. Posible razón: " + (resultadoJsonGemini.promptFeedback?.blockReason || 'desconocida'));
        }
    } catch (error) {
        console.error("Error en la función generate-session:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del servidor al procesar la solicitud.', details: error.message }),
        };
    }
};