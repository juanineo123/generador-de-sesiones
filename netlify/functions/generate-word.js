const docx = require('docx');
const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
    BorderStyle, WidthType, VerticalAlign, ShadingType
} = docx;

const TWIPS_PER_INCH = 1440;
const manualConvertInchesToTwips = (inches) => Math.round(inches * TWIPS_PER_INCH);

const CHECK_GREEN = "✔";
const CHECK_BLACK = "✔";

const cleanTextFromHtml = (html) => {
    return html ? html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : '';
};

function extractBlocks(html) {
    const regex = /(<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>|<ul[\s\S]*?<\/ul>|<ol[\s\S]*?<\/ol>|<p[\s\S]*?<\/p>|<table[\s\S]*?<\/table>|<hr[\s\S]*?\/?>|<div[^>]*class="signature-block"[\s\S]*?<\/div>)/gi;
    let blocks = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(html)) !== null) {
        if (match.index > lastIndex) {
            let textBetween = html.substring(lastIndex, match.index).trim();
            if (textBetween) blocks.push(textBetween);
        }
        blocks.push(match[0]);
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < html.length) {
        let trailing = html.substring(lastIndex).trim();
        if (trailing) blocks.push(trailing);
    }
    return blocks;
}

function isRubricaTable(html) {
    return /class\s*=\s*["']?download-rubrica-table["']?/i.test(html);
}

function groupBlocksBySection(blocks) {
    let sections = [];
    let currentSection = null;
    let currentTitle = null;
    let blockNum = 0;
    let datosBlocks = [];

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.startsWith('<h1') || /download-h1-title/.test(block)) {
            sections.push({ title: "__HEADER__", blocks: [block], blockNum: 0 });
        } else if (
            block.startsWith('<p') &&
            (block.includes('<strong>Fecha:') ||
            block.includes('<strong>Docente:') ||
            block.includes('<strong>Curso/Área:') ||
            block.includes('<strong>Nivel:') ||
            block.includes('<strong>Grado:') ||
            block.includes('<strong>Tiempo:') ||
            block.includes('<strong>Tema:'))
        ) {
            datosBlocks.push(block);
        } else if (block.startsWith('<h2')) {
            if (currentSection) {
                sections.push({ title: currentTitle, blocks: currentSection, blockNum });
            }
            currentSection = [];
            currentTitle = cleanTextFromHtml(block).toUpperCase();
            blockNum++;
        } else if (block.startsWith('<table') && isRubricaTable(block)) {
            sections.push({ title: "RÚBRICA DE EVALUACIÓN", blocks: [block], blockNum: 7 });
        } else if (block.includes('class="signature-block"')) {
            sections.push({ title: "__FIRMA__", blocks: [block], blockNum: 99 });
        } else {
            if (currentSection) {
                currentSection.push(block);
            }
        }
    }
    if (currentSection) {
        sections.push({ title: currentTitle, blocks: currentSection, blockNum });
    }
    if (datosBlocks.length > 0) {
        sections.splice(1, 0, { title: "DATOS", blocks: datosBlocks, blockNum: -1 });
    }
    return sections;
}

function makeTitleCell(text) {
    return new TableCell({
        children: [
            new Paragraph({
                children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 28 })],
                alignment: AlignmentType.LEFT,
                spacing: { after: 80 }
            })
        ],
        shading: {
            type: ShadingType.CLEAR,
            color: "auto",
            fill: "f3f4f6"
        },
        verticalAlign: VerticalAlign.CENTER,
        columnSpan: 2,
    });
}

