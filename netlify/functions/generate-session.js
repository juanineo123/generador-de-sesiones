// Archivo: netlify/functions/generate-session.js

// Para usar 'fetch' en entornos Node.js.
// Netlify Functions suelen usar versiones recientes de Node.js donde 'fetch' es global.
// Si tienes problemas, puedes instalar 'node-fetch' en tu proyecto: npm install node-fetch
// y descomentar la siguiente línea:
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Esta es la función principal que Netlify ejecutará.
exports.handler = async function(event, context) {
    console.log("¡¡¡ FUNCIÓN GENERATE-SESSION INVOCADA !!! Hora:", new Date().toLocaleTimeString());
    // 1. Verificar que el método de la solicitud sea POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ error: 'Método no permitido. Solo se aceptan solicitudes POST.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }

    let formData;
    try {
        // 2. Obtener los datos del formulario enviados desde el frontend
        formData = JSON.parse(event.body);
    } catch (error) {
        console.error("Error al parsear JSON del cuerpo de la solicitud:", error);
        return {
            statusCode: 400, // Bad Request
            body: JSON.stringify({ error: 'El cuerpo de la solicitud no es un JSON válido.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }

    // 3. Extraer los datos del formulario
    const { teacherName, course, level, grade, sessionTime, topic } = formData;

    // 4. Validar que todos los datos necesarios estén presentes
    if (!teacherName || !course || !level || !grade || !sessionTime || !topic) {
        return {
            statusCode: 400, // Bad Request
            body: JSON.stringify({ error: 'Faltan datos en el formulario. Todos los campos son requeridos.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }

    // 5. Obtener tu Clave API de Gemini de las variables de entorno
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    console.log("--- DIAGNÓSTICO DE API KEY ---");
    console.log("¿GEMINI_API_KEY cargada?:", GEMINI_API_KEY ? `Sí, clave encontrada con longitud ${GEMINI_API_KEY.length}.` : "NO, CLAVE NO ENCONTRADA O VACÍA.");
    if (GEMINI_API_KEY) {
        console.log("Primeros 5 caracteres de la clave:", GEMINI_API_KEY.substring(0, 5));
    }
    console.log("--- FIN DIAGNÓSTICO ---");

    if (!GEMINI_API_KEY) {
        console.error("CRÍTICO: La variable de entorno GEMINI_API_KEY no está configurada en Netlify.");
        return {
            statusCode: 500, // Internal Server Error
            body: JSON.stringify({ error: 'Error de configuración del servidor: La clave API de Gemini no está disponible.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }

    // 6. Construir el prompt para la API de Gemini (MODIFICADO)
    const promptParaGemini = `
Eres un experto en el Currículo Nacional de Educación Básica del Perú. Genera una sesión de aprendizaje completa en formato JSON.
La sesión es para:
- Docente: ${teacherName}
- Curso/Área: ${course}
- Nivel: ${level}
- Grado: ${grade}
- Tiempo de la sesión: ${sessionTime} minutos
- Tema: "${topic}"

Debes basarte en el Currículo Nacional Peruano para las competencias, capacidades y desempeños.
Asegúrate de que los desempeños sean específicos y adecuados para el grado y nivel indicados.
La secuencia didáctica (inicio, desarrollo, cierre) debe incluir actividades sugeridas y una estimación de tiempo para cada fase, sumando el total de ${sessionTime} minutos.
Los criterios de evaluación deben estar alineados con los desempeños.

Incluye una sección llamada 'tareaAlumno', que debe ser una lista de strings (array de strings), detallando actividades, ejercicios o investigaciones para que los estudiantes refuercen lo aprendido. Si es una sola tarea, proporciónala como un array con un único elemento string. Esta tarea debe ser coherente con los propósitos de aprendizaje y la secuencia didáctica. Las tareas deben ser genéricas y no referenciar páginas de libros de texto específicos. En su lugar, sugiere actividades de investigación originales, la resolución de problemas conceptuales que no dependan de un material específico, o la creación de ejemplos propios por parte del alumno relacionados con el tema.

La rúbrica debe ser relevante para el tema.

El JSON debe seguir este esquema exacto:
`;

    // 7. Definir el esquema JSON que esperas de Gemini
    const schemaEsperado = {
        type: "OBJECT",
        properties: {
            "competencias": {
                type: "ARRAY",
                description: "Lista de competencias principales a desarrollar.",
                items: {
                    type: "OBJECT",
                    properties: {
                        "nombre": {
                            type: "STRING",
                            description: "Nombre de la competencia principal del área curricular (ej. 'Resuelve problemas de regularidad, equivalencia y cambio.' para Matemática)."
                        },
                        "capacidades": {
                            type: "ARRAY",
                            items: { type: "STRING" },
                            description: "Lista de capacidades asociadas a la competencia principal."
                        },
                        "desempenos_precisados": {
                            type: "ARRAY",
                            items: { type: "STRING" },
                            description: "Lista de desempeños precisados para el grado y nivel, relacionados con el tema. Deben ser al menos 3."
                        }
                    },
                    required: ["nombre", "capacidades", "desempenos_precisados"]
                }
            },
            "competenciasTransversales": {
                type: "ARRAY",
                description: "Lista de competencias transversales. Incluir 'Se desenvuelve en los entornos virtuales generados por las TIC' y 'Gestiona su aprendizaje de manera autónoma'.",
                items: {
                    type: "OBJECT",
                    properties: {
                        "nombre": { type: "STRING", description: "Nombre de la competencia transversal." },
                        "capacidades": {
                            type: "ARRAY",
                            items: { type: "STRING" },
                            description: "Capacidades de la competencia transversal."
                        }
                    },
                    required: ["nombre", "capacidades"]
                }
            },
            "enfoquesTransversales": {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Lista de al menos 3 enfoques transversales pertinentes para la sesión."
            },
            "criteriosEvaluacion": {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Lista de al menos 3 criterios de evaluación, alineados con los desempeños de la competencia principal."
            },
            "secuenciaDidactica": {
                type: "OBJECT",
                description: "Estructura de la secuencia didáctica con inicio, desarrollo y cierre.",
                properties: {
                    "inicio": {
                        type: "OBJECT",
                        properties: {
                            "tiempoEstimado": { type: "STRING", description: "Tiempo estimado para el inicio. Ej: '15 minutos'" },
                            "actividades": { type: "ARRAY", items: { type: "STRING" }, description: "Lista de actividades para el inicio (motivación, saberes previos, propósito, acuerdos)." }
                        },
                        required: ["tiempoEstimado", "actividades"]
                    },
                    "desarrollo": {
                        type: "OBJECT",
                        properties: {
                            "tiempoEstimado": { type: "STRING", description: "Tiempo estimado para el desarrollo. Ej: '60 minutos'" },
                            "actividades": { type: "ARRAY", items: { type: "STRING" }, description: "Lista de actividades para el desarrollo (presentación contenido, modelado, práctica guiada, trabajo autónomo/equipo, retroalimentación)." }
                        },
                        required: ["tiempoEstimado", "actividades"]
                    },
                    "cierre": {
                        type: "OBJECT",
                        properties: {
                            "tiempoEstimado": { type: "STRING", description: "Tiempo estimado para el cierre. Ej: '15 minutos'" },
                            "actividades": { type: "ARRAY", items: { type: "STRING" }, description: "Lista de actividades para el cierre (metacognición, sistematización, evaluación breve)." }
                        },
                        required: ["tiempoEstimado", "actividades"]
                    }
                },
                required: ["inicio", "desarrollo", "cierre"]
            },
            "tareaAlumno": { 
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Lista de tareas, actividades o investigaciones genéricas para el alumno (sin referencias a libros de texto específicos). Debe ser relevante para el tema y los objetivos. Si es una sola tarea, debe ser un array con un solo elemento string."
            },
            "rubrica": {
                type: "ARRAY",
                description: "Lista de al menos 2 criterios para la rúbrica de evaluación del tema.",
                items: {
                    type: "OBJECT",
                    properties: {
                        "criterio": { type: "STRING", description: "Criterio específico de la rúbrica." },
                        "enInicio": { type: "STRING", description: "Descriptor para el nivel 'En Inicio'." },
                        "enProceso": { type: "STRING", description: "Descriptor para el nivel 'En Proceso'." },
                        "logrado": { type: "STRING", description: "Descriptor para el nivel 'Logrado'." },
                        "destacado": { type: "STRING", description: "Descriptor para el nivel 'Destacado'." }
                    },
                    required: ["criterio", "enInicio", "enProceso", "logrado", "destacado"]
                }
            }
        },
        required: ["competencias", "competenciasTransversales", "enfoquesTransversales", "criteriosEvaluacion", "secuenciaDidactica", "tareaAlumno", "rubrica"]
    };

    // 8. Combinar el prompt y el esquema para la API (Gemini puede usar el esquema en la configuración de generación)
    const promptCompletoParaApi = promptParaGemini + "\n" + JSON.stringify(schemaEsperado, null, 2); 

    // 9. Preparar el cuerpo (payload) para la solicitud a la API de Gemini
    const payloadParaGemini = {
        contents: [{ role: "user", parts: [{ text: promptCompletoParaApi }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schemaEsperado, 
            temperature: 0.7, 
        }
    };

    // 10. Realizar la llamada a la API de Gemini
    const urlApiGemini = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;


    try {
        console.log("Iniciando llamada a la API de Gemini...");
        const startTime = Date.now(); 
        const respuestaGemini = await fetch(urlApiGemini, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadParaGemini),
        });
        const endTime = Date.now(); 
        console.log(`Llamada a la API de Gemini finalizada en ${endTime - startTime} ms.`); 

        if (!respuestaGemini.ok) {
            const errorBody = await respuestaGemini.text();
            console.error("Error desde la API de Gemini:", respuestaGemini.status, errorBody);
            return {
                statusCode: respuestaGemini.status,
                body: JSON.stringify({ error: `Error al comunicarse con la API de Gemini: ${respuestaGemini.statusText}`, details: errorBody }),
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            };
        }

        const resultadoJsonGemini = await respuestaGemini.json();

        if (resultadoJsonGemini.candidates && resultadoJsonGemini.candidates.length > 0 &&
            resultadoJsonGemini.candidates[0].content && resultadoJsonGemini.candidates[0].content.parts &&
            resultadoJsonGemini.candidates[0].content.parts.length > 0 &&
            resultadoJsonGemini.candidates[0].content.parts[0].text) {
            
            let datosSesionGenerada;
            try {
                datosSesionGenerada = JSON.parse(resultadoJsonGemini.candidates[0].content.parts[0].text);
            } catch (parseError) {
                console.error("Error al parsear la respuesta JSON de Gemini:", parseError, resultadoJsonGemini.candidates[0].content.parts[0].text);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'La respuesta de Gemini no es un JSON válido.', details: resultadoJsonGemini.candidates[0].content.parts[0].text }),
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                };
            }
            
            return {
                statusCode: 200,
                body: JSON.stringify(datosSesionGenerada),
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                }
            };
        } else {
            console.error("Respuesta inesperada o vacía de Gemini:", JSON.stringify(resultadoJsonGemini));
            const feedback = resultadoJsonGemini.promptFeedback || (resultadoJsonGemini.candidates && resultadoJsonGemini.candidates[0] ? resultadoJsonGemini.candidates[0].finishReason : null);
            let errorDetails = "La API de Gemini no devolvió el contenido esperado.";
            if (feedback && typeof feedback === 'object' && feedback.blockReason) {
                errorDetails += ` Razón del bloqueo: ${feedback.blockReason}.`;
                if (feedback.safetyRatings) {
                    errorDetails += ` Detalles de seguridad: ${JSON.stringify(feedback.safetyRatings)}`;
                }
            } else if (typeof feedback === 'string') { 
                errorDetails += ` Razón de finalización: ${feedback}.`;
            }

            return {
                statusCode: 500,
                body: JSON.stringify({ error: errorDetails, rawResponse: resultadoJsonGemini }),
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            };
        }

    } catch (error) {
        console.error("Excepción al llamar a la API de Gemini o procesar su respuesta:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del servidor al contactar la API de Gemini.', details: error.message }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        };
    }
};