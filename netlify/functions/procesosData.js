// netlify/functions/procesosData.js

const procesosDidacticos = {
    "Matemática": {
        default: [
            "1. Familiarización con el problema (Comprensión).",
            "2. Búsqueda y ejecución de estrategias (Material concreto/gráfico).",
            "3. Socialización de representaciones (Explicar lo resuelto).",
            "4. Reflexión y formalización (Definición del concepto).",
            "5. Planteamiento de otros problemas (Transferencia)."
        ]
    },
    "Comunicación": {
        "lee": [ // Competencia: Lee diversos tipos de textos
            "1. Antes de la lectura (Propósito, predicciones).",
            "2. Durante la lectura (Lectura guiada, subrayado, preguntas).",
            "3. Después de la lectura (Contrastación, niveles de comprensión)."
        ],
        "escribe": [ // Competencia: Escribe diversos tipos de textos
            "1. Planificación (Destinatario, propósito, estructura).",
            "2. Textualización (Primer borrador).",
            "3. Revisión (Corrección, edición y versión final)."
        ],
        "comunica": [ // Competencia: Se comunica oralmente
            "1. Antes del discurso (Organización de ideas).",
            "2. Durante el discurso (Interacción, recursos paraverbales).",
            "3. Después del discurso (Reflexión y autoevaluación)."
        ],
        default: ["Antes", "Durante", "Después"]
    },
    // Inglés usa la misma lógica que Comunicación
    "Inglés como Lengua Extranjera": {
        "lee": ["1. Pre-reading", "2. While-reading", "3. Post-reading"],
        "escribe": ["1. Planning", "2. Drafting", "3. Revising"],
        "comunica": ["1. Opening", "2. Interaction/Development", "3. Closing"],
        default: ["Pre", "While", "Post"]
    },
    "Personal Social": { // Primaria
        default: [
            "1. Problematización (Dilema moral, asunto público).",
            "2. Análisis de información (Búsqueda de fuentes, identificación).",
            "3. Toma de decisiones (Acuerdos o compromisos)."
        ]
    },
    "Ciencias Sociales": { // Secundaria
        "historicas": [ // Construye interpretaciones históricas
            "1. Planteamiento del problema histórico.",
            "2. Interpretación crítica de fuentes diversas.",
            "3. Comprensión del tiempo histórico.",
            "4. Elaboración de explicaciones sobre procesos históricos."
        ],
        default: [ // Gestiona responsablemente el espacio/recursos
            "1. Problematización.",
            "2. Análisis de información y manejo de fuentes.",
            "3. Toma de decisiones."
        ]
    },
    "Desarrollo Personal, Ciudadanía y Cívica": { // Secundaria (DPCC)
        default: [
            "1. Problematización.",
            "2. Análisis de información.",
            "3. Toma de decisiones (Consenso, deliberación)."
        ]
    },
    "Ciencia y Tecnología": {
        "indaga": [ // Indaga mediante métodos científicos
            "1. Planteamiento del problema.",
            "2. Planteamiento de hipótesis.",
            "3. Elaboración del plan de acción (Indagación).",
            "4. Recojo de datos y análisis de resultados.",
            "5. Estructuración del saber construido.",
            "6. Evaluación y comunicación."
        ],
        "disena": [ // Diseña y construye soluciones tecnológicas
            "1. Determina una alternativa de solución tecnológica.",
            "2. Diseña la alternativa de solución tecnológica.",
            "3. Implementa y valida la alternativa de solución tecnológica.",
            "4. Evalúa y comunica el funcionamiento."
        ],
        default: ["Planteamiento", "Desarrollo", "Evaluación"]
    },
    "Educación Religiosa": {
        default: [
            "1. Ver (Observar la realidad).",
            "2. Juzgar (Iluminar con la Palabra / Doctrina).",
            "3. Actuar (Compromiso de vida).",
            "4. Celebrar (Oración o agradecimiento)."
        ]
    },
    "Arte y Cultura": {
        "aprecia": [
            "1. Reacción inmediata.",
            "2. Descripción de lo observado.",
            "3. Análisis e interpretación.",
            "4. Consideración del contexto cultural."
        ],
        "crea": [
            "1. Desafiar e inspirar.",
            "2. Imaginar y generar ideas.",
            "3. Planificar y elaborar.",
            "4. Presentar y reflexionar."
        ],
        default: ["Exploración", "Creación", "Cierre"]
    },
    "Educación Física": {
        default: [
            "1. Activación corporal (Calentamiento).",
            "2. Actividades de desarrollo (Ejercicios principales/Juego).",
            "3. Vuelta a la calma (Relajación/Estiramientos)."
        ]
    },
    "Educación para el Trabajo": { // Secundaria (EPT) - Design Thinking
        default: [
            "1. Empatizar (Recoger información del usuario).",
            "2. Definir (Precisar el problema/necesidad).",
            "3. Idear (Lluvia de ideas).",
            "4. Prototipar (Representar la idea).",
            "5. Evaluar (Testear el prototipo)."
        ]
    },
    "Tutoría": {
        default: [
            "1. Presentación (Sensibilización).",
            "2. Desarrollo (Análisis y reflexión grupal).",
            "3. Cierre (Toma de decisiones y conclusión)."
        ]
    }
};

/**
 * Función inteligente para detectar los procesos.
 * Busca coincidencias en el nombre de la competencia para asignar el proceso correcto.
 */
function getProcesos(area, competencia) {
    if (!area) return null;
    
    // Normalización para comparaciones seguras
    const areaKey = Object.keys(procesosDidacticos).find(k => 
        k.toLowerCase() === area.toLowerCase() || 
        (area.includes("Inglés") && k.includes("Inglés")) || // Manejo de tildes en Inglés
        (area.includes("Cívica") && k.includes("Cívica"))    // Manejo de DPCC
    );

    if (!areaKey) return null; // Área no encontrada

    const areaData = procesosDidacticos[areaKey];
    
    // Si solo tiene default, retornarlo (Matemática, Religión, EPT, Educ. Física)
    if (Object.keys(areaData).length === 1 && areaData.default) {
        return areaData.default;
    }

    const compLower = competencia ? competencia.toLowerCase() : "";

    // --- LÓGICA DE SELECCIÓN POR PALABRAS CLAVE ---

    // 1. Ciencia y Tecnología (Indagación vs Diseño)
    if (areaKey === "Ciencia y Tecnología") {
        if (compLower.includes("diseña") || compLower.includes("tecnológica")) return areaData["disena"];
        return areaData["indaga"]; // Por defecto asume indagación/explica
    }

    // 2. Comunicación / Inglés (Lee vs Escribe vs Oral)
    if (areaKey.includes("Comunicación") || areaKey.includes("Inglés")) {
        if (compLower.includes("lee")) return areaData["lee"];
        if (compLower.includes("escribe")) return areaData["escribe"];
        if (compLower.includes("oral") || compLower.includes("comunica")) return areaData["comunica"];
    }

    // 3. Arte y Cultura (Aprecia vs Crea)
    if (areaKey === "Arte y Cultura") {
        if (compLower.includes("aprecia")) return areaData["aprecia"];
        if (compLower.includes("crea") || compLower.includes("proyectos")) return areaData["crea"];
    }

    // 4. Ciencias Sociales (Históricas vs Gestión)
    if (areaKey === "Ciencias Sociales") {
        if (compLower.includes("históricas") || compLower.includes("interpreta")) return areaData["historicas"];
    }

    // Retorno por defecto del área si no hubo coincidencia específica
    return areaData.default || null;
}

module.exports = { getProcesos };
