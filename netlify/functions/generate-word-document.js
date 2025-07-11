// Importar los componentes necesarios de la librería docx
const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    AlignmentType,
    VerticalAlign,
    ShadingType,
} = require("docx");

// --- FUNCIÓN AUXILIAR PARA TÍTULOS DE SECCIÓN ---
const createSectionTitle = (text) => {
    return new Paragraph({
        children: [new TextRun({ text, bold: true, size: 24, font: "Calibri" })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
    });
};

// --- FUNCIÓN AUXILIAR PARA SUBTÍTULOS ---
const createSubTitle = (text) => {
    return new Paragraph({
        children: [new TextRun({ text, bold: true, size: 22, font: "Calibri" })],
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
    });
};

// --- FUNCIÓN PARA PARSEAR MARKDOWN BÁSICO (NEGRITA E ITÁLICA) ---
const parseMarkdownToTextRuns = (text = "") => {
    const runs = [];
    if (typeof text !== 'string') text = '';
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    parts.forEach(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
        } else if (part.startsWith('*') && part.endsWith('*')) {
            runs.push(new TextRun({ text: part.slice(1, -1), italic: true }));
        } else if (part) {
            runs.push(new TextRun(part));
        }
    });
    return runs;
};

// --- FUNCIÓN PARA CREAR PÁRRAFOS CON FORMATO Y LISTAS ---
const createFormattedParagraphs = (text = "", isJustified = false) => {
    if (!text || typeof text !== 'string' || text.trim() === "") {
        return [new Paragraph({ text: "" })];
    }

    const paragraphOptions = {
        alignment: isJustified ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
        spacing: { after: 100 }
    };

    return text.split('\n').map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine === '') return new Paragraph({ text: "" });

        if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ') || trimmedLine.startsWith('- ')) {
            const bulletText = trimmedLine.substring(2);
            return new Paragraph({
                ...paragraphOptions,
                children: parseMarkdownToTextRuns(bulletText),
                bullet: { level: 0 },
            });
        }

        return new Paragraph({
            ...paragraphOptions,
            children: parseMarkdownToTextRuns(trimmedLine)
        });
    });
};

// --- FUNCIÓN PARA CREAR LA TABLA DE CRITERIOS (VERSIÓN SIMPLIFICADA) ---
const createCriteriaTable = (criteriaText = "") => {
    if (!criteriaText || typeof criteriaText !== 'string' || criteriaText.trim() === "") {
        return [new Paragraph({ text: "No se especificaron criterios." })];
    }

    const criteria = criteriaText.trim().split('\n').filter(line => line.trim() !== '');

    const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                tableHeader: true,
                children: [
                    new TableCell({
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CRITERIOS DE EVALUACIÓN", bold: true, allCaps: true, size: 24 })] })],
                        verticalAlign: VerticalAlign.CENTER,
                    }),
                ],
            }),
            ...criteria.map(criterion => new TableRow({
                children: [
                    new TableCell({
                        children: createFormattedParagraphs(criterion.replace(/^- |^\* |^• /, '').trim()),
                        verticalAlign: VerticalAlign.CENTER,
                    }),
                ],
            })),
        ],
    });
    return [table];
};


// --- FUNCIÓN experta PARA CONVERTIR TABLAS MARKDOWN A DOCX ---
const createTableFromMarkdown = (markdownText = "") => {
    if (!markdownText || typeof markdownText !== 'string' || !markdownText.includes('|')) {
        return createFormattedParagraphs(markdownText);
    }

    const lines = markdownText.trim().split('\n').filter(line => line.includes('|'));
    if (lines.length < 2) return createFormattedParagraphs(markdownText);

    const headerLine = lines[0];
    const dataLines = lines.slice(2);

    const getCells = (line) => line.split('|').slice(1, -1).map(cell => cell.trim());

    const headerCells = getCells(headerLine);
    const tableRows = dataLines.map(line => getCells(line));

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                tableHeader: true,
                children: headerCells.map(headerText => new TableCell({
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: headerText, bold: true, allCaps: true, size: 22 })]
                    })],
                    verticalAlign: VerticalAlign.CENTER,
                })),
            }),
            ...tableRows.map(row => new TableRow({
                children: row.map(cellText => new TableCell({
                    children: createFormattedParagraphs(cellText),
                    verticalAlign: VerticalAlign.CENTER,
                })),
            })),
        ],
    });
};


