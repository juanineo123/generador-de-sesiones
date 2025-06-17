// ARCHIVO: generate-word.js (VERSIÓN FINALÍSIMA)
const docx = require('docx');
const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    Table,
    TableRow,
    TableCell,
    BorderStyle,
    WidthType,
    VerticalAlign,
    ShadingType,
} = docx;

function cleanText(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function createSectionHeading(text) {
    return new Paragraph({
        children: [
            new TextRun({
                text: text.toUpperCase(),
                bold: true,
                size: 24,
                color: "2E74B5",
            }),
        ],
        spacing: { after: 200, before: 400 },
        border: { bottom: { color: "BFBFBF", space: 1, style: "single", size: 6 } },
    });
}

function createBulletedList(itemsHtml) {
    if (!itemsHtml) return [new Paragraph('')];
    const listItems = itemsHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    return listItems.map(item => new Paragraph({
        text: cleanText(item),
        bullet: { level: 0 },
        indent: { left: 360 },
    }));
}

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: "Método no permitido." }) };
    }

    try {
        const requestBody = JSON.parse(event.body);
        const html = requestBody.htmlContent;
        if (!html) {
            return { statusCode: 400, body: JSON.stringify({ message: "No se proporcionó contenido HTML." }) };
        }

        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const title = titleMatch ? cleanText(titleMatch[1]) : "Sesión de Aprendizaje";

        const datosGenerales = {};
        const datosRegex = /<p><strong>([^<]+):<\/strong>\s*([^<]+)<\/p>/gi;
        let match;
        while ((match = datosRegex.exec(html)) !== null) {
            datosGenerales[match[1]] = match[2].trim();
        }

        const sectionsHtml = html.split(/<h2[^>]*>/);
        const propositosHtml = sectionsHtml.find(s => s.includes("PROPÓSITOS DE APRENDIZAJE"));
        const compTransversalesHtml = sectionsHtml.find(s => s.includes("COMPETENCIAS TRANSVERSALES"));
        const enfoquesHtml = sectionsHtml.find(s => s.includes("ENFOQUES TRANSVERSALES"));
        const criteriosHtml = sectionsHtml.find(s => s.includes("CRITERIOS DE EVALUACIÓN"));
        const secuenciaHtml = sectionsHtml.find(s => s.includes("SECUENCIA DIDÁCTICA"));
        const tareaHtml = sectionsHtml.find(s => s.includes("TAREA PARA EL ALUMNO"));
        const rubricaHtml = sectionsHtml.find(s => s.includes("RÚBRICA DE EVALUACIÓN"));
        const firmaHtml = html.match(/<div class="signature-block"[\s\S]*?<\/div>/i);
        
        const titleParagraph = new Paragraph({
            children: [new TextRun({ text: title, bold: true, color: "4f46e5", size: 44 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
        });

        const datosTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Docente:", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(datosGenerales['Docente'] || '')] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fecha:", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(datosGenerales['Fecha'] || '')] }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Curso/Área:", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(datosGenerales['Curso/Área'] || '')] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nivel:", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(datosGenerales['Nivel'] || '')] }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Grado:", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(datosGenerales['Grado'] || '')] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tiempo:", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(datosGenerales['Tiempo'] || '')] }),
                    ],
                }),
                 new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tema:", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph(datosGenerales['Tema'] || '')], columnSpan: 3 }),
                    ],
                }),
            ],
        });

        let docxElements = [titleParagraph];
        docxElements.push(createSectionHeading("1. DATOS GENERALES"));
        docxElements.push(datosTable);

        if (propositosHtml) {
            docxElements.push(createSectionHeading("2. PROPÓSITOS DE APRENDIZAJE"));
            const competenciasMatches = propositosHtml.split(/<h3[^>]*>/).slice(1);
            const tableHeader = new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "COMPETENCIA", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "4472C4" } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CAPACIDADES", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "4472C4" } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DESEMPEÑOS PRECISADOS", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "4472C4" } }),
                ],
            });
            const tableRows = competenciasMatches.map(compHtml => {
                const competenciaText = cleanText(compHtml.match(/([\s\S]*?)<h4/i)[1]);
                const capacidadesHtml = compHtml.match(/Capacidades:<\/h4>([\s\S]*?)<h4/i);
                const capacidadesText = capacidadesHtml ? createBulletedList(capacidadesHtml[1]) : [new Paragraph('')];
                const desempenosHtml = compHtml.match(/Desempeños Precisados:<\/h4>([\s\S]*)/i);
                const desempenosText = desempenosHtml ? createBulletedList(desempenosHtml[1]) : [new Paragraph('')];
                return new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(competenciaText)], verticalAlign: VerticalAlign.CENTER }),
                        new TableCell({ children: capacidadesText }),
                        new TableCell({ children: desempenosText }),
                    ],
                });
            });
            const propositosTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [tableHeader, ...tableRows] });
            docxElements.push(propositosTable);
        }

        if (compTransversalesHtml) {
            docxElements.push(createSectionHeading("3. COMPETENCIAS TRANSVERSALES"));
            const h3matches = compTransversalesHtml.match(/<h3[^>]*>[\s\S]*?<\/h3>/gi) || [];
            h3matches.forEach(h3 => {
                const compName = cleanText(h3);
                const listHtml = compTransversalesHtml.split(h3)[1].split('<h3')[0];
                docxElements.push(new Paragraph({ text: compName, style: "IntenseQuote" }));
                docxElements.push(...createBulletedList(listHtml));
            });
        }
        if (enfoquesHtml) {
            docxElements.push(createSectionHeading("4. ENFOQUES TRANSVERSALES"));
            docxElements.push(...createBulletedList(enfoquesHtml));
        }
        if (criteriosHtml) {
            docxElements.push(createSectionHeading("5. CRITERIOS DE EVALUACIÓN"));
            docxElements.push(...createBulletedList(criteriosHtml));
        }
        
        // --- ÚNICO CAMBIO EN ESTA VERSIÓN: INICIO ---
        if (secuenciaHtml) {
            docxElements.push(createSectionHeading("6. SECUENCIA DIDÁCTICA"));

            // 1. Encontrar cada bloque de la secuencia (Inicio, Desarrollo, Cierre)
            const momentos = secuenciaHtml.split(/<h3[^>]*>/).slice(1);
            const inicioMomento = momentos.find(m => m.toLowerCase().includes('inicio'));
            const desarrolloMomento = momentos.find(m => m.toLowerCase().includes('desarrollo'));
            const cierreMomento = momentos.find(m => m.toLowerCase().includes('cierre'));

            // 2. Extraer el TÍTULO COMPLETO (con el tiempo) de cada bloque
            const getTitle = (momento) => momento ? cleanText(momento.match(/([\s\S]*?)<\/h3>/i)[1]) : "";
            const inicioTitle = getTitle(inicioMomento) || "INICIO";
            const desarrolloTitle = getTitle(desarrolloMomento) || "DESARROLLO";
            const cierreTitle = getTitle(cierreMomento) || "CIERRE";

            // 3. Extraer el CONTENIDO de cada bloque (las actividades)
            const getContent = (momento) => momento ? momento.split('</h3>')[1] : null;
            const inicioContent = createBulletedList(getContent(inicioMomento));
            const desarrolloContent = createBulletedList(getContent(desarrolloMomento));
            const cierreContent = createBulletedList(getContent(cierreMomento));

            // 4. Construir la tabla usando los títulos y contenidos extraídos
            const secuenciaTable = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: inicioTitle.toUpperCase(), bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "4472C4" } }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: desarrolloTitle.toUpperCase(), bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "4472C4" } }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: cierreTitle.toUpperCase(), bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "4472C4" } }),
                        ],
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: inicioContent, verticalAlign: VerticalAlign.TOP }),
                            new TableCell({ children: desarrolloContent, verticalAlign: VerticalAlign.TOP }),
                            new TableCell({ children: cierreContent, verticalAlign: VerticalAlign.TOP }),
                        ],
                    }),
                ]
            });
            docxElements.push(secuenciaTable);
        }
        // --- ÚNICO CAMBIO EN ESTA VERSIÓN: FIN ---

        if (tareaHtml) {
            docxElements.push(createSectionHeading("7. TAREA PARA EL ALUMNO"));
            docxElements.push(...createBulletedList(tareaHtml));
        }

        if (rubricaHtml) {
            docxElements.push(createSectionHeading("8. RÚBRICA DE EVALUACIÓN"));
            const tableMatch = rubricaHtml.match(/<table[\s\S]*?<\/table>/i);
            if (tableMatch) {
                const rowsHtml = tableMatch[0].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
                const tableRows = rowsHtml.map((rowHtml, rowIndex) => {
                    const cellsHtml = rowHtml.match(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
                    const tableCells = cellsHtml.map(cellHtml => {
                        const textContent = cleanText(cellHtml);
                        const isHeader = rowIndex === 0;
                        return new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: textContent, bold: isHeader, color: isHeader ? "FFFFFF" : "000000"})], alignment: AlignmentType.LEFT })],
                            shading: { fill: isHeader ? "4472C4" : "FFFFFF" },
                            verticalAlign: VerticalAlign.CENTER,
                        });
                    });
                    return new TableRow({ children: tableCells });
                });
                const rubricaTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows });
                docxElements.push(rubricaTable);
            }
        }
        
        if (firmaHtml) {
            const teacherName = cleanText(firmaHtml[0].match(/<p class="teacher-name"[^>]*>([\s\S]*?)<\/p>/i)[1]);
            docxElements.push(new Paragraph({ text: '', spacing: { before: 800 } }));
            docxElements.push(new Paragraph({
                children: [new TextRun("___________________________________")],
                alignment: AlignmentType.CENTER
            }));
            docxElements.push(new Paragraph({
                children: [new TextRun(teacherName)],
                alignment: AlignmentType.CENTER,
                spacing: { before: 100 }
            }));
            docxElements.push(new Paragraph({
                children: [new TextRun("Docente")],
                alignment: AlignmentType.CENTER
            }));
        }

        const doc = new Document({
            styles: {
                paragraphStyles: [{
                    id: "IntenseQuote",
                    name: "Intense Quote",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { bold: true, color: "5B9BD5" },
                    paragraph: { spacing: { before: 240, after: 120 } }
                }]
            },
            sections: [{
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                children: docxElements
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
            body: buffer.toString('base64'),
            isBase64Encoded: true,
        };

    } catch (error) {
        console.error("Error en generate-word:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error al generar el documento Word.", error: error.message }),
        };
    }
};