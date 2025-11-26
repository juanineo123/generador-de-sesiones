require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { formData } = JSON.parse(event.body);

       const prompt = `
Eres un docente y pedagogo peruano experto en el Currículo Nacional de Educación Básica (CNEB).

CONTEXTO DE LA SESIÓN:
- Nivel: ${formData.nivel}
- Grado: ${formData.grado}
- Área Curricular: ${formData.area}
- Tema de la Sesión: ${formData.tema}

TAREA ESPECÍFICA:
Genera la teoría completa y detallada sobre el tema "${formData.tema}" apropiada para estudiantes de ${formData.nivel} - ${formData.grado} en el área de ${formData.area}.

REQUISITOS:
- Máximo 600 palabras
- Incluye: conceptos clave, definiciones claras, explicaciones detalladas
- Usa subtítulos para organizar el contenido (precedidos por ##)
- Lenguaje apropiado para el nivel educativo
- Ejemplos pertinentes al contexto peruano

FORMATO PARA FÓRMULAS Y SÍMBOLOS MATEMÁTICOS:
- Usa superíndices: a² (no a^2), x³ (no x^3)
- Usa símbolos Unicode: √ para raíz cuadrada, π para pi, ≈ para aproximado, ≤ ≥ para comparaciones
- Fracciones simples: usa "/" (ejemplo: 3/4)
- Para figuras geométricas: describe con palabras detalladas en lugar de dibujar con caracteres ASCII

REGLAS CRÍTICAS DE FORMATO:
1. Para NEGRITAS: usa **texto en negrita** (dos asteriscos al inicio Y al final)
2. Para LISTAS NUMERADAS: usa "1. ", "2. ", "3. " (número, punto, espacio)
3. Para LISTAS CON VIÑETAS: usa SOLAMENTE "✓ " (símbolo check seguido de espacio)
4. PROHIBIDO: NO uses "* " para viñetas (asterisco seguido de espacio)
5. NUNCA escribas "* texto" o "- texto" para listas

DIFERENCIA CRÍTICA:
✓ Correcto para negritas: **palabra importante** (pegado sin espacios)
✗ Incorrecto para viñetas: * texto (asterisco con espacio)
✓ Correcto para viñetas: ✓ texto (check con espacio)

EJEMPLO DE FORMATO CORRECTO:
## La Fotosíntesis

La **fotosíntesis** es el proceso mediante el cual las plantas producen su alimento usando luz solar.

Componentes necesarios:
✓ Clorofila presente en las hojas
✓ Luz solar como fuente de energía
✓ Agua absorbida por las raíces

El proceso ocurre en tres etapas:
1. **Absorción**: La clorofila captura la luz solar
2. **Transformación**: La energía lumínica se convierte en energía química
3. **Producción**: Se genera glucosa y se libera oxígeno

FORMATO DE SALIDA:
Responde ÚNICAMENTE con el texto de la teoría siguiendo estrictamente estas reglas de formato.
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const theoryContent = response.text().trim();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theoryContent })
        };

    } catch (error) {
        console.error("Error en la función generate-theory:", error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Hubo un error al generar la teoría.' }) 
        };
    }
};
