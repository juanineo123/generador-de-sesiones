/* =================================================================
   ASISTENTE DE SESIONES DE APRENDIZAJE 2.3 - SCRIPT.JS (VERSIÓN CON EVALUACIÓN)
   Creado por Juan Caicedo y potenciado por Gemini
   =================================================================
*/

let sessionData = { formData: {}, generatedContent: {} };
// =================================================================
// --- FUNCIÓN DE REINTENTO PARA LLAMADAS A LA API (NUEVO) ---
// =================================================================
async function fetchWithRetry(url, options, retries = 3, delay = 2500, logElement) {
    for (let i = 1; i <= retries; i++) {
        try {
            if (logElement) {
                // Actualiza el log de la UI con el intento actual
                const existingMessage = logElement.innerHTML.split('<br>')[0];
                logElement.innerHTML = `${existingMessage}<br><span class="retry-attempt">(Intento ${i} de ${retries}...)</span>`;
            }
            console.log(`Intento ${i} de ${retries} para ${url}`);

            const response = await fetch(url, options);

            if (response.ok) {
                if (logElement) {
                    // Limpia el mensaje de reintento si la llamada fue exitosa
                    const existingMessage = logElement.innerHTML.split('<br>')[0];
                    logElement.innerHTML = existingMessage;
                }
                console.log(`Éxito en el intento ${i} para ${url}`);
                return response; // Si la respuesta es exitosa, la devolvemos y salimos de la función
            }

            // Si la respuesta del servidor es un error (ej. 500), lanzamos un error para reintentar
            throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);

        } catch (error) {
            console.warn(`Intento ${i} falló:`, error.message);
            if (i === retries) {
                // Si este es el último intento, lanzamos el error para que sea capturado por el bloque principal
                console.error(`Todos los ${retries} intentos fallaron para ${url}.`);
                throw error;
            }
            // Esperamos el tiempo definido antes del siguiente reintento
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
// =================================================================

// =================================================================
// --- FUNCIONES PARA GUARDAR Y CARGAR DATOS DEL FORMULARIO (NUEVO) ---
// =================================================================
function saveFormData() {
    const formData = {
        docente: document.getElementById('docente').value,
        colegio: document.getElementById('colegio').value,
        director: document.getElementById('director').value,

        grado: document.getElementById('grado').value,
        area: document.getElementById('area-curricular').value,
        competencia: document.getElementById('competencia').value,
        tema: document.getElementById('tema').value,
        duracion: document.getElementById('duracion-sesion').value,
        instrumento: document.getElementById('instrumento-evaluacion').value
    };
    // Guardamos el objeto como un string en localStorage
    localStorage.setItem('sesionFormData', JSON.stringify(formData));
    console.log('Datos del formulario guardados.');
}

function loadFormData() {
    const savedData = localStorage.getItem('sesionFormData');
    if (savedData) {
        const formData = JSON.parse(savedData);
        console.log('Cargando datos del formulario...');

        // Cargamos los valores de campos de texto simples primero
        document.getElementById('docente').value = formData.docente || '';
        document.getElementById('colegio').value = formData.colegio || '';
        document.getElementById('director').value = formData.director || '';
        document.getElementById('tema').value = formData.tema || '';
        document.getElementById('duracion-sesion').value = formData.duracion || '';
        document.getElementById('instrumento-evaluacion').value = formData.instrumento || 'lista_de_cotejo';

        // --- INICIA LA NUEVA LÓGICA DE CARGA ANIDADA Y ROBUSTA ---

    }
}
// =================================================================

// --- BASE DE DATOS CURRICULAR COMPLETA Y CONSISTENTE ---
const curriculumData = {
    // CÓDIGO NUEVO Y COMPLETADO PARA LA SECCIÓN 'Inicial'

    Inicial: {
        '3 años': {
            'Personal Social': [{ nombre: 'Construye su identidad', capacidades: [] }, { nombre: 'Convive y participa democráticamente en la búsqueda del bien común', capacidades: [] }],
            'Psicomotriz': [{ nombre: 'Se desenvuelve de manera autónoma a través de su motricidad', capacidades: [] }],
            'Comunicación': [{ nombre: 'Se comunica oralmente en su lengua materna', capacidades: [] },{ nombre: 'Crea proyectos desde los lenguajes artísticos', capacidades: [] },{ nombre: 'Lee diversos tipos de textos escritos', capacidades: [] },{ nombre: 'Escribe diversos tipos de textos', capacidades: [] }],
            'Matemática': [{ nombre: 'Resuelve problemas de cantidad', capacidades: [] },{ nombre: 'Resuelve problemas de forma, movimiento y localización', capacidades: [] }],
            'Ciencia y Tecnología': [{ nombre: 'Indaga mediante métodos científicos para construir sus conocimientos', capacidades: [] }]
        },
        '4 años': {
            'Personal Social': [{ nombre: 'Construye su identidad', capacidades: [] }, { nombre: 'Convive y participa democráticamente en la búsqueda del bien común', capacidades: [] }],
            'Psicomotriz': [{ nombre: 'Se desenvuelve de manera autónoma a través de su motricidad', capacidades: [] }],
            'Comunicación': [{ nombre: 'Se comunica oralmente en su lengua materna', capacidades: [] }, { nombre: 'Lee diversos tipos de textos escritos', capacidades: [] }, { nombre: 'Escribe diversos tipos de textos', capacidades: [] },{ nombre: 'Crea proyectos desde los lenguajes artísticos', capacidades: [] }],
            'Matemática': [{ nombre: 'Resuelve problemas de cantidad', capacidades: [] }, { nombre: 'Resuelve problemas de forma, movimiento y localización', capacidades: [] }],
            'Ciencia y Tecnología': [{ nombre: 'Indaga mediante métodos científicos para construir sus conocimientos', capacidades: [] }]
        },
        '5 años': {
            'Personal Social': [{ nombre: 'Construye su identidad', capacidades: [] }, { nombre: 'Convive y participa democráticamente en la búsqueda del bien común', capacidades: [] }],
            'Psicomotriz': [{ nombre: 'Se desenvuelve de manera autónoma a través de su motricidad', capacidades: [] }],
            'Comunicación': [{ nombre: 'Se comunica oralmente en su lengua materna', capacidades: [] }, { nombre: 'Lee diversos tipos de textos escritos', capacidades: [] }, { nombre: 'Escribe diversos tipos de textos', capacidades: [] },{ nombre: 'Crea proyectos desde los lenguajes artísticos', capacidades: [] }],
            'Matemática': [{ nombre: 'Resuelve problemas de cantidad', capacidades: [] }, { nombre: 'Resuelve problemas de forma, movimiento y localización', capacidades: [] }],
            'Ciencia y Tecnología': [{ nombre: 'Indaga mediante métodos científicos para construir sus conocimientos', capacidades: [] }]
        }
    },
    Primaria: {},
    Secundaria: {}
};
const competenciasPrimaria = {
    'Personal Social': [{ nombre: 'Construye su identidad', capacidades: [] }, { nombre: 'Convive y participa democráticamente en la búsqueda del bien común', capacidades: [] }, { nombre: 'Construye interpretaciones históricas', capacidades: [] }, { nombre: 'Gestiona responsablemente el espacio y el ambiente', capacidades: [] }, { nombre: 'Gestiona responsablemente los recursos económicos', capacidades: [] }],
    'Educación Física': [{ nombre: 'Se desenvuelve de manera autónoma a través de su motricidad', capacidades: [] }, { nombre: 'Asume una vida saludable', capacidades: [] }, { nombre: 'Interactúa a través de sus habilidades sociomotrices', capacidades: [] }],
    'Arte y Cultura': [{ nombre: 'Aprecia de manera crítica manifestaciones artístico-culturales', capacidades: [] }, { nombre: 'Crea proyectos desde los lenguajes artísticos', capacidades: [] }],
    'Comunicación': [{ nombre: 'Se comunica oralmente en su lengua materna', capacidades: [] }, { nombre: 'Lee diversos tipos de textos escritos en su lengua materna', capacidades: [] }, { nombre: 'Escribe diversos tipos de textos en su lengua materna', capacidades: [] }],
    'Inglés como Lengua Extranjera': [{ nombre: 'Se comunica oralmente en inglés como lengua extranjera', capacidades: [] }, { nombre: 'Lee diversos tipos de textos escritos en inglés como lengua extranjera', capacidades: [] }, { nombre: 'Escribe diversos tipos de textos en inglés como lengua extranjera', capacidades: [] }],
    'Matemática': [{ nombre: 'Resuelve problemas de cantidad', capacidades: [] }, { nombre: 'Resuelve problemas de regularidad, equivalencia y cambio', capacidades: [] }, { nombre: 'Resuelve problemas de forma, movimiento y localización', capacidades: [] }, { nombre: 'Resuelve problemas de gestión de datos e incertidumbre', capacidades: [] }],
    'Ciencia y Tecnología': [{ nombre: 'Indaga mediante métodos científicos para construir sus conocimientos', capacidades: [] }, { nombre: 'Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo', capacidades: [] }, { nombre: 'Diseña y construye soluciones tecnológicas para resolver problemas', capacidades: [] }],
    'Educación Religiosa': [{ nombre: 'Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente', capacidades: [] }, { nombre: 'Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa', capacidades: [] }]
};
const competenciasSecundaria = {
    'Matemática': [{ nombre: 'Resuelve problemas de cantidad', capacidades: [{ nombre: 'Traduce cantidades a expresiones numéricas', desempenos: ['Establece relaciones entre datos y acciones de comparar, igualar, reiterar y dividir cantidades, y las transforma a expresiones numéricas (modelos) que incluyen operaciones con números racionales, raíces inexactas, notación exponencial y científica, así como el interés simple y compuesto.'] }, { nombre: 'Comunica su comprensión sobre los números y las operaciones', desempenos: ['Expresa con diversas representaciones y lenguaje numérico su comprensión sobre las operaciones con números racionales e irracionales (raíces inexactas), y sobre la notación científica. Usa este entendimiento para interpretar las condiciones de un problema en su contexto.'] }, { nombre: 'Usa estrategias y procedimientos de estimación y cálculo', desempenos: ['Selecciona, combina y adapta estrategias de cálculo, estimación, recursos y procedimientos diversos para realizar operaciones con números racionales e irracionales (raíces inexactas), y para calcular tasas de interés simple y compuesto.'] }, { nombre: 'Argumenta afirmaciones sobre las relaciones numéricas y las operaciones', desempenos: ['Plantea afirmaciones sobre las propiedades de las operaciones con números racionales y raíces inexactas, y sobre la conveniencia o no de determinadas tasas de interés. Las justifica usando ejemplos y propiedades de los números y operaciones.'] }] }, { nombre: 'Resuelve problemas de regularidad, equivalencia y cambio', capacidades: [{ nombre: 'Traduce datos y condiciones a expresiones algebraicas y gráficas', desempenos: ['Establece relaciones entre datos, valores desconocidos, regularidades, y condiciones de equivalencia o variación entre magnitudes, y las transforma a modelos que incluyen sistemas de ecuaciones lineales con dos incógnitas, inecuaciones (ax + b < cx + d), y funciones cuadráticas (f(x) = ax² + bx + c).'] }, { nombre: 'Comunica su comprensión sobre las relaciones algebraicas', desempenos: ['Expresa, con diversas representaciones gráficas, tabulares y simbólicas, su comprensión sobre la solución de un sistema de ecuaciones lineales y de una ecuación de segundo grado, y sobre la función cuadrática, para interpretar un problema en su contexto.'] }, { nombre: 'Usa estrategias y procedimientos para encontrar equivalencias y reglas generales', desempenos: ['Combina y adapta estrategias heurísticas, recursos y procedimientos más óptimos para solucionar sistemas de ecuaciones lineales, inecuaciones y funciones cuadráticas.'] }, { nombre: 'Argumenta afirmaciones sobre relaciones de cambio y equivalencia', desempenos: ['Plantea afirmaciones sobre las características y propiedades de las funciones cuadráticas, y las justifica mediante ejemplos, propiedades matemáticas y sus conocimientos.'] }] }, { nombre: 'Resuelve problemas de forma, movimiento y localización', capacidades: [] }, { nombre: 'Resuelve problemas de gestión de datos e incertidumbre', capacidades: [] }],
    'Comunicación': [{ nombre: 'Se comunica oralmente en su lengua materna', capacidades: [] }, { nombre: 'Lee diversos tipos de textos escritos en su lengua materna', capacidades: [] }, { nombre: 'Escribe diversos tipos de textos en su lengua materna', capacidades: [] }], 'Inglés como Lengua Extranjera': [{ nombre: 'Se comunica oralmente en inglés como lengua extranjera', capacidades: [] }, { nombre: 'Lee diversos tipos de textos escritos en inglés como lengua extranjera', capacidades: [] }, { nombre: 'Escribe diversos tipos de textos en inglés como lengua extranjera', capacidades: [] }], 'Arte y Cultura': [{ nombre: 'Aprecia de manera crítica manifestaciones artístico-culturales', capacidades: [] }, { nombre: 'Crea proyectos desde los lenguajes artísticos', capacidades: [] }], 'Ciencias Sociales': [{ nombre: 'Construye interpretaciones históricas', capacidades: [] }, { nombre: 'Gestiona responsablemente el espacio y el ambiente', capacidades: [] }, { nombre: 'Gestiona responsablemente los recursos económicos', capacidades: [] }], 'Desarrollo Personal, Ciudadanía y Cívica': [{ nombre: 'Construye su identidad', capacidades: [] }, { nombre: 'Convive y participa democráticamente en la búsqueda del bien común', capacidades: [] }], 'Educación Física': [{ nombre: 'Se desenvuelve de manera autónoma a través de su motricidad', capacidades: [] }, { nombre: 'Asume una vida saludable', capacidades: [] }, { nombre: 'Interactúa a través de sus habilidades sociomotrices', capacidades: [] }], 'Educación Religiosa': [{ nombre: 'Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente', capacidades: [] }, { nombre: 'Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa', capacidades: [] }], 'Ciencia y Tecnología': [{ nombre: 'Indaga mediante métodos científicos para construir sus conocimientos', capacidades: [] }, { nombre: 'Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo', capacidades: [] }, { nombre: 'Diseña y construye soluciones tecnológicas para resolver problemas de su entorno', capacidades: [] }], 'Educación para el Trabajo': [{ nombre: 'Gestiona proyectos de emprendimiento económico o social', capacidades: [] }]
};

// --- ESTRUCTURA DE DATOS PARA POBLAR LOS MENÚS DESPLEGABLES DE FORMA DINÁMICA ---
const gradosPorNivel = {
    Inicial: ['3 años', '4 años', '5 años'],
    Primaria: ['1er Grado', '2do Grado', '3er Grado', '4to Grado', '5to Grado', '6to Grado'],
    Secundaria: ['1er Grado', '2do Grado', '3er Grado', '4to Grado', '5to Grado']
};
// CÓDIGO NUEVO (EL QUE DEBES PEGAR)

const areasPorNivel = {
    Primaria: [
        'Matemática', 'Comunicación', 'Inglés como Lengua Extranjera', 'Arte y Cultura',
        'Personal Social', 'Educación Física', 'Ciencia y Tecnología', 'Educación Religiosa', 'Tutoría'
    ],
    Secundaria: [
        'Matemática', 'Comunicación', 'Inglés como Lengua Extranjera', 'Arte y Cultura',
        'Ciencias Sociales', 'Desarrollo Personal, Ciudadanía y Cívica', 'Educación Física',
        'Educación Religiosa', 'Ciencia y Tecnología', 'Educación para el Trabajo', 'Tutoría'
    ],
    Inicial: ['Personal Social', 'Psicomotriz', 'Comunicación', 'Matemática', 'Ciencia y Tecnología', 'Tutoría']
};


gradosPorNivel.Primaria.forEach(grado => { curriculumData.Primaria[grado] = competenciasPrimaria; });
gradosPorNivel.Secundaria.forEach(grado => { curriculumData.Secundaria[grado] = competenciasSecundaria; });
// =================================================================
// --- (NUEVO) AÑADIR TUTORÍA Y SUS DIMENSIONES AL CURRÍCULO ---
// =================================================================
const dimensionesTutoria = [
    { nombre: 'Dimensión Personal', capacidades: [] }, // No tiene capacidades/desempeños formales
    { nombre: 'Dimensión Social', capacidades: [] },
    { nombre: 'Dimensión de los Aprendizajes', capacidades: [] }
];

// Añadir Tutoría a todos los grados de todos los niveles
for (const nivel in curriculumData) {
    for (const grado in curriculumData[nivel]) {
        curriculumData[nivel][grado]['Tutoría'] = dimensionesTutoria;
    }
}
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadFormData(); // Carga los datos guardados al iniciar
    // --- OBTENCIÓN DE ELEMENTOS DEL DOM ---
    const configPanel = document.getElementById('config-panel');
    const resultsDashboard = document.getElementById('results-dashboard');
    const nivelSelect = document.getElementById('nivel');
    const gradoSelect = document.getElementById('grado');
    const areaSelect = document.getElementById('area-curricular');
    const competenciaSelect = document.getElementById('competencia');
    const startGenerationBtn = document.getElementById('start-generation-btn');
    const generationLog = document.getElementById('generation-log');
    const downloadWordBtn = document.getElementById('download-word-btn');

    // Contenedores de salida principales
    const competenciaOutput = document.getElementById('competencia-output');
    const capacidadesOutput = document.getElementById('capacidades-output');
    const desempenosOutput = document.getElementById('desempenos-output');
    const propositoOutput = document.getElementById('propósito-output');
    const retoOutput = document.getElementById('reto-output');
    const evidenciaOutput = document.getElementById('evidencia-output');
    const productoOutput = document.getElementById('producto-output');
    const inicioContainer = document.getElementById('inicio-container');
    const desarrolloContainer = document.getElementById('desarrollo-container');
    const cierreContainer = document.getElementById('cierre-container');

    // ====================================================== //
    // --- NUEVOS ELEMENTOS DEL DOM PARA LA EVALUACIÓN ---    //
    // ====================================================== //
    const criteriosContainer = document.getElementById('criterios-evaluacion-container');
    const criteriosOutput = document.getElementById('criterios-evaluacion-output');
    const instrumentoContainer = document.getElementById('instrumento-evaluacion-container');
    const instrumentoOutput = document.getElementById('instrumento-evaluacion-output');
    const instrumentoTitulo = document.getElementById('instrumento-titulo');
    // ====================================================== //


    // ====================================================== //
    // --- (NUEVO) EVENTOS PARA GUARDAR DATOS DEL FORMULARIO ---  //
    // ====================================================== //
    const fieldsToSave = ['docente', 'colegio', 'director', 'grado', 'area-curricular', 'competencia', 'tema', 'duracion-sesion', 'instrumento-evaluacion'];
    fieldsToSave.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('change', saveFormData);
        }
    });
    // ====================================================== //
    // --- LÓGICA DE MENÚS DESPLEGABLES ANIDADOS Y DINÁMICOS ---
    nivelSelect.addEventListener('change', () => {
        const selectedNivel = nivelSelect.value;
        gradoSelect.innerHTML = '<option value="" disabled selected>Selecciona un grado...</option>';
        areaSelect.innerHTML = '<option value="" disabled selected>Primero selecciona un grado...</option>';
        competenciaSelect.innerHTML = '<option value="" disabled selected>Primero selecciona un área...</option>';
        areaSelect.disabled = true;
        competenciaSelect.disabled = true;

        if (selectedNivel) {
            const grados = gradosPorNivel[selectedNivel] || [];
            grados.forEach(grado => {
                const option = document.createElement('option');
                option.value = grado;
                option.textContent = grado;
                gradoSelect.appendChild(option);
            });
            gradoSelect.disabled = false;
        }
    });

    gradoSelect.addEventListener('change', () => {
        const selectedNivel = nivelSelect.value;
        const selectedGrado = gradoSelect.value;
        areaSelect.innerHTML = '<option value="" disabled selected>Selecciona un área...</option>';
        competenciaSelect.innerHTML = '<option value="" disabled selected>Primero selecciona un área...</option>';
        competenciaSelect.disabled = true;

        if (selectedNivel && selectedGrado) {
            const areas = areasPorNivel[selectedNivel] || [];
            areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area;
                if (area === 'Desarrollo Personal, Ciudadanía y Cívica') {
                    option.textContent = 'DPCC';
                } else if (area === 'Educación para el Trabajo') {
                    option.textContent = 'EPT';
                } else {
                    option.textContent = area;
                }
                areaSelect.appendChild(option);
            });
            areaSelect.disabled = false;
        } else {
            areaSelect.disabled = true;
        }
    });

    areaSelect.addEventListener('change', () => {
        const selectedNivel = nivelSelect.value;
        const selectedGrado = gradoSelect.value;
        const selectedArea = areaSelect.value;
        competenciaSelect.innerHTML = '<option value="" disabled selected>Selecciona una competencia...</option>';
        const iaOption = document.createElement('option');
        iaOption.value = 'ia-suggest';
        iaOption.textContent = 'Dejar que la IA sugiera la competencia';
        competenciaSelect.appendChild(iaOption);

        if (selectedNivel && selectedGrado && selectedArea) {
            const competencias = curriculumData[selectedNivel]?.[selectedGrado]?.[selectedArea] || [];
            if (competencias.length > 0) {
                competencias.forEach(comp => {
                    const option = document.createElement('option');
                    option.value = comp.nombre;
                    option.textContent = comp.nombre;
                    competenciaSelect.appendChild(option);
                });
                competenciaSelect.disabled = false;
            } else {
                competenciaSelect.disabled = true;
            }
        }
    });

    // --- LÓGICA DE GENERACIÓN DE LA SESIÓN ---
    startGenerationBtn.addEventListener('click', async () => {
        // --- 1. RECOLECCIÓN DE DATOS DEL FORMULARIO ---
        // CÓDIGO NUEVO
        sessionData.formData = {
            docente: document.getElementById('docente').value,
            colegio: document.getElementById('colegio').value,
            director: document.getElementById('director').value,
            contexto: document.getElementById('contexto').value, // <-- AÑADE ESTA LÍNEA
            nivel: nivelSelect.value,
            grado: gradoSelect.value,
            area: areaSelect.value,
            competencia: competenciaSelect.value,
            tema: document.getElementById('tema').value,
            duracion: document.getElementById('duracion-sesion').value,
            instrumento: document.getElementById('instrumento-evaluacion').value
        };

        if (!sessionData.formData.nivel || !sessionData.formData.grado || !sessionData.formData.area || !sessionData.formData.tema || !sessionData.formData.competencia) {
            alert('Por favor, completa todos los campos del formulario antes de generar.');
            return;
        }

        // --- 2. PREPARACIÓN DE LA INTERFAZ PARA LA GENERACIÓN ---
        resultsDashboard.style.display = 'block';
        resultsDashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });

        generationLog.innerHTML = '';
        const allOutputs = [competenciaOutput, capacidadesOutput, desempenosOutput, propositoOutput, retoOutput, evidenciaOutput, productoOutput, inicioContainer, desarrolloContainer, cierreContainer, criteriosOutput, instrumentoOutput];
        allOutputs.forEach(el => { el.innerHTML = ''; });

        criteriosContainer.style.display = 'none';
        instrumentoContainer.style.display = 'none';
        downloadWordBtn.style.display = 'none';
        startGenerationBtn.disabled = true;
        startGenerationBtn.textContent = 'Generando...';

        try {
            // --- 3. PROCESO DE GENERACIÓN SECUENCIAL ---

            // PASO 3.1: SELECCIÓN INTELIGENTE DE DATOS CURRICULARES
            generationLog.innerHTML += `<div>🧠 Analizando el tema y seleccionando la competencia...</div>`;
            const curriculumForArea = curriculumData[sessionData.formData.nivel]?.[sessionData.formData.grado]?.[sessionData.formData.area] || [];

            const selectionResponse = await fetchWithRetry('/.netlify/functions/select-curriculum', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    formData: sessionData.formData,
                    curriculumForArea: curriculumForArea,
                    constraints: 'A partir de los desempeños disponibles, precisa y retorna únicamente los 3 más relevantes para el tema de la sesión.'
                })
            }, 3, 2500, generationLog);

            if (!selectionResponse.ok) {
                const errorData = await selectionResponse.json();
                throw new Error(`La IA no pudo seleccionar los datos curriculares. Detalle: ${errorData.details || 'Error desconocido'}`);
            }
            const selectedCurriculum = await selectionResponse.json();
            sessionData.generatedContent.competencia = selectedCurriculum;
            competenciaOutput.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            competenciaOutput.innerHTML = `<h4>Competencia:</h4><p>${selectedCurriculum.nombre || ''}</p>`;
            let capacidadesHtml = '<h5>Capacidades:</h5><ul>';
            (selectedCurriculum.capacidades || []).forEach(cap => { capacidadesHtml += `<li>${cap.nombre}</li>`; });
            capacidadesHtml += '</ul>';
            capacidadesOutput.innerHTML = capacidadesHtml;
            let desempenosHtml = '<h5>Desempeños Precisados:</h5><ul>';
            (selectedCurriculum.capacidades || []).forEach(cap => {
                (cap.desempenos || []).forEach(des => { desempenosHtml += `<li>${des}</li>`; });
            });
            desempenosHtml += '</ul>';
            desempenosOutput.innerHTML = desempenosHtml;

            // ====================================================== //
            // --- PASO 3.2: GENERACIÓN DE CRITERIOS DE EVALUACIÓN ---//
            // ====================================================== //
            generationLog.innerHTML += `<div>🧠 Generando Criterios de Evaluación...</div>`;
            criteriosContainer.style.display = 'block';
            criteriosOutput.innerHTML = `<p class="gemini-generating-message">Generando con Gemini...</p>`;
            criteriosContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const criteriosResponse = await fetchWithRetry(`/.netlify/functions/generate-evaluation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    formData: sessionData.formData,
                    context: { desempenos: selectedCurriculum.capacidades.flatMap(c => c.desempenos) }, // Enviamos solo los desempeños
                    partToGenerate: 'criterios'
                })
            }, 3, 2500, criteriosOutput);

            if (!criteriosResponse.ok) throw new Error(`Falló la generación de 'Criterios de Evaluación'`);
            const criteriosData = await criteriosResponse.json();
            sessionData.generatedContent.criterios = criteriosData.evaluationContent;
            criteriosOutput.innerHTML = marked.parse(criteriosData.evaluationContent);
            // ====================================================== //

            // PASO 3.3: GENERACIÓN DE COMPONENTES Y SECUENCIA DIDÁCTICA
            const generationPipeline = [
                { name: 'Propósito', part: 'proposito', endpoint: 'generate-component', container: propositoOutput },
                { name: 'Reto', part: 'reto', endpoint: 'generate-component', container: retoOutput },
                { name: 'Evidencia', part: 'evidencia', endpoint: 'generate-component', container: evidenciaOutput },
                { name: 'Producto', part: 'producto', endpoint: 'generate-component', container: productoOutput },
                { name: 'Inicio', part: 'inicio', endpoint: 'generate-sequence', container: inicioContainer },
                { name: 'Desarrollo', part: 'desarrollo', endpoint: 'generate-sequence', container: desarrolloContainer },
                { name: 'Cierre', part: 'cierre', endpoint: 'generate-sequence', container: cierreContainer }
            ];
            for (const step of generationPipeline) {
                generationLog.innerHTML += `<div>✍️ Generando ${step.name}...</div>`;
                step.container.innerHTML = `<h3>${step.name}</h3><p class="gemini-generating-message">Generando con Gemini...</p>`;
                step.container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 500));

                let constraint = '';
                if (step.part === 'proposito') {
                    constraint = 'Genera el propósito de la sesión en un máximo de 5 líneas.';
                }

                const response = await fetchWithRetry(`/.netlify/functions/${step.endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        formData: sessionData.formData,
                        context: sessionData.generatedContent,
                        partToGenerate: step.part,
                        constraints: constraint
                    })
                }, 3, 2500, step.container);

                if (!response.ok) throw new Error(`Falló la generación de '${step.name}'`);
                const data = await response.json();
                const content = data.componentContent || data.sequenceContent || '';
                sessionData.generatedContent[step.part] = content;
                step.container.innerHTML = `<h3>${step.name}</h3>${marked.parse(content)}`;
            }

            // ========================================================= //
            // --- PASO 3.4: GENERACIÓN DEL INSTRUMENTO DE EVALUACIÓN ---//
            // ========================================================= //
            generationLog.innerHTML += `<div>✍️ Creando el Instrumento de Evaluación...</div>`;
            instrumentoContainer.style.display = 'block';
            const nombreInstrumento = sessionData.formData.instrumento.replace(/_/g, ' de ').replace(/\b\w/g, l => l.toUpperCase());
            instrumentoTitulo.textContent = nombreInstrumento;
            instrumentoOutput.innerHTML = `<p class="gemini-generating-message">Generando ${nombreInstrumento} con Gemini...</p>`;
            instrumentoContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const instrumentoResponse = await fetchWithRetry(`/.netlify/functions/generate-evaluation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    formData: sessionData.formData,
                    context: { criterios: sessionData.generatedContent.criterios },
                    partToGenerate: 'instrumento',
                    constraints: 'Genera el instrumento con un máximo de 4 criterios o ítems a evaluar. Sé conciso.'
                })
            }, 3, 2500, instrumentoOutput);

            if (!instrumentoResponse.ok) throw new Error(`Falló la generación del '${nombreInstrumento}'`);
            const instrumentoData = await instrumentoResponse.json();
            sessionData.generatedContent.instrumento = {
                titulo: nombreInstrumento,
                contenido: instrumentoData.evaluationContent
            };
            instrumentoOutput.innerHTML = marked.parse(instrumentoData.evaluationContent);
            // ========================================================= //


            generationLog.innerHTML += `<div>✅ ¡Sesión completa generada con éxito!</div>`;
            downloadWordBtn.style.display = 'block';
            downloadWordBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });

        } catch (error) {
            console.error('Error durante la orquestación de la generación:', error);
            generationLog.innerHTML += `<div style="color: #ff6b6b;">❌ Error: ${error.message}. Por favor, intenta de nuevo.</div>`;
        } finally {
            startGenerationBtn.disabled = false;
            startGenerationBtn.textContent = 'Generar Sesión Completa';
        }
    });

    // --- LÓGICA PARA DESCARGAR EL DOCUMENTO DE WORD ---
    downloadWordBtn.addEventListener('click', async () => {
        const originalButtonText = downloadWordBtn.textContent;
        downloadWordBtn.disabled = true; downloadWordBtn.textContent = 'Generando .docx...';
        try {
            // El objeto sessionData ya contiene toda la información necesaria, incluidos los nuevos datos de evaluación.

            const response = await fetchWithRetry('/.netlify/functions/generate-word-document', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sessionData)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error("Error del servidor al generar Word:", errorBody);
                throw new Error(`Error del servidor: ${response.status}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none'; a.href = url;
            a.download = `Sesion-${sessionData.formData.tema.replace(/ /g, '_') || 'aprendizaje'}.docx`;
            document.body.appendChild(a); a.click();
            window.URL.revokeObjectURL(url); a.remove();
        } catch (error) {
            console.error('Error al generar el documento de Word:', error);
            alert('Hubo un error al crear el documento. Inténtalo de nuevo.');
        } finally {
            downloadWordBtn.disabled = false;
            downloadWordBtn.textContent = originalButtonText;
        }
    });
});