// La función principal que se ejecutará en la nube
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const sessionData = JSON.parse(event.body);
        const { formData, generatedContent } = sessionData;

        const fechaActual = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });

        const competencia = generatedContent.competencia || {};
        const nombreCompetencia = competencia.nombre || 'No especificada';
        const listaCapacidades = competencia.capacidades ? competencia.capacidades.map(c => c.nombre) : [];
        const listaDesempenos = competencia.capacidades ? competencia.capacidades.flatMap(c => c.desempenos || []) : [];
        const listaCriterios = generatedContent.criterios || "";
        const instrumento = generatedContent.instrumento || {};
        const producto = generatedContent.producto || "";

        const createBulletedList = (items) => {
            if (!items || items.length === 0) return [new Paragraph({ text: "" })];
            return items.map(item => new Paragraph({ text: item, bullet: { level: 0 } }));
        };

        const doc = new Document({
            styles: {
                paragraphStyles: [{
                    id: "Normal",
                    name: "Normal",
                    run: { font: "Calibri", size: 22 }
                }]
            },
            sections: [{
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                children: [
                    new Paragraph({
                        heading: HeadingLevel.TITLE,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 300 },
                        children: [
                            new TextRun({
                                text: `SESIÓN DE APRENDIZAJE SOBRE: "${formData.tema}"`,
                                bold: true,
                                allCaps: true,
                                size: 36
                            })
                        ]
                    }),

                    createSectionTitle("I. DATOS INFORMATIVOS"),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Docente:", bold: true })] })] }), new TableCell({ children: [new Paragraph(formData.docente || '')] })] }),
                            new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Director(a):", bold: true })] })] }), new TableCell({ children: [new Paragraph(formData.director || '')] })] }),
                            new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "I.E.:", bold: true })] })] }), new TableCell({ children: [new Paragraph(formData.colegio || '')] })] }),
                            new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nivel:", bold: true })] })] }), new TableCell({ children: [new Paragraph(formData.nivel || '')] })] }),
                            new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Grado:", bold: true })] })] }), new TableCell({ children: [new Paragraph(formData.grado || '')] })] }),
                            new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Área:", bold: true })] })] }), new TableCell({ children: [new Paragraph(formData.area || '')] })] }),
                            new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tema:", bold: true })] })] }), new TableCell({ children: [new Paragraph(formData.tema || '')] })] }),
                            new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fecha:", bold: true })] })] }), new TableCell({ children: [new Paragraph(fechaActual)] })] }),
                            new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Duración:", bold: true })] })] }), new TableCell({ children: [new Paragraph(`${formData.duracion || '90'} minutos`)] })] }),
                        ],
                    }),

                    createSectionTitle("II. PROPÓSITOS DE APRENDIZAJE"),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        columnWidths: [25, 30, 45],
                        rows: [
                            new TableRow({
                                tableHeader: true,
                                children: [
                                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "COMPETENCIA", bold: true, allCaps: true })] })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CAPACIDADES", bold: true, allCaps: true })] })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DESEMPEÑOS PRECISADOS", bold: true, allCaps: true })] })], verticalAlign: VerticalAlign.CENTER }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph(nombreCompetencia)], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: createBulletedList(listaCapacidades), verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: createBulletedList(listaDesempenos), verticalAlign: VerticalAlign.CENTER }),
                                ],
                            }),
                        ],
                    }),

                    // --- CAMBIO: SUBTÍTULOS CON CHECKBOX ---
                    // Código nuevo y corregido
                    new Paragraph({
                        children: [
                            new TextRun({ text: "✔ ", bold: true, size: 22, font: "Calibri", color: "008000" }),
                            new TextRun({ text: "Propósito de la Sesión", bold: true, size: 22, font: "Calibri" })
                        ],
                        heading: HeadingLevel.HEADING_3,
                        spacing: { before: 200, after: 100 },
                    }),
                    ...createFormattedParagraphs(generatedContent.proposito, true),

                    new Paragraph({
                        children: [
                            new TextRun({ text: "✔ ", bold: true, size: 22, font: "Calibri", color: "008000" }),
                            new TextRun({ text: "Reto (Situación Significativa)", bold: true, size: 22, font: "Calibri" })
                        ],
                        heading: HeadingLevel.HEADING_3,
                        spacing: { before: 200, after: 100 },
                    }),
                    ...createFormattedParagraphs(generatedContent.reto, true),

                    createSectionTitle("III. CRITERIOS DE EVALUACIÓN"),
                    ...createCriteriaTable(listaCriterios),

                    createSubTitle("Evidencia de Aprendizaje"),
                    ...createFormattedParagraphs(generatedContent.evidencia, true),

                    // BLOQUE NUEVO PARA EL PRODUCTO
                    createSubTitle("Producto"),
                    ...createFormattedParagraphs(producto, true),

                    createSectionTitle("IV. SECUENCIA DIDÁCTICA"),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                tableHeader: true,
                                children: [
                                    new TableCell({
                                        verticalAlign: VerticalAlign.CENTER,
                                        children: [new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            children: [new TextRun({ text: "MOMENTOS", bold: true, allCaps: true })]
                                        })]
                                    }),
                                    new TableCell({
                                        verticalAlign: VerticalAlign.CENTER,
                                        children: [new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            children: [new TextRun({ text: "PROCESOS PEDAGÓGICOS Y ACTIVIDADES", bold: true, allCaps: true })]
                                        })]
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        width: { size: 20, type: WidthType.PERCENTAGE },
                                        verticalAlign: VerticalAlign.CENTER,
                                        children: [new Paragraph({ children: [new TextRun({ text: "Inicio", bold: true })] })]
                                    }),
                                    new TableCell({ children: createFormattedParagraphs(generatedContent.inicio) })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        width: { size: 20, type: WidthType.PERCENTAGE },
                                        verticalAlign: VerticalAlign.CENTER,
                                        children: [new Paragraph({ children: [new TextRun({ text: "Desarrollo", bold: true })] })]
                                    }),
                                    new TableCell({ children: createFormattedParagraphs(generatedContent.desarrollo) })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        width: { size: 20, type: WidthType.PERCENTAGE },
                                        verticalAlign: VerticalAlign.CENTER,
                                        children: [new Paragraph({ children: [new TextRun({ text: "Cierre", bold: true })] })]
                                    }),
                                    new TableCell({ children: createFormattedParagraphs(generatedContent.cierre) })
                                ]
                            }),
                        ],
                    }),

                    createSectionTitle(`V. INSTRUMENTO DE EVALUACIÓN: ${instrumento.titulo || ""}`),
                    createTableFromMarkdown(instrumento.contenido),

                    createSectionTitle("VI. FIRMAS"),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        columnWidths: [45, 10, 45],
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
                        rows: [
                            new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "\n\n__________________________", alignment: AlignmentType.CENTER })] }), new TableCell({ children: [] }), new TableCell({ children: [new Paragraph({ text: "\n\n__________________________", alignment: AlignmentType.CENTER })] })] }),
                            new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: formData.docente || '', alignment: AlignmentType.CENTER }), new Paragraph({ text: "Docente de Aula", alignment: AlignmentType.CENTER })] }), new TableCell({ children: [] }), new TableCell({ children: [new Paragraph({ text: formData.director || '', alignment: AlignmentType.CENTER }), new Paragraph({ text: "Director(a)", alignment: AlignmentType.CENTER })] })] }),
                        ],
                    }),
                ],
            }],
        });

        // --- INICIO DE LA MODIFICACIÓN PARA LA DESCARGA ---

        // Sanitiza el nombre del archivo para evitar errores
        const safeFileName = (formData.tema || "sesion_de_aprendizaje")
            .replace(/[^a-z0-9áéíóúñü \.,_-]/gim, '')
            .trim()
            .replace(/\s+/g, '_');

        const buffer = await Packer.toBuffer(doc);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                // Esta línea le dice al navegador que descargue el archivo
                'Content-Disposition': `attachment; filename="${safeFileName}.docx"`
            },
            body: buffer.toString('base64'),
            isBase64Encoded: true,
        };
        // --- FIN DE LA MODIFICACIÓN ---

    } catch (error) {
        console.error("Error al generar el documento de Word:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Hubo un error al crear el documento.' })
        };
    }
};