// NUEVA función: tabla de datos con dos columnas, check verde
function makeDatosTableFromBlocks(blocks) {
    let rows = [];
    for (let block of blocks) {
        let match = block.match(/<strong>([^<:]+):<\/strong>\s*([\s\S]*)<\/p>/i);
        if (match) {
            let campo = match[1].trim().toUpperCase();
            let valor = cleanTextFromHtml(match[2] || "").trim();
            rows.push(
                new TableRow({
                    children: [
                        new TableCell({
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: `${CHECK_GREEN} `, bold: true, color: "228B22" }),
                                        new TextRun({ text: campo, bold: true }),
                                    ],
                                    alignment: AlignmentType.LEFT,
                                })
                            ],
                            verticalAlign: VerticalAlign.CENTER,
                            shading: {
                                type: ShadingType.CLEAR,
                                color: "auto",
                                fill: "f3f4f6"
                            },
                            width: { size: 40, type: WidthType.PERCENTAGE },
                        }),
                        new TableCell({
                            children: [
                                new Paragraph({
                                    children: [new TextRun(valor)],
                                    alignment: AlignmentType.CENTER
                                })
                            ],
                            verticalAlign: VerticalAlign.CENTER,
                            width: { size: 60, type: WidthType.PERCENTAGE },
                        })
                    ]
                })
            );
        }
    }
    if (rows.length === 0) rows.push(new TableRow({ children: [
        new TableCell({ children: [new Paragraph("")] }),
        new TableCell({ children: [new Paragraph("")] })
    ]}));
    // Título "DATOS" arriba de la tabla, ocupando 2 columnas
    rows.unshift(
        new TableRow({
            children: [
                new TableCell({
                    children: [new Paragraph({
                        children: [new TextRun({ text: "DATOS", bold: true, size: 28 })],
                        alignment: AlignmentType.LEFT
                    })],
                    shading: {
                        type: ShadingType.CLEAR,
                        color: "auto",
                        fill: "f3f4f6"
                    },
                    columnSpan: 2,
                    verticalAlign: VerticalAlign.CENTER
                })
            ]
        })
    );
    return new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: "4f46e5" },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "4f46e5" },
            left: { style: BorderStyle.SINGLE, size: 6, color: "4f46e5" },
            right: { style: BorderStyle.SINGLE, size: 6, color: "4f46e5" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "d1d5db" },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "d1d5db" }
        }
    });
}

// Para los demás bloques, listas ul/ol usan viñeta check NEGRO
function makeContentCellFromBlocks(blocks) {
    let children = [];
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
        children.push(new Paragraph(""));
    } else {
        for (let block of blocks) {
            if (block.startsWith('<ul') || block.startsWith('<ol')) {
                const liMatches = block.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
                if (liMatches) {
                    liMatches.forEach(liHtml => {
                        children.push(
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `${CHECK_BLACK} `, bold: true, color: "000000" }),
                                    new TextRun(cleanTextFromHtml(liHtml))
                                ]
                            })
                        );
                    });
                }
            } else if (block.startsWith('<p')) {
                const text = cleanTextFromHtml(block);
                if (text) {
                    children.push(new Paragraph({ children: [new TextRun(text)] }));
                }
            } else if (block.startsWith('<h3')) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: cleanTextFromHtml(block), bold: true, size: 26 })],
                    spacing: { after: 40 }
                }));
            } else if (block.startsWith('<h4')) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: cleanTextFromHtml(block), bold: true, size: 24 })],
                    spacing: { after: 20 }
                }));
            } else {
                const text = cleanTextFromHtml(block);
                if (text) children.push(new Paragraph(text));
            }
        }
        if (children.length === 0) children.push(new Paragraph(""));
    }
    return new TableCell({
        children: children,
        verticalAlign: VerticalAlign.TOP
    });
}

