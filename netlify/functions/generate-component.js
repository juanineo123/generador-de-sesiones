require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { formData, partToGenerate } = JSON.parse(event.body);

        const competencyInstruction = formData.competencia === 'ia-suggest'
            ? "Basado en los datos, primero determina la competencia más pertinente del CNEB y úsala para la tarea."
            : `La competencia a trabajar es: "${formData.competencia}".`;

        let specificTask;
        switch (partToGenerate) {
            case 'proposito':
                specificTask = "Genera un Propósito de la Sesión claro y conciso.";
                break;
            case 'reto':
                specificTask = "Genera un Reto o Situación Significativa que sea interesante y contextualizada para iniciar la clase. Usa el contexto de Tarapoto, San Martín, si es posible.";
                break;
            case 'evidencia':
                specificTask = "Genera una Evidencia de Aprendizaje en una sola frase directa y concisa. Por ejemplo: 'Elabora un mapa conceptual...' o 'Resuelve los 5 problemas propuestos...'. Sé extremadamente breve, máximo 5 lineas.";
                break;
            case 'producto':
                specificTask = "Genera solo el nombre de un Producto tangible para la sesión. Sé breve y directo. Por ejemplo: 'Afiche informativo', 'Mapa mental completado', 'Cuestionario resuelto'.";
                break;
            default:
                throw new Error("Componente solicitado no válido.");
        }

        const prompt = `
            Eres un docente y pedagogo peruano experto en el Currículo Nacional de Educación Básica (CNEB).
            
            CONTEXTO DE LA SESIÓN:
            - Nivel: ${formData.nivel}
            - Grado: ${formData.grado}
            - Área Curricular: ${formData.area}
            - Tema de la Sesión: ${formData.tema}
            - Instrucción de Competencia: ${competencyInstruction}

            TAREA ESPECÍFICA:
            ${specificTask}

            FORMATO DE SALIDA OBLIGATORIO:
            Responde ÚNICAMENTE con el texto del componente solicitado, sin encabezados, títulos ni texto introductorio.
        `;
        
        // --- CORRECCIÓN DEFINITIVA ---
        // Se usa un modelo rápido, estable y de última generación: gemini-1.5-PRO
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiText = response.text();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ componentContent: aiText.trim() })
        };

    } catch (error) {
        console.error("Error en la función generate-component:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Hubo un error al generar el componente.' }) };
    }
};