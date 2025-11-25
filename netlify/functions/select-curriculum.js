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

    // --- VERIFICAR SI HAY CAPACIDADES DISPONIBLES EN LA BASE DE DATOS ---
    const hasCapacidades = curriculumForArea.some(comp => comp.capacidades && comp.capacidades.length > 0);
    
    // --- CORRECCIÓN PRINCIPAL: Prompt más explícito y adaptable ---
    const prompt = `
            Eres un experto en el Currículo Nacional de Educación Básica del Perú (CNEB) y un asistente pedagógico.
            Tu tarea es seleccionar los componentes curriculares más pertinentes para una sesión de aprendizaje específica.

            DATOS DE LA SESIÓN:
            - Nivel: ${formData.nivel}
            - Grado: ${formData.grado}
            - Área: ${formData.area}
            - Tema Específico: "${formData.tema}"
            - Selección de Competencia del Usuario: "${formData.competencia}"

            ${hasCapacidades ? 
                `DATOS CURRICULARES DISPONIBLES PARA EL ÁREA:
                ${JSON.stringify(curriculumForArea, null, 2)}` 
                : 
                `COMPETENCIAS DISPONIBLES PARA EL ÁREA:
                ${curriculumForArea.map(c => c.nombre).join(', ')}`
            }

            INSTRUCCIONES CRÍTICAS:
            ${formData.competencia === 'ia-suggest' 
                ? `1. Analiza el "Tema Específico" y elige la ÚNICA competencia ${hasCapacidades ? 'de los datos curriculares' : 'de las competencias listadas'} que sea más relevante para el tema.`
                : `1. OBLIGATORIO: Debes usar EXACTAMENTE la competencia "${formData.competencia}". NO elijas otra competencia diferente. Busca ${hasCapacidades ? 'en los datos curriculares' : 'en las competencias listadas'} la competencia cuyo nombre sea EXACTAMENTE "${formData.competencia}" y usa únicamente esa. Si no la encuentras exacta, busca la más similar pero SIEMPRE respeta la intención del usuario.`
            }
            
            2. CAPACIDADES: ${hasCapacidades ? 
                `Escoge de los datos curriculares la(s) capacidad(es) más directamente relacionadas con el tema "${formData.tema}".` 
                : 
                `Basándote en tu conocimiento del CNEB de Perú para ${formData.nivel} - ${formData.grado} - ${formData.area}, determina las 2 o 3 capacidades oficiales que corresponden a la competencia seleccionada y que sean más relevantes para el tema "${formData.tema}".`
            }
            
            3. DESEMPEÑOS: ${hasCapacidades ? 
                `Para cada capacidad escogida, precisa y devuelve UN ÚNICO desempeño que se relacione directamente con el tema de la sesión.` 
                : 
                `Para cada capacidad que determinaste, redacta UN desempeño específico y observable que esté alineado con el CNEB de ${formData.grado} de ${formData.nivel} y que se relacione directamente con el tema "${formData.tema}". El desempeño debe ser concreto, medible y apropiado para el nivel educativo.`
            }

            FORMATO DE RESPUESTA OBLIGATORIO:
            Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional antes o después. El objeto debe tener la siguiente estructura exacta:
            {
              "nombre": "${formData.competencia === 'ia-suggest' ? 'Nombre exacto de la competencia seleccionada del CNEB' : formData.competencia}",
              "capacidades": [
                {
                  "nombre": "Nombre oficial de la primera capacidad del CNEB",
                  "desempenos": ["Desempeño específico para ${formData.grado} relacionado con ${formData.tema}"]
                },
                {
                  "nombre": "Nombre oficial de la segunda capacidad del CNEB (si aplica)",
                  "desempenos": ["Desempeño específico para ${formData.grado} relacionado con ${formData.tema}"]
                }
              ]
            }
            
            IMPORTANTE: Debes devolver SIEMPRE al menos 2 capacidades con sus respectivos desempeños. Las capacidades y desempeños deben ser coherentes con el CNEB oficial del Perú.
        `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Limpiar la respuesta para asegurar que sea un JSON válido
    let curriculumData;

    // --- INICIO DE LA LÓGICA DE SEGURIDAD ---
    try {
      // 1. Intentamos limpiar y procesar la respuesta de la IA
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      curriculumData = JSON.parse(cleanedText);
      
      // --- VALIDACIÓN 1: Verificar que la competencia sea la correcta ---
      if (formData.competencia !== 'ia-suggest' && curriculumData.nombre !== formData.competencia) {
        console.warn(`⚠️ ADVERTENCIA: La IA seleccionó "${curriculumData.nombre}" pero el usuario pidió "${formData.competencia}"`);
        console.log("Forzando la competencia del usuario en la respuesta...");
        curriculumData.nombre = formData.competencia;
      }
      
      // --- VALIDACIÓN 2: Verificar que existan capacidades ---
      if (!curriculumData.capacidades || curriculumData.capacidades.length === 0) {
        console.error("❌ ERROR CRÍTICO: La IA no generó capacidades.");
        throw new Error("La respuesta de la IA no contiene capacidades.");
      }
      
      // --- VALIDACIÓN 3: Verificar que cada capacidad tenga al menos un desempeño ---
      curriculumData.capacidades.forEach((cap, index) => {
        if (!cap.desempenos || cap.desempenos.length === 0) {
          console.error(`❌ ERROR: La capacidad "${cap.nombre}" no tiene desempeños.`);
          throw new Error(`La capacidad ${index + 1} no tiene desempeños asociados.`);
        }
      });
      
      console.log("✅ Validación exitosa: Competencia, capacidades y desempeños presentes.");
      
    } catch (error) {
      // 2. Si falla, en lugar de 'crashear', creamos un objeto de emergencia
      console.error("Error al procesar la respuesta de la IA. No era un JSON válido o faltaban datos.", error);
      console.log("Texto problemático recibido de la IA:", text); // Para depuración

      curriculumData = {
        nombre: formData.competencia !== 'ia-suggest' ? formData.competencia : "Error: No se pudo determinar la competencia",
        capacidades: [
          {
            nombre: "Error al generar capacidades",
            desempenos: ["Por favor, intenta nuevamente o verifica que el tema de la sesión sea claro y específico. Si el problema persiste, selecciona manualmente una competencia del menú desplegable."]
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