function makeSectionTable(title, blocks) {
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
        return new Paragraph("");
    }
    return new Table({
        rows: [
            new TableRow({
                children: [makeTitleCell(title)]
            }),
            new TableRow({
                children: [makeContentCellFromBlocks(blocks)]
            })
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: "4f46e5" },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "4f46e5" },
            left: { style: BorderStyle.SINGLE, size: 6, color: "4f46e5" },
            right: { style: BorderStyle.SINGLE, size: 6, color: "4f46e5" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "d1d5db" },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "d1d5db" }
        }
    });
}

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Método no permitido. Solo POST." }),
        };
    }

    try {
        const requestBody = JSON.parse(event.body);
        const sessionHtmlContent = requestBody.htmlContent;
        if (!sessionHtmlContent) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "No se proporcionó contenido HTML para la sesión." }),
            };
        }

        const blocks = extractBlocks(sessionHtmlContent);
        const sections = groupBlocksBySection(blocks);

        let docxElements = [];

        for (const section of sections) {
            if (section.title === "__HEADER__") {
                const text = cleanTextFromHtml(section.blocks[0]);
                docxElements.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text,
                                bold: true,
                                color: "4f46e5",
                                size: 36,
                            }),
                        ],
                        heading: HeadingLevel.TITLE,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 120 },
                    })
                );
            } else if (section.blockNum === -1 && section.title === "DATOS") {
                docxElements.push(makeDatosTableFromBlocks(section.blocks));
                docxElements.push(new Paragraph({}));
            } else if (section.blockNum >= 1 && section.blockNum <= 6) {
                docxElements.push(makeSectionTable(section.title, section.blocks));
                docxElements.push(new Paragraph({}));
            } else if (section.blockNum === 7) {
                const block = section.blocks[0];
                const rowsHtml = block.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
                let tableRows = [];
                rowsHtml.forEach((rowHtml, idx) => {
                    const cellMatches = rowHtml.match(/<(th|td)[^>]*>([\s\S]*?)<\/(th|td)>/gi) || [];
                    let cells = [];
                    cellMatches.forEach(cellHtml => {
                        const cellTxt = cleanTextFromHtml(cellHtml);
                        if (/^<th/i.test(cellHtml)) {
                            cells.push(
                                new TableCell({
                                    children: [new Paragraph({ text: cellTxt, alignment: AlignmentType.CENTER })],
                                    shading: {
                                        type: ShadingType.CLEAR,
                                        color: "auto",
                                        fill: "D1FAE5",
                                    },
                                    verticalAlign: VerticalAlign.CENTER,
                                    borders: {
                                        top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                        bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                        left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                        right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                    },
                                })
                            );
                        } else {
                            cells.push(
                                new TableCell({
                                    children: [new Paragraph(cellTxt)],
                                    shading: {
                                        type: ShadingType.CLEAR,
                                        color: "auto",
                                        fill: "F0FDF4",
                                    },
                                    borders: {
                                        top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                        bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                        left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                        right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                    },
                                })
                            );
                        }
                    });
                    if (cells.length > 0) tableRows.push(new TableRow({ children: cells }));
                });
                if (tableRows.length > 0) {
                    docxElements.push(
                        new Paragraph({
                            children: [new TextRun({ text: "7. RÚBRICA DE EVALUACIÓN", bold: true, size: 28 })],
                            spacing: { after: 80 }
                        })
                    );
                    docxElements.push(new Table({
                        rows: tableRows,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: {
                            top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                            bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                            left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                            right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                            insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                            insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                        },
                    }));
                }
            } else if (section.title === "__FIRMA__") {
                const block = section.blocks[0];
                const teacherNameMatch = block.match(/<p class="teacher-name"[^>]*>([\s\S]*?)<\/p>/i);
                const teacherName = teacherNameMatch ? cleanTextFromHtml(teacherNameMatch[1]) : '';
                const teacherTitleMatch = block.match(/<p class="teacher-title"[^>]*>([\s\S]*?)<\/p>/i);
                const teacherTitle = teacherTitleMatch ? cleanTextFromHtml(teacherTitleMatch[1]) : 'Docente';

                docxElements.push(new Paragraph({ text: '', spacing: { before: 600 } }));

                // Línea punteada larga para firma
                docxElements.push(
                    new Paragraph({
                        children: [new TextRun("...................................................................................................................")],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 120 },
                    })
                );

                if (teacherName) {
                    docxElements.push(new Paragraph({
                        children: [new TextRun(teacherName)],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 60 },
                    }));
                }
                docxElements.push(new Paragraph({
                    children: [new TextRun(teacherTitle)],
                    alignment: AlignmentType.CENTER,
                }));
            }
        }

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: manualConvertInchesToTwips(1),
                            bottom: manualConvertInchesToTwips(1),
                            left: manualConvertInchesToTwips(1.25),
                            right: manualConvertInchesToTwips(1.25)
                        }
                    }
                },
                children: docxElements
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": "attachment; filename=sesion_de_clase.docx",
                "Content-Length": buffer.length.toString(),
            },
            body: buffer.toString('base64'),
            isBase64Encoded: true,
        };

    } catch (error) {
        console.error("Error en generate-word:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Error al generar el documento Word. Revisa los logs del servidor.", error: error.message }),
        };
    }
};