import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import CustomSelect from './ui/CustomSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    PrinterIcon, FunnelIcon, CalendarDaysIcon, 
    DocumentTextIcon, TableCellsIcon, CheckCircleIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import logoIzq from '../assets/facultad.png'; 
import logoDer from '../assets/software.png';

const FichaResumenCoordinador = () => {
    const [reporteData, setReporteData] = useState([]);
    const [reporteInfo, setReporteInfo] = useState(null); // Para guardar info de carrera del backend
    const [periodos, setPeriodos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    
    // Solo manejamos filtro de periodo, carrera es automática
    const [filtroPeriodo, setFiltroPeriodo] = useState('');

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
    }, [filtroPeriodo]);

    const fetchDatos = async () => {
        setLoading(true);
        try {
            const res = await api.post(`/reportes/pdf-data-general`, {
                periodo: filtroPeriodo
            });
            setReporteData(res.data.filas || []);
            setReporteInfo(res.data.info || {}); // Capturamos nombre de carrera
        } catch (error) {
            console.error("Error cargando ficha:", error);
            setReporteData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleObservacionChange = (index, nuevoValor) => {
        const nuevosDatos = [...reporteData];
        nuevosDatos[index].observacion = nuevoValor;
        setReporteData(nuevosDatos);
    };

    const guardarCambios = async () => {
        setGuardando(true);
        try {
            const conclusiones = reporteData.map(r => ({
                id: r.id_planificacion,
                habilidad_id: r.id_habilidad,
                texto: r.observacion
            }));
            await api.post('/reportes/guardar-todo', { conclusiones });
            alert("Observaciones guardadas correctamente.");
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Error al guardar cambios.");
        } finally {
            setGuardando(false);
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
            filas.forEach(r => {
                const valCump = parseFloat(r.cumplimiento); 
                sumaCumplimiento += isNaN(valCump) ? 0 : valCump;
            });
            const promedioCumplimiento = filas.length > 0 ? (sumaCumplimiento / filas.length).toFixed(2) : "0.00";
            totalesPorCiclo[c] = { cumplimiento: promedioCumplimiento + '%' };
        });

        // Resumen Carrera
        const totalCiclos = ciclosOrdenados.length;
        const totalAsignaturas = reporteData.length;
        
        let sumaTotalCumplimiento = 0;
        reporteData.forEach(r => {
            const val = parseFloat(r.cumplimiento); 
            sumaTotalCumplimiento += isNaN(val) ? 0 : val;
        });

        const promedioGeneral = totalAsignaturas > 0 
            ? (sumaTotalCumplimiento / totalAsignaturas).toFixed(2) + '%'
            : "0.00%";

        return { porCiclo, ciclosOrdenados, totalesPorCiclo, totalCiclos, totalAsignaturas, promedioGeneral };
    }, [reporteData]);

    // ===============================================
    // GENERAR PDF
    // ===============================================
    const generarFichaPDF = () => {
        if (!datosProcesados) return;
        const { porCiclo, ciclosOrdenados, totalesPorCiclo, totalCiclos, totalAsignaturas, promedioGeneral } = datosProcesados;

        guardarCambios();

        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
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

            const bodyTable = filasCiclo.map(r => [
                r.asignatura, r.habilidad, r.n1, r.n2, r.n3, r.n4, r.n5, 
                r.observacion, r.cumplimiento
            ]);
            
            bodyTable.push([
                { content: 'PROMEDIO CUMPLIMIENTO CICLO:', colSpan: 8, styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } },
                { content: totalesPorCiclo[cicloKey].cumplimiento, styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 230, 230], textColor: [0, 100, 0] } }
            ]);

            autoTable(doc, {
                startY: finalY,
                head: [['Asignatura', 'Habilidad', 'N1', 'N2', 'N3', 'N4', 'N5', 'Observaciones', 'Cumpl.']],
                body: bodyTable,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
                headStyles: { fillColor: [245, 245, 245], textColor: 0, fontStyle: 'bold', halign: 'center' },
                columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 50 }, 7: { cellWidth: 'auto' }, 8: { cellWidth: 20, halign: 'center' } },
                margin: { left: 14, right: 14 },
                didDrawPage: (data) => { if (data.pageNumber > 1 && data.cursor.y === data.settings.startY) dibujarEncabezado(); }
            });
            finalY = doc.lastAutoTable.finalY;
        });

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
                    <p className="text-sm text-gray-500 mt-1">Edite las observaciones y genere el reporte oficial.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={guardarCambios} disabled={loading || reporteData.length === 0} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg shadow flex items-center gap-2 text-sm font-semibold transition-all">
                        <CheckCircleIcon className="h-5 w-5"/> {guardando ? 'Guardando...' : 'Guardar Observaciones'}
                    </button>
                    <button onClick={generarFichaPDF} disabled={reporteData.length === 0 || loading} className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2 rounded-lg shadow flex items-center gap-2 text-sm font-semibold transition-all disabled:opacity-50">
                        <PrinterIcon className="h-5 w-5"/> Descargar PDF
                    </button>
                </div>
            </div>

            {/* FILTROS (CARRERA DESHABILITADA + PERIODO) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                
                {/* Visualizador de Carrera (Falso Input Deshabilitado) */}
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

                {/* Selector de Periodo (Activo) */}
                <div className="w-full md:w-1/2">
                    <CustomSelect label="Periodo" icon={CalendarDaysIcon} options={periodos.map(p => ({value: p.nombre, label: p.nombre}))} value={filtroPeriodo} onChange={setFiltroPeriodo} />
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
                                            <th className="px-4 py-3 w-1/3">Observaciones (Coordinador)</th>
                                            <th className="px-4 py-3 text-center">Cumpl.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {datosProcesados.porCiclo[ciclo].map((fila, idx) => {
                                            const realIndex = reporteData.indexOf(fila);
                                            return (
                                                <tr key={idx} className="border-b hover:bg-gray-50">
                                                    <td className="px-4 py-2 font-medium">{fila.asignatura}</td>
                                                    <td className="px-4 py-2 text-gray-600">{fila.habilidad}</td>
                                                    <td className="px-1 text-center">{fila.n1}</td>
                                                    <td className="px-1 text-center">{fila.n2}</td>
                                                    <td className="px-1 text-center">{fila.n3}</td>
                                                    <td className="px-1 text-center">{fila.n4}</td>
                                                    <td className="px-1 text-center">{fila.n5}</td>
                                                    <td className="px-2 py-1">
                                                        <textarea 
                                                            className="w-full text-xs border border-gray-300 rounded p-1 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                                                            rows="2"
                                                            placeholder="Observación..."
                                                            value={fila.observacion || ''}
                                                            onChange={(e) => handleObservacionChange(realIndex, e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-center font-bold text-blue-700">{fila.cumplimiento}</td>
                                                </tr>
                                            );
                                        })}
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

                    {/* Tabla Resumen */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gray-800 text-white px-6 py-3 font-bold text-lg flex items-center gap-2">
                            <ChartBarIcon className="h-6 w-6"/> RESUMEN DE CARRERA
                        </div>
                        <div className="p-6">
                            <table className="w-full text-center">
                                <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
                                    <tr>
                                        <th className="px-6 py-4 border-r border-gray-200">Total Ciclos</th>
                                        <th className="px-6 py-4 border-r border-gray-200">Total Asignaturas</th>
                                        <th className="px-6 py-4 text-blue-800">Cumplimiento General Carrera</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-800 text-xl font-bold">
                                    <tr>
                                        <td className="px-6 py-4 border-r border-gray-200">{datosProcesados.totalCiclos}</td>
                                        <td className="px-6 py-4 border-r border-gray-200">{datosProcesados.totalAsignaturas}</td>
                                        <td className="px-6 py-4 text-3xl text-blue-700">{datosProcesados.promedioGeneral}</td>
                                    </tr>
                                </tbody>
                            </table>
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