// ═══ PDF REPORT GENERATOR ═══
// Renders the ReportCard component into the DOM, captures each page with html2canvas,
// and assembles a multi-page A4 landscape PDF via jsPDF.

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const PW = 1123; // A4 landscape width at 96dpi
const PH = 794;  // A4 landscape height at 96dpi

/**
 * Generate a PDF report card for a player.
 * @param {HTMLElement} containerEl - The DOM element containing the rendered ReportCard pages
 * @param {string} playerName - Player name for the filename
 * @returns {Promise<void>} Downloads the PDF
 */
export async function generateReportPDF(containerEl, playerName = 'Player') {
    if (!containerEl) throw new Error('Report container not found');

    const pages = containerEl.querySelectorAll('[data-page]');
    if (pages.length === 0) throw new Error('No report pages found');

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [PW, PH], hotfixes: ['px_scaling'] });

    for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];

        // Temporarily position the page for capture
        const origStyle = pageEl.style.cssText;
        pageEl.style.position = 'fixed';
        pageEl.style.left = '0';
        pageEl.style.top = '0';
        pageEl.style.zIndex = '-1';

        const canvas = await html2canvas(pageEl, {
            width: PW,
            height: PH,
            scale: 2, // 2x for crisp rendering
            useCORS: true,
            logging: false,
            backgroundColor: '#FFFFFF',
        });

        pageEl.style.cssText = origStyle;

        const imgData = canvas.toDataURL('image/png');

        if (i > 0) pdf.addPage([PW, PH], 'landscape');
        pdf.addImage(imgData, 'PNG', 0, 0, PW, PH, undefined, 'FAST');
    }

    const safeName = (playerName || 'Player').replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().slice(0, 10);
    pdf.save(`DNA_Report_${safeName}_${date}.pdf`);
}
