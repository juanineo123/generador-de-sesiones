require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
// IMPORTANTE: Importamos tu nuevo archivo de procesos
const { getProcesos } = require('./procesosData'); 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { formData, context, partToGenerate } = JSON.parse(event.body);

        // 1. RECUPERAR LOS PROCESOS EXACTOS DE NUESTRA BASE DE DATOS
        // Esto busca automáticamente si es EPT, Matemática, Ciencia (Indaga vs Diseña), etc.
        const procesosDidacticos = getProcesos(formData.area, formData.competencia);
        
        // 2. CONSTRUIR LA INSTRUCCIÓN DE "RELLENADO"
        // Si encontramos procesos específicos, obligamos a la IA a usarlos.
        let instruccionMetodologica = "";
        
        if (procesosDidacticos) {
            instruccionMetodologica = `
            ATENCIÓN: Para esta sección, DEBES seguir estrictamente la siguiente secuencia metodológica oficial:
            ${procesosDidacticos.join("\n")}
            
            INSTRUCCIÓN: Genera una actividad breve y concreta para CADA UNO de los pasos listados arriba.
            NO inventes pasos nuevos. Respeta el orden y la terminología.
            `;
        } else {
            // Fallback (Plan B) por si el área no está mapeada
            instruccionMetodologica = "Utiliza los procesos didácticos estándar y lógicos para esta área curricular.";
        }

       // Contexto base para todas las partes
        const basePrompt = `
            Rol: Docente experto en el CNEB (Perú).
            Nivel: ${formData.nivel} | Grado: ${formData.grado}
            Área: ${formData.area} | Competencia: ${formData.competencia}
            Tema: ${formData.tema}
            Propósito: ${context.proposito}
            Contexto Local/Zona: ${formData.contexto || 'No especificado'}
            
            IMPORTANTE: Todas las actividades, ejemplos y materiales DEBEN estar adaptados a la realidad geográfica, cultural y social descrita en el "Contexto Local/Zona".
        `;
        let promptFinal;

        // --- PROMPTS OPTIMIZADOS PARA VELOCIDAD (FLASH) ---

        if (partToGenerate === 'inicio') {
            promptFinal = `
            ${basePrompt}
            TAREA: Diseña solo el INICIO (10-15 min).
            ELEMENTOS OBLIGATORIOS:
            1. Motivación (corta).
            2. Saberes Previos (1-2 preguntas).
            3. Problematización y Propósito.
            
            FORMATO: Markdown, directo, sin introducciones. Máximo 150 palabras.
            `;

        } else if (partToGenerate === 'desarrollo') {
            // AQUÍ ESTÁ EL TRUCO PARA EVITAR EL TIMEOUT
            promptFinal = `
            ${basePrompt}
            TAREA: Diseña solo el DESARROLLO (Gestión y Acompañamiento).
            
            ${instruccionMetodologica}
            
            REGLAS DE SALIDA:
            - Usa viñetas para cada paso del proceso didáctico.
            - Sé directo y práctico.
            - Menciona materiales brevemente.
            - Máximo 250 palabras en total para asegurar respuesta rápida.
            - Formato Markdown.
            `;

        } else if (partToGenerate === 'cierre') {
            promptFinal = `
            ${basePrompt}
            TAREA: Diseña solo el CIERRE (10-15 min).
            ELEMENTOS:
            1. Evaluación formativa rápida (¿qué aprendimos?).
            2. Metacognición (2 preguntas).
            
            FORMATO: Markdown, muy breve. Máximo 100 palabras.
            `;
        } else {
            return { statusCode: 400, body: "Parte no válida" };
        }

        // Usamos gemini-1.5-flash que es el estándar actual de velocidad.
        // (Si tienes acceso a 2.5 o versiones experimentales, puedes cambiar el nombre aquí)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const result = await model.generateContent(promptFinal);
        const response = await result.response;
        const aiText = response.text();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sequenceContent: aiText })
        };

    } catch (error) {
        console.error("Error en generate-sequence:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Hubo un error al generar la secuencia.' })
        };
    }
};
