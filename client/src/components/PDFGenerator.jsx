import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Componente para generar PDF a partir del HTML
const PDFGenerator = () => {
  const generatePDF = async () => {
    // Mostrar mensaje de procesamiento
    alert('Generando PDF, por favor espere...');
    
    try {
      // Obtener el contenido HTML
      const contentElement = document.getElementById('pdf-content');
      if (!contentElement) {
        alert('Error: No se encontró el contenido HTML para convertir a PDF');
        return;
      }
      
      // Configurar opciones de html2canvas
      const canvas = await html2canvas(contentElement, {
        scale: 2, // Mayor calidad
        useCORS: true,
        logging: false,
        letterRendering: true,
      });
      
      // Obtener dimensiones
      const imgWidth = 210; // A4 ancho (mm)
      const pageHeight = 297; // A4 alto (mm)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      // Crear objeto PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      let pageData = canvas.toDataURL('image/jpeg', 1.0);
      
      // Añadir la primera página
      pdf.addImage(pageData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Añadir el resto de páginas si se necesitan
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(pageData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Guardar el PDF
      pdf.save('PsiConnect-Presentacion.pdf');
      
      alert('PDF generado con éxito');
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      alert('Ocurrió un error al generar el PDF. Por favor, inténtelo de nuevo.');
    }
  };

  return (
    <div className="mb-8 flex justify-center">
      <button 
        onClick={generatePDF}
        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
      >
        Descargar presentación en PDF
      </button>
    </div>
  );
};

export default PDFGenerator;