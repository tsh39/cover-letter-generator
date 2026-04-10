import { Document, Paragraph, TextRun, Packer, AlignmentType } from 'docx';

/**
 * Generate a .docx buffer from cover letter text.
 * @param {string} letterText - Plain text cover letter
 * @returns {Promise<Buffer>} .docx file as a buffer
 */
export async function generateDocx(letterText) {
  const paragraphs = letterText.split('\n\n').filter(Boolean).map(
    (para) =>
      new Paragraph({
        children: [
          new TextRun({
            text: para.trim(),
            font: 'Times New Roman',
            size: 24, // 12pt (half-points)
          }),
        ],
        spacing: {
          after: 240, // 12pt spacing after paragraph
        },
        alignment: AlignmentType.LEFT,
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
