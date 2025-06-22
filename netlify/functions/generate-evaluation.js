require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Esta función genera los criterios de evaluación o el instrumento de evaluación (rúbrica, lista de cotejo, etc.).
 */
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { formData, context, partToGenerate } = JSON.parse(event.body);
        let prompt;

        const basePrompt = `
            Eres un docente y pedagogo peruano experto en evaluación por competencias, según el Currículo Nacional de Educación Básica (CNEB).
            Tu trabajo debe ser técnico, preciso y estar listo para ser usado en una sesión de aprendizaje.

            DATOS DE LA SESIÓN:
            - Nivel: ${formData.nivel}
            - Grado: ${formData.grado}
            - Área Curricular: ${formData.area}
            - Tema: ${formData.tema}
        `;

        if (partToGenerate === 'criterios') {
            const desempenosString = context.desempenos.map(d => `- ${d}`).join('\n');
            // ====================================================== //
            // --- PROMPT AJUSTADO PARA MAYOR PRECISIÓN Y BREVEDAD ---  //
            // ====================================================== //
            prompt = `
                ${basePrompt}

                DESEMPEÑOS PRECISADOS DE LA SESIÓN:
                ${desempenosString}

                TAREA:
                A partir de la lista de desempeños precisados, genera un MÁXIMO de 3 a 4 criterios de evaluación.
                Cada criterio debe ser una frase única, directa y enfocada en una sola acción observable (Ej: 'Identifica las partes de...', 'Resuelve el problema usando...', 'Explica con sus palabras...').
                Sé muy conciso.

                FORMATO DE RESPUESTA:
                Responde ÚNICAMENTE con la lista de criterios en formato Markdown (usando un guion "-" por cada criterio). No agregues títulos, introducciones ni conclusiones.
            `;
        } else if (partToGenerate === 'instrumento') {
            const criteriosString = context.criterios; 

            let taskInstruction;
            switch (formData.instrumento) {
                case 'rubrica':
                    taskInstruction = `
                        TAREA:
                        Diseña una Rúbrica de Evaluación detallada.
                        Utiliza los siguientes criterios de evaluación en las filas.
                        Utiliza los siguientes niveles de logro en las columnas: Inicio, Proceso, Logrado, Destacado.
                        Para cada celda, describe de forma clara, concisa y diferenciada lo que el estudiante demuestra en ese nivel para ese criterio.

                        CRITERIOS DE EVALUACIÓN:
                        ${criteriosString}

                        FORMATO DE RESPUESTA:
                        Responde ÚNICAMENTE con la tabla de la rúbrica en formato Markdown. No incluyas títulos, explicaciones ni texto adicional.
                    `;
                    break;
                case 'guia_observacion':
                    taskInstruction = `
                        TAREA:
                        Diseña una Guía de Observación.
                        La tabla debe tener tres columnas: 'Aspectos a observar (Criterios)', 'Registro de observación (describir evidencias)' y 'Nivel de logro (marcar)'.
                        Utiliza los siguientes criterios de evaluación en la primera columna.

                        CRITERIOS DE EVALUACIÓN:
                        ${criteriosString}

                        FORMATO DE RESPUESTA:
                        Responde ÚNICAMENTE con la tabla de la guía en formato Markdown, dejando la columna de registro vacía para que el docente la complete. No incluyas títulos ni explicaciones.
                    `;
                    break;
                case 'lista_cotejo':
                default:
                    taskInstruction = `
                        TAREA:
                        Diseña una Lista de Cotejo simple y efectiva.
                        La tabla debe tener dos columnas: 'Indicador/Criterio' y 'Logrado (Sí/No)'.
                        Utiliza los siguientes criterios como base para los indicadores.

                        CRITERIOS DE EVALUACIÓN:
                        ${criteriosString}

                        FORMATO DE RESPUESTA:
                        Responde ÚNICAMENTE con la tabla de la lista de cotejo en formato Markdown. No incluyas títulos ni explicaciones.
                    `;
                    break;
            }
            prompt = `${basePrompt}\n\n${taskInstruction}`;
        } else {
            throw new Error("Parte de la evaluación no válida.");
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiText = response.text();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ evaluationContent: aiText })
        };

    } catch (error) {
        console.error("Error en la función generate-evaluation:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Hubo un error al generar la evaluación.' })
        };
    }
};