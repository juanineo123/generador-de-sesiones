// netlify/functions/generate-word.js

// Importamos las clases necesarias de la librería docx
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, BorderStyle, WidthType } = docx;

exports.handler = async function(event, context) {
    // Aseguramos que solo respondemos a solicitudes POST (donde se envían datos)
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Método no permitido. Solo POST." }),
        };
    }

    let sessionHtmlContent;
    try {
        // El frontend enviará el HTML de la sesión en el cuerpo de la solicitud POST
        const requestBody = JSON.parse(event.body);
        sessionHtmlContent = requestBody.htmlContent; // Suponemos que el HTML viene en una propiedad 'htmlContent'

        if (!sessionHtmlContent) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "No se proporcionó contenido HTML para la sesión." }),
            };
        }

        // Array para almacenar los elementos DOCX que se añadirán a la sección.
        const docxElements = [];

        // Función para limpiar texto de HTML básico
        const cleanTextFromHtml = (html) => {
            return html.replace(/<[^>]*>/g, '').trim(); // Eliminar todas las etiquetas HTML y espacios
        };

        // Función para procesar el HTML y añadir elementos docx
        const processHtmlContent = (html) => {
            // Dividir el HTML en bloques basados en las etiquetas principales
            const blocks = html.split(/(<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>|<ul[^>]*>[\s\S]*?<\/ul>|<p[^>]*>[\s\S]*?<\/p>|<table[^>]*>[\s\S]*?<\/table>|<hr[^>]*\/?>)/gi);

            blocks.forEach(block => {
                if (!block || block.trim() === '') return;

                if (block.startsWith('<h1')) {
                    const textContent = cleanTextFromHtml(block);
                    if (textContent) docxElements.push(new Paragraph({ text: textContent, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }));
                } else if (block.startsWith('<h2')) {
                    const textContent = cleanTextFromHtml(block);
                    if (textContent) docxElements.push(new Paragraph({ text: textContent, heading: HeadingLevel.HEADING_2 }));
                } else if (block.startsWith('<h3')) {
                    const textContent = cleanTextFromHtml(block);
                    if (textContent) docxElements.push(new Paragraph({ text: textContent, heading: HeadingLevel.HEADING_3 }));
                } else if (block.startsWith('<h4')) {
                    const textContent = cleanTextFromHtml(block);
                    if (textContent) docxElements.push(new Paragraph({ text: textContent, heading: HeadingLevel.HEADING_4 }));
                } else if (block.startsWith('<p')) {
                    const textContent = cleanTextFromHtml(block);
                    if (textContent) docxElements.push(new Paragraph({ children: [new TextRun(textContent)] }));
                } else if (block.startsWith('<ul')) {
                    const liMatches = block.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
                    if (liMatches) {
                        liMatches.forEach(liHtml => {
                            const liText = cleanTextFromHtml(liHtml);
                            if (liText) docxElements.push(new Paragraph({ children: [new TextRun(liText)], bullet: { level: 0 } }));
                        });
                    }
                } else if (block.startsWith('<table')) {
                    // --- Lógica específica para la tabla de rúbrica ---
                    if (block.includes('class="download-rubrica-table"')) {
                        const tableRows = [];
                        const rowsHtml = block.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
                        
                        if (rowsHtml) {
                            rowsHtml.forEach(rowHtml => {
                                const cells = [];
                                const cellMatches = rowHtml.match(/<(th|td)[^>]*>([\s\S]*?)<\/(th|td)>/gi);
                                if (cellMatches) {
                                    cellMatches.forEach(cellHtml => {
                                        cells.push(new TableCell({
                                            children: [new Paragraph(cleanTextFromHtml(cellHtml))],
                                            borders: {
                                                top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                                bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                                left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                                right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                            },
                                        }));
                                    });
                                }
                                tableRows.push(new TableRow({ children: cells, tableHeader: rowHtml.includes('<th') })); // tableHeader para la fila de encabezados
                            });
                        }
                        
                        if (tableRows.length > 0) {
                            docxElements.push(new Table({
                                rows: tableRows,
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                borders: { // Bordes para toda la tabla
                                    top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                    bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                    left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                    right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                    insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                    insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                }
                            }));
                        }
                    } else {
                        // Si hay otras tablas no rúbrica, las convertimos a texto plano por simplicidad
                        docxElements.push(new Paragraph({ children: [new TextRun('[Contenido de tabla no rúbrica omitido o convertido a texto plano]') ]}));
                    }
                } else if (block.startsWith('<hr')) {
                    // Para <hr>, podemos añadir un párrafo vacío o un salto de línea grande
                    docxElements.push(new Paragraph({ text: '', spacing: { after: 240 } })); // Espacio después del HR
                } else {
                    // Texto sin etiqueta o el bloque restante
                    const text = cleanTextFromHtml(block);
                    if(text) docxElements.push(new Paragraph({ children: [new TextRun(text)] }));
                }
            });
        };

        // Procesar el HTML de la sesión y añadirlo a los docxElements
        processHtmlContent(sessionHtmlContent);
        
        // Crear el Documento DOCX con todos los elementos procesados
        const doc = new Document({
            sections: [{
                properties: {},
                children: docxElements, // Aquí se añaden todos los elementos procesados
            }],
        });

        const buffer = await Packer.toBuffer(doc);

        // Enviar el archivo DOCX de vuelta al navegador
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
