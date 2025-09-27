require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { formData, context, partToGenerate } = JSON.parse(event.body);

        let prompt;
        // Se mantiene el contexto base, es robusto.
        const basePrompt = `
            Eres un docente y pedagogo peruano experto en el Currículo Nacional de Educación Básica (CNEB).
            Tu tarea es diseñar un momento específico de una secuencia didáctica para una sesión de aprendizaje.
            Sé muy conciso, directo y pedagógico.

            CONTEXTO DE LA SESIÓN:
            - Nivel: ${formData.nivel}
            - Grado: ${formData.grado}
            - Área Curricular: ${formData.area}
            - Tema: ${formData.tema}
            - Propósito: ${context.proposito}
            - Reto (Situación Significativa): ${context.reto}
        `;

        // ====================================================== //
        // --- PROMPTS ACTUALIZADOS PARA MAYOR BREVEDAD ---       //
        // ====================================================== //

        if (partToGenerate === 'inicio') {
            prompt = `${basePrompt}\n\nTAREA:\nDiseña únicamente las actividades de INICIO de la sesión. Debes incluir: Motivación (una pregunta o situación muy corta), recojo de Saberes Previos (1-2 preguntas clave), y la presentación concisa del Propósito y Organización. Estima un tiempo aproximado. **El contenido total para esta sección NO debe exceder las 150 palabras.**\n\nFORMATO DE SALIDA:\nResponde ÚNICAMENTE con el contenido para el Inicio en formato Markdown. No incluyas el título "### Inicio".`;
        } else if (partToGenerate === 'desarrollo') {
            prompt = `${basePrompt}\n\nTAREA:\nDiseña únicamente las actividades de DESARROLLO (Gestión y acompañamiento). Describe el proceso de forma clara y directa. Incluye una actividad central para la Gestión del Conocimiento y una actividad práctica. Menciona cómo será el acompañamiento docente de forma resumida. Estima un tiempo aproximado. **El contenido total para esta sección NO debe exceder las 250 palabras.**\n\nFORMATO DE SALIDA:\nResponde ÚNICAMENTE con el contenido para el Desarrollo en formato Markdown. No incluyas el título "### Desarrollo".`;
        } else if (partToGenerate === 'cierre') {
            prompt = `${basePrompt}\n\nTAREA:\nDiseña únicamente las actividades de CIERRE de la sesión. Sé extremadamente breve. Incluye una actividad corta de Aplicación/Evaluación formativa y 2 preguntas de Metacognición. Estima un tiempo aproximado. **El contenido total para esta sección NO debe exceder las 100 palabras.**\n\nFORMATO DE SALIDA:\nResponde ÚNICAMENTE con el contenido para el Cierre en formato Markdown. No incluyas el título "### Cierre".`;
        } else {
            throw new Error("Parte de la secuencia no válida.");
        }
        // ====================================================== //

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiText = response.text();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sequenceContent: aiText })
        };

    } catch (error) {
        console.error("Error en la función generate-sequence:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Hubo un error al generar la secuencia.' })
        };
    }
};