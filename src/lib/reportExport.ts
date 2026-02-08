import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { AuditReport } from '@/types/report';

// Helper to convert TipTap JSON to plain text
function tiptapToText(content: string): string {
    if (!content) return '';

    try {
        const json = JSON.parse(content);
        if (json.type === 'doc' && json.content) {
            return json.content.map((node: any) => {
                if (node.type === 'paragraph' && node.content) {
                    return node.content.map((n: any) => n.text || '').join('');
                }
                return '';
            }).join('\n');
        }
        return '';
    } catch {
        return content;
    }
}

// Export report as PDF
export async function exportToPDF(report: AuditReport): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);
    let yPosition = margin;

    const addText = (text: string, fontSize: number = 12, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left') => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');

        const lines = pdf.splitTextToSize(text, contentWidth);

        lines.forEach((line: string) => {
            if (yPosition > pageHeight - margin) {
                pdf.addPage();
                yPosition = margin;
            }

            let xPosition = margin;
            if (align === 'center') {
                xPosition = pageWidth / 2;
            } else if (align === 'right') {
                xPosition = pageWidth - margin;
            }

            pdf.text(line, xPosition, yPosition, { align });
            yPosition += fontSize * 0.4;
        });

        yPosition += 2;
    };

    const addHeading = (text: string, level: number = 1) => {
        const fontSize = level === 1 ? 18 : level === 2 ? 14 : 12;
        yPosition += 5;
        addText(text, fontSize, true);
        yPosition += 2;
    };

    const addSection = (heading: string, content: string) => {
        if (!content || content.trim() === '') return;

        addHeading(heading, 2);
        const plainText = tiptapToText(content);
        if (plainText) {
            addText(plainText);
        }
        yPosition += 5;
    };

    // Cover Page
    pdf.setFillColor(44, 17, 0); // primary color
    pdf.rect(0, 0, pageWidth, 60, 'F');

    pdf.setTextColor(255, 255, 255);
    addText('AUDIT REPORT', 24, true, 'center');
    yPosition += 5;
    addText(report.title || 'Untitled Report', 16, false, 'center');

    pdf.setTextColor(0, 0, 0);
    yPosition = 80;

    // Report Details
    addText(`Report Number: ${report.reportNumber || 'N/A'}`, 12, true);
    addText(`Scheme: ${report.schemeType === 'LPG_SUBSIDY' ? 'LPG Subsidy' : 'Mid-Day Meal'}`, 12);
    addText(`Audit Period: ${report.auditPeriod.startDate} to ${report.auditPeriod.endDate}`, 12);
    addText(`Author: ${report.author || 'N/A'}`, 12);
    addText(`Status: ${report.status.toUpperCase().replace('_', ' ')}`, 12);
    yPosition += 10;

    // Add sections
    pdf.addPage();
    yPosition = margin;

    addSection('PREFACE', report.sections.preface);
    addSection('EXECUTIVE SUMMARY', report.sections.executiveSummary);
    addSection('INTRODUCTION', report.sections.introduction);
    addSection('METHODOLOGY', report.sections.methodology);

    // Findings
    if (report.sections.findings.length > 0) {
        addHeading('AUDIT FINDINGS', 2);
        report.sections.findings.forEach((finding, index) => {
            addHeading(`Para ${finding.paraNumber}: ${finding.title}`, 3);

            addText(`Severity: ${finding.severity.toUpperCase()}`, 10, true);
            addText(`Status: ${finding.status.toUpperCase()}`, 10);
            if (finding.amountInvolved) {
                addText(`Amount Involved: ₹${finding.amountInvolved.toLocaleString('en-IN')}`, 10, true);
            }
            yPosition += 3;

            if (finding.background) {
                addText('Background:', 11, true);
                addText(tiptapToText(finding.background), 10);
            }

            if (finding.observation) {
                addText('Observation:', 11, true);
                addText(tiptapToText(finding.observation), 10);
            }

            if (finding.impact) {
                addText('Impact:', 11, true);
                addText(tiptapToText(finding.impact), 10);
            }

            if (finding.recommendation) {
                addText('Recommendation:', 11, true);
                addText(tiptapToText(finding.recommendation), 10);
            }

            yPosition += 5;
        });
    }

    addSection('RECOMMENDATIONS', report.sections.recommendations);
    addSection('CONCLUSION', report.sections.conclusion);

    // Save
    const filename = `${report.reportNumber || 'audit_report'}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
}

// Export report as DOCX
export async function exportToDOCX(report: AuditReport): Promise<void> {
    const sections: any[] = [];

    // Title
    sections.push(
        new Paragraph({
            text: 'AUDIT REPORT',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        }),
        new Paragraph({
            text: report.title || 'Untitled Report',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        })
    );

    // Report Details
    sections.push(
        new Paragraph({
            children: [
                new TextRun({ text: 'Report Number: ', bold: true }),
                new TextRun(report.reportNumber || 'N/A'),
            ],
            spacing: { after: 100 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'Scheme: ', bold: true }),
                new TextRun(report.schemeType === 'LPG_SUBSIDY' ? 'LPG Subsidy Scheme' : 'Mid-Day Meal Scheme'),
            ],
            spacing: { after: 100 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'Audit Period: ', bold: true }),
                new TextRun(`${report.auditPeriod.startDate} to ${report.auditPeriod.endDate}`),
            ],
            spacing: { after: 100 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'Author: ', bold: true }),
                new TextRun(report.author || 'N/A'),
            ],
            spacing: { after: 100 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'Status: ', bold: true }),
                new TextRun(report.status.toUpperCase().replace('_', ' ')),
            ],
            spacing: { after: 400 },
        })
    );

    // Helper to add section
    const addDocSection = (title: string, content: string) => {
        if (!content || content.trim() === '') return;

        sections.push(
            new Paragraph({
                text: title,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
            })
        );

        const plainText = tiptapToText(content);
        if (plainText) {
            plainText.split('\n').forEach(line => {
                sections.push(
                    new Paragraph({
                        text: line,
                        spacing: { after: 100 },
                    })
                );
            });
        }
    };

    // Add sections
    addDocSection('PREFACE', report.sections.preface);
    addDocSection('EXECUTIVE SUMMARY', report.sections.executiveSummary);
    addDocSection('INTRODUCTION', report.sections.introduction);
    addDocSection('METHODOLOGY', report.sections.methodology);

    // Findings
    if (report.sections.findings.length > 0) {
        sections.push(
            new Paragraph({
                text: 'AUDIT FINDINGS',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
            })
        );

        report.sections.findings.forEach((finding, index) => {
            sections.push(
                new Paragraph({
                    text: `Para ${finding.paraNumber}: ${finding.title}`,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 150 },
                })
            );

            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Severity: ', bold: true }),
                        new TextRun(finding.severity.toUpperCase()),
                        new TextRun('  |  '),
                        new TextRun({ text: 'Status: ', bold: true }),
                        new TextRun(finding.status.toUpperCase()),
                    ],
                    spacing: { after: 100 },
                })
            );

            if (finding.amountInvolved) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Amount Involved: ', bold: true }),
                            new TextRun(`₹${finding.amountInvolved.toLocaleString('en-IN')}`),
                        ],
                        spacing: { after: 150 },
                    })
                );
            }

            if (finding.background) {
                sections.push(
                    new Paragraph({
                        children: [new TextRun({ text: 'Background:', bold: true })],
                        spacing: { before: 100, after: 50 }
                    })
                );
                const bgText = tiptapToText(finding.background);
                bgText.split('\n').forEach(line => {
                    sections.push(new Paragraph({ text: line, spacing: { after: 100 } }));
                });
            }

            if (finding.observation) {
                sections.push(
                    new Paragraph({
                        children: [new TextRun({ text: 'Observation:', bold: true })],
                        spacing: { before: 100, after: 50 }
                    })
                );
                const obsText = tiptapToText(finding.observation);
                obsText.split('\n').forEach(line => {
                    sections.push(new Paragraph({ text: line, spacing: { after: 100 } }));
                });
            }

            if (finding.impact) {
                sections.push(
                    new Paragraph({
                        children: [new TextRun({ text: 'Impact:', bold: true })],
                        spacing: { before: 100, after: 50 }
                    })
                );
                const impactText = tiptapToText(finding.impact);
                impactText.split('\n').forEach(line => {
                    sections.push(new Paragraph({ text: line, spacing: { after: 100 } }));
                });
            }

            if (finding.recommendation) {
                sections.push(
                    new Paragraph({
                        children: [new TextRun({ text: 'Recommendation:', bold: true })],
                        spacing: { before: 100, after: 50 }
                    })
                );
                const recText = tiptapToText(finding.recommendation);
                recText.split('\n').forEach(line => {
                    sections.push(new Paragraph({ text: line, spacing: { after: 100 } }));
                });
            }
        });
    }

    addDocSection('RECOMMENDATIONS', report.sections.recommendations);
    addDocSection('CONCLUSION', report.sections.conclusion);

    // Create document
    const doc = new Document({
        sections: [{
            properties: {},
            children: sections,
        }],
    });

    // Generate and download
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.reportNumber || 'audit_report'}_${new Date().toISOString().split('T')[0]}.docx`;
    link.click();
    window.URL.revokeObjectURL(url);
}
