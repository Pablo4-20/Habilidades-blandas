import { useState, useEffect } from 'react';
import api from '../services/api';
import CustomSelect from './ui/CustomSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    PrinterIcon, FunnelIcon, CalendarDaysIcon, 
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import logoIzq from '../assets/facultad.png'; 
import logoDer from '../assets/software.png';

const FichaResumenCoordinador = () => {
    const [reporteData, setReporteData] = useState([]);
    const [periodos, setPeriodos] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [filtroCarrera, setFiltroCarrera] = useState('Todas');
    const [filtroPeriodo, setFiltroPeriodo] = useState('');

    const opcionesCarrera = [
        { value: 'Todas', label: 'Todas las Carreras' },
        { value: 'Software', label: 'Software' },
        { value: 'TI', label: 'Tecnologías de la Información' }
    ];

    useEffect(() => {
        const fetchPeriodos = async () => {
            try {
                const res = await api.get('/periodos');
                const lista = res.data || [];
                setPeriodos(lista);
                const activo = lista.find(p => p.activo);
                if (activo) setFiltroPeriodo(activo.nombre);
                else if (lista.length > 0) setFiltroPeriodo(lista[0].nombre);
            } catch (error) { console.error(error); }
        };
        fetchPeriodos();
    }, []);

    useEffect(() => {
        if (filtroPeriodo) fetchDatos();
    }, [filtroPeriodo, filtroCarrera]);

    const fetchDatos = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/reportes/general-coordinador`, {
                params: { carrera: filtroCarrera, periodo: filtroPeriodo }
            });
            setReporteData(res.data.filas || []);
        } catch (error) {
            console.error(error);
            setReporteData([]);
        } finally {
            setLoading(false);
        }
    };

    // --- GENERAR PDF DETALLADO (ESTRUCTURA SOLICITADA) ---
    const generarFichaPDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4'); 
        const pageWidth = doc.internal.pageSize.getWidth();
        let finalY = 0; 

        // Función Encabezado
        const dibujarEncabezado = () => {
            try { doc.addImage(logoIzq, 'PNG', 10, 5, 20, 20); } catch (e) {}
            try { doc.addImage(logoDer, 'PNG', pageWidth - 30, 5, 20, 20); } catch (e) {}

            doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text("UNIVERSIDAD ESTATAL DE BOLIVAR", pageWidth / 2, 12, { align: "center" });
            doc.setFontSize(10); doc.setFont("helvetica", "normal");
            doc.text("REPORTE DE CUMPLIMIENTO Y NOTAS - HABILIDADES BLANDAS", pageWidth / 2, 18, { align: "center" });
            doc.setFontSize(9); doc.setTextColor(80);
            doc.text(`Periodo: ${filtroPeriodo} | Carrera: ${filtroCarrera}`, pageWidth / 2, 24, { align: "center" });
            return 35; // Y inicial
        };

        finalY = dibujarEncabezado();

        // 1. RECORRER CADA ASIGNATURA/HABILIDAD
        reporteData.forEach((r, index) => {
            // Verificar salto de página antes de empezar un bloque
            if (finalY > 230) { 
                doc.addPage();
                finalY = dibujarEncabezado();
            } else if (index > 0) {
                finalY += 10; // Espacio entre bloques
            }

            // A. ENCABEZADO DE ASIGNATURA
            doc.setFillColor(240, 240, 240);
            doc.rect(14, finalY, pageWidth - 28, 16, 'F'); // Fondo gris
            
            doc.setFontSize(10); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text(`ASIGNATURA: ${r.asignatura} (${r.ciclo})`, 16, finalY + 6);
            
            doc.setFontSize(9); doc.setFont("helvetica", "normal");
            doc.text(`Docente: ${r.docente}`, 16, finalY + 12);
            doc.text(`Habilidad: ${r.habilidad}`, 110, finalY + 12);

            finalY += 18;

            // B. TABLA DE ESTUDIANTES (SI EXISTEN)
            const estudiantes = r.detalle_estudiantes && r.detalle_estudiantes.length > 0 
                ? r.detalle_estudiantes.map((est, i) => [i + 1, est.nombre, est.nota])
                : [['-', 'Sin estudiantes registrados', '-']];

            autoTable(doc, {
                startY: finalY,
                head: [['#', 'Apellidos y Nombres', 'Nota']],
                body: estudiantes,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 1.5 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
                columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 20, halign: 'center' } },
                margin: { left: 14, right: 14 }
            });

            finalY = doc.lastAutoTable.finalY + 5;

            // C. PIE DE BLOQUE (Observación, Cumplimiento, Promedio)
            // Verificar espacio para el pie
            if (finalY > 260) { doc.addPage(); finalY = dibujarEncabezado(); }

            doc.setFontSize(8); doc.setFont("helvetica", "bold");
            doc.text("Observación / Conclusión:", 14, finalY);
            
            doc.setFont("helvetica", "normal");
            const obsLines = doc.splitTextToSize(r.conclusion || "Sin observaciones.", 110);
            doc.text(obsLines, 14, finalY + 5);

            // Cuadro Resumen del Curso a la derecha
            doc.setDrawColor(200); doc.rect(130, finalY - 4, 65, 18);
            doc.setFont("helvetica", "bold");
            doc.text("Resumen del Curso:", 135, finalY);
            doc.setFont("helvetica", "normal");
            doc.text(`Cumplimiento: ${r.progreso}%`, 135, finalY + 5);
            doc.text(`Promedio Curso: ${r.promedio || 0}`, 135, finalY + 10);

            finalY += (obsLines.length * 4) + 5; 
        });

        // 2. CUADRO RESUMEN FINAL DE CARRERA
        doc.addPage();
        dibujarEncabezado();
        
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
        doc.text("CUADRO DE RESUMEN FINAL DE CARRERA", 14, 40);

        // Calcular promedio de carrera
        let sumaPromedios = 0;
        let countCursos = 0;
        const resumenBody = reporteData.map(r => {
            if (r.promedio > 0) {
                sumaPromedios += parseFloat(r.promedio);
                countCursos++;
            }
            return [r.ciclo, r.asignatura, r.promedio || 0];
        });

        const promedioCarrera = countCursos > 0 ? (sumaPromedios / countCursos).toFixed(2) : "0.00";

        // Fila Final
        resumenBody.push(['', 'PROMEDIO GENERAL DE CARRERA', promedioCarrera]);

        autoTable(doc, {
            startY: 45,
            head: [['Ciclo', 'Asignatura', 'Promedio']],
            body: resumenBody,
            theme: 'grid',
            headStyles: { fillColor: [30, 58, 138], textColor: 255 },
            styles: { fontSize: 9, valign: 'middle' },
            didParseCell: function(data) {
                if (data.row.index === resumenBody.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [220, 220, 220];
                }
            }
        });

        doc.save(`Ficha_Detallada_${filtroPeriodo}.pdf`);
    };

    return (
        <div className="space-y-6 animate-fade-in p-4">
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-200 pb-4 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <DocumentTextIcon className="h-6 w-6 text-blue-700"/>
                        Ficha Resumen Detallada
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Reporte completo con notas de estudiantes y promedios.</p>
                </div>
                <button 
                    onClick={generarFichaPDF}
                    disabled={reporteData.length === 0}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-lg shadow-md flex items-center gap-2 text-sm font-semibold transition-all disabled:opacity-50"
                >
                    <PrinterIcon className="h-5 w-5"/> Descargar PDF Detallado
                </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                    <CustomSelect label="Carrera" icon={FunnelIcon} options={opcionesCarrera} value={filtroCarrera} onChange={setFiltroCarrera} />
                </div>
                <div className="w-full md:w-1/2">
                    <CustomSelect label="Periodo" icon={CalendarDaysIcon} options={periodos.map(p => ({value: p.nombre, label: p.nombre}))} value={filtroPeriodo} onChange={setFiltroPeriodo} />
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4"/>
                <h3 className="text-lg font-medium text-gray-900">Vista Previa no disponible</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                    El reporte contiene un gran volumen de datos detallados (listas de estudiantes). 
                    Por favor, descarga el PDF para visualizar la información completa.
                </p>
                <div className="mt-6 inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    {reporteData.length} Registros listos para exportar
                </div>
            </div>
        </div>
    );
};

export default FichaResumenCoordinador;