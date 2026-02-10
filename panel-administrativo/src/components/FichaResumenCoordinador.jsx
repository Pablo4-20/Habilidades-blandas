import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import CustomSelect from './ui/CustomSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    PrinterIcon, FunnelIcon, CalendarDaysIcon, 
    TableCellsIcon, ChartBarIcon, DocumentTextIcon
} from '@heroicons/react/24/outline';
import logoIzq from '../assets/facultad.png'; 
import logoDer from '../assets/software.png';

const FichaResumenCoordinador = () => {
    const [reporteData, setReporteData] = useState([]);
    const [reporteInfo, setReporteInfo] = useState(null);
    const [periodos, setPeriodos] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [filtroPeriodo, setFiltroPeriodo] = useState('');

    useEffect(() => {
        const fetchPeriodos = async () => {
            try {
                // Traemos TODOS los periodos para el historial
                const res = await api.get('/periodos'); 
                const lista = Array.isArray(res.data) ? res.data : [];
                
                // Ordenar: Más recientes primero
                lista.sort((a, b) => b.id - a.id);

                setPeriodos(lista);
                
                // Seleccionar activo o el más reciente
                const activo = lista.find(p => p.activo === 1 || p.activo === true);
                if (activo) {
                    setFiltroPeriodo(activo.nombre);
                } else if (lista.length > 0) {
                    setFiltroPeriodo(lista[0].nombre);
                }
            } catch (error) { console.error(error); }
        };
        fetchPeriodos();
    }, []);

    useEffect(() => {
        if (filtroPeriodo) fetchDatos();
    }, [filtroPeriodo]);

    const fetchDatos = async () => {
        setLoading(true);
        try {
            const res = await api.post(`/reportes/pdf-data-general`, {
                periodo: filtroPeriodo,
                es_coordinador: true 
            });
            setReporteData(res.data.filas || []);
            setReporteInfo(res.data.info || {}); 
        } catch (error) {
            console.error("Error cargando ficha:", error);
            setReporteData([]);
        } finally {
            setLoading(false);
        }
    };

    // ===============================================
    // LÓGICA DE CÁLCULOS
    // ===============================================
    const datosProcesados = useMemo(() => {
        if (reporteData.length === 0) return null;

        const porCiclo = reporteData.reduce((acc, item) => {
            const ciclo = item.ciclo || 0;
            if (!acc[ciclo]) acc[ciclo] = [];
            acc[ciclo].push(item);
            return acc;
        }, {});

        const ciclosOrdenados = Object.keys(porCiclo).sort((a, b) => parseInt(a) - parseInt(b));

        const totalesPorCiclo = {};
        ciclosOrdenados.forEach(c => {
            const filas = porCiclo[c];
            let sumaCumplimiento = 0;
            let countValidos = 0;
            filas.forEach(r => {
                const valCump = parseFloat(r.cumplimiento); 
                if (!isNaN(valCump)) {
                    sumaCumplimiento += valCump;
                    countValidos++;
                }
            });
            const promedioCumplimiento = countValidos > 0 ? (sumaCumplimiento / countValidos).toFixed(2) : "0.00";
            totalesPorCiclo[c] = { cumplimiento: promedioCumplimiento + '%' };
        });

        // Resumen Carrera
        const totalCiclos = ciclosOrdenados.length;
        const totalAsignaturas = reporteData.length;
        
        let sumaTotalCumplimiento = 0;
        let countTotalValidos = 0;
        reporteData.forEach(r => {
            const val = parseFloat(r.cumplimiento); 
            if (!isNaN(val)) {
                sumaTotalCumplimiento += val;
                countTotalValidos++;
            }
        });

        const promedioGeneral = countTotalValidos > 0 
            ? (sumaTotalCumplimiento / countTotalValidos).toFixed(2) + '%'
            : "0.00%";

        return { porCiclo, ciclosOrdenados, totalesPorCiclo, totalCiclos, totalAsignaturas, promedioGeneral };
    }, [reporteData]);

    // ===============================================
    // GENERAR PDF (MODIFICADO: Sin cumplimiento)
    // ===============================================
    const generarFichaPDF = () => {
        if (!datosProcesados) return;
        const { porCiclo, ciclosOrdenados, totalesPorCiclo, totalCiclos, totalAsignaturas, promedioGeneral } = datosProcesados;

        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight(); 
        const nombreCarrera = reporteInfo?.carrera || 'Carrera Desconocida';

        const dibujarEncabezado = () => {
            try { doc.addImage(logoIzq, 'PNG', 15, 5, 20, 20); } catch (e) {}
            try { doc.addImage(logoDer, 'PNG', pageWidth - 35, 5, 20, 20); } catch (e) {}
            doc.setFontSize(14); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text("UNIVERSIDAD ESTATAL DE BOLIVAR", pageWidth / 2, 12, { align: "center" });
            doc.setFontSize(11); doc.setFont("helvetica", "normal");
            doc.text("REPORTE CONSOLIDADO POR CICLOS - HABILIDADES BLANDAS", pageWidth / 2, 18, { align: "center" });
            doc.setFontSize(10); doc.setTextColor(80);
            doc.text(`Periodo: ${filtroPeriodo} | Carrera: ${nombreCarrera}`, pageWidth / 2, 24, { align: "center" });
            return 32;
        };

        let finalY = dibujarEncabezado();

        ciclosOrdenados.forEach((cicloKey, index) => {
            const filasCiclo = porCiclo[cicloKey];
            if (index > 0) finalY += 12;
            if (finalY > 170) { doc.addPage(); finalY = dibujarEncabezado(); }

            doc.setFillColor(30, 58, 138); 
            doc.rect(14, finalY, pageWidth - 28, 7, 'F');
            doc.setFontSize(10); doc.setTextColor(255); doc.setFont("helvetica", "bold");
            doc.text(`CICLO: ${cicloKey}`, 16, finalY + 5);
            finalY += 7;

            // --- CAMBIO 1: Eliminamos 'cumplimiento' de la fila ---
            const bodyTable = filasCiclo.map(r => [
                r.asignatura, 
                r.habilidad, 
                r.n1, r.n2, r.n3, r.n4, r.n5, 
                r.conclusion || 'Sin observación'
                // r.cumplimiento <--- ELIMINADO PARA EL PDF
            ]);
            
            // --- CAMBIO 2: Eliminamos la fila de Promedio Cumplimiento Ciclo ---
            /* BLOQUE COMENTADO/ELIMINADO:
            bodyTable.push([
                { content: 'PROMEDIO CUMPLIMIENTO CICLO:', colSpan: 8, styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } },
                { content: totalesPorCiclo[cicloKey].cumplimiento, styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 230, 230], textColor: [0, 100, 0] } }
            ]); 
            */

            autoTable(doc, {
                startY: finalY,
                // --- CAMBIO 3: Eliminamos el encabezado 'Cumpl.' ---
                head: [['Asignatura', 'Habilidad', 'N1', 'N2', 'N3', 'N4', 'N5', 'Observaciones Docente']],
                body: bodyTable,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
                headStyles: { fillColor: [245, 245, 245], textColor: 0, fontStyle: 'bold', halign: 'center' },
                // --- CAMBIO 4: Ajustamos columnas (la columna de obs ahora es la última, índice 7) ---
                columnStyles: { 
                    0: { cellWidth: 50 }, 
                    1: { cellWidth: 50 }, 
                    7: { cellWidth: 'auto' } 
                },
                margin: { left: 14, right: 14 },
                didDrawPage: (data) => { if (data.pageNumber > 1 && data.cursor.y === data.settings.startY) dibujarEncabezado(); }
            });
            finalY = doc.lastAutoTable.finalY;
        });

        // --- PÁGINA FINAL DE RESUMEN (OPCIONAL: Si también quieres quitarlo de aquí, avísame) ---
        // Se mantiene el resumen general de carrera según lo solicitado (solo pediste quitar el de ciclo)
        doc.addPage();
        dibujarEncabezado();
        doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold");
        doc.text("RESUMEN DE CARRERA", 14, 45);

        autoTable(doc, {
            startY: 50,
            head: [['Total Ciclos', 'Total Asignaturas', 'Cumplimiento General']],
            body: [[totalCiclos, totalAsignaturas, promedioGeneral]],
            theme: 'grid',
            headStyles: { fillColor: [30, 58, 138], textColor: 255, halign: 'center', fontSize: 12, fontStyle: 'bold' },
            bodyStyles: { halign: 'center', fontSize: 14, cellPadding: 6 },
            columnStyles: { 2: { fontStyle: 'bold', textColor: [30, 58, 138] } },
            margin: { left: 14, right: 14 }
        });

        // ===============================================
        // SECCIÓN DE FIRMA Y FECHA
        // ===============================================
        const fechaActual = new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        
        const yFooter = pageHeight - 30;

        if (doc.lastAutoTable.finalY > yFooter - 20) {
            doc.addPage();
            dibujarEncabezado();
        }

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(15, yFooter, 85, yFooter); 
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        doc.text("Firma Coordinador(a)", 50, yFooter + 5, { align: 'center' });

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Generado el: ${fechaActual}`, pageWidth - 15, yFooter + 5, { align: 'right' });

        doc.save(`Resumen_Carrera_${filtroPeriodo}.pdf`);
    };

    return (
        <div className="space-y-6 p-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-200 pb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <DocumentTextIcon className="h-7 w-7 text-blue-700"/>
                        Ficha Resumen del Coordinador
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Vista consolidada de los reportes y observaciones de los docentes.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={generarFichaPDF} disabled={reporteData.length === 0 || loading} className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2 rounded-lg shadow flex items-center gap-2 text-sm font-semibold transition-all disabled:opacity-50">
                        <PrinterIcon className="h-5 w-5"/> Descargar PDF
                    </button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                
                {/* Visualizador de Carrera */}
                <div className="w-full md:w-1/2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Carrera</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FunnelIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <input
                            type="text"
                            disabled
                            value={reporteInfo?.carrera || "Cargando carrera..."}
                            className="block w-full pl-10 pr-3 py-2 text-base border-gray-300 focus:outline-none sm:text-sm rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed border font-medium shadow-sm"
                        />
                    </div>
                </div>

                {/* Selector de Periodo */}
                <div className="w-full md:w-1/2">
                    <CustomSelect 
                        label="Periodo" 
                        icon={CalendarDaysIcon} 
                        options={periodos.map(p => ({value: p.nombre, label: p.nombre}))} 
                        value={filtroPeriodo} 
                        onChange={setFiltroPeriodo} 
                    />
                </div>
            </div>

            {/* Tablas Visuales */}
            {loading ? (
                <div className="text-center py-10 bg-blue-50 rounded text-blue-600">Cargando datos...</div>
            ) : datosProcesados ? (
                <div className="space-y-8">
                    {/* Tablas por Ciclo */}
                    {datosProcesados.ciclosOrdenados.map((ciclo) => (
                        <div key={ciclo} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                            <div className="bg-blue-900 text-white px-4 py-2 font-bold flex items-center gap-2">
                                <TableCellsIcon className="h-5 w-5"/> CICLO: {ciclo}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 w-1/4">Asignatura</th>
                                            <th className="px-4 py-3 w-1/4">Habilidad</th>
                                            <th className="px-1 py-3 text-center">N1</th>
                                            <th className="px-1 py-3 text-center">N2</th>
                                            <th className="px-1 py-3 text-center">N3</th>
                                            <th className="px-1 py-3 text-center">N4</th>
                                            <th className="px-1 py-3 text-center">N5</th>
                                            <th className="px-4 py-3 w-1/3">Observaciones Docente</th>
                                            <th className="px-4 py-3 text-center">Cumpl.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {datosProcesados.porCiclo[ciclo].map((fila, idx) => (
                                            <tr key={idx} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-2 font-medium">{fila.asignatura}</td>
                                                <td className="px-4 py-2 text-gray-600">{fila.habilidad}</td>
                                                <td className="px-1 text-center">{fila.n1}</td>
                                                <td className="px-1 text-center">{fila.n2}</td>
                                                <td className="px-1 text-center">{fila.n3}</td>
                                                <td className="px-1 text-center">{fila.n4}</td>
                                                <td className="px-1 text-center">{fila.n5}</td>
                                                <td className="px-4 py-2">
                                                    <div className="text-gray-700 italic text-xs whitespace-pre-line min-w-[150px]">
                                                        {fila.conclusion && fila.conclusion !== 'Sin observaciones' 
                                                            ? fila.conclusion 
                                                            : <span className="text-gray-400">Sin observación registrada</span>
                                                        }
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-center font-bold text-blue-700">{fila.cumplimiento}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                            <td colSpan="8" className="px-4 py-2 text-right text-gray-700">PROMEDIO CUMPLIMIENTO CICLO:</td>
                                            <td className="px-4 py-2 text-center text-green-800 text-base border-l border-gray-300">
                                                {datosProcesados.totalesPorCiclo[ciclo].cumplimiento}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* --- TABLA RESUMEN DE CARRERA (CORREGIDA RESPONSIVA) --- */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gray-800 text-white px-6 py-3 font-bold text-lg flex items-center gap-2">
                            <ChartBarIcon className="h-6 w-6"/> RESUMEN DE CARRERA
                        </div>
                        <div className="p-6">
                            {/* Grid Responsivo (1 col en móvil, 3 en PC) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                                <div className="p-4 text-center">
                                    <p className="text-gray-500 uppercase text-xs font-bold mb-1">Total Ciclos</p>
                                    <p className="text-3xl font-bold text-gray-800">{datosProcesados.totalCiclos}</p>
                                </div>
                                <div className="p-4 text-center">
                                    <p className="text-gray-500 uppercase text-xs font-bold mb-1">Total Asignaturas</p>
                                    <p className="text-3xl font-bold text-gray-800">{datosProcesados.totalAsignaturas}</p>
                                </div>
                                <div className="p-4 text-center">
                                    <p className="text-blue-800 uppercase text-xs font-bold mb-1">Cumplimiento General</p>
                                    <p className="text-4xl font-bold text-blue-700">{datosProcesados.promedioGeneral}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 bg-white border border-dashed rounded">
                    <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-2"/>
                    <p className="text-gray-500">Seleccione un periodo para ver el reporte.</p>
                </div>
            )}
        </div>
    );
};

export default FichaResumenCoordinador;