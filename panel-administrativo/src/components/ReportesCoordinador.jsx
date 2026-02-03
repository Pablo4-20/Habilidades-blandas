import { useState, useEffect } from 'react';
import api from '../services/api';
import CustomSelect from './ui/CustomSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    PresentationChartLineIcon, PrinterIcon, FunnelIcon,
    CheckCircleIcon, ClockIcon, CalendarDaysIcon, ExclamationCircleIcon,
    ExclamationTriangleIcon, ChevronLeftIcon, ChevronRightIcon
} from '@heroicons/react/24/outline';
import logoIzq from '../assets/facultad.png'; 
import logoDer from '../assets/software.png';

const ReportesCoordinador = () => {
    // --- ESTADOS ---
    const [reporteData, setReporteData] = useState([]);
    const [reporteInfo, setReporteInfo] = useState(null); 
    const [periodos, setPeriodos] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // PAGINACIÓN
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6; 

    // --- FILTROS ---
    const [filtroPeriodo, setFiltroPeriodo] = useState('');

    // 1. CARGA INICIAL
    useEffect(() => {
        const fetchInicial = async () => {
            try {
                const res = await api.get('/periodos'); 
                const lista = Array.isArray(res.data) ? res.data : [];
                setPeriodos(lista);

                const activo = lista.find(p => p.activo === 1 || p.activo === true);
                if (activo) {
                    setFiltroPeriodo(activo.nombre);
                } else if (lista.length > 0) {
                    setFiltroPeriodo(lista[0].nombre);
                }
            } catch (error) {
                console.error("Error al cargar periodos:", error);
            }
        };
        fetchInicial();
    }, []);

    // 2. CARGA DEL REPORTE
    useEffect(() => {
        if (filtroPeriodo) {
            cargarReporte();
        }
    }, [filtroPeriodo]);

    const cargarReporte = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/reportes/general-coordinador`, {
                params: { periodo: filtroPeriodo }
            });
            const datos = res.data.filas || [];
            setReporteData(datos); 
            setReporteInfo(res.data.info || {});
            setCurrentPage(1); // Reset al cambiar periodo
        } catch (error) {
            console.error("Error cargando reporte:", error);
            setReporteData([]);
        } finally {
            setLoading(false);
        }
    };

    // --- PROCESAMIENTO Y PAGINACIÓN ---
    const getSortedData = () => {
        const data = [...reporteData];
        // Ordenar por Asignatura (A-Z) y Paralelo
        data.sort((a, b) => {
            if (a.asignatura < b.asignatura) return -1;
            if (a.asignatura > b.asignatura) return 1;
            if (a.paralelo < b.paralelo) return -1;
            if (a.paralelo > b.paralelo) return 1;
            return 0;
        });
        return data;
    };

    const processedData = getSortedData();
    const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = processedData.slice(indexOfFirstItem, indexOfLastItem);

    // --- PDF ---
    const descargarPDF = () => {
        const doc = new jsPDF('l'); 
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight(); 
        const nombreCarrera = reporteInfo?.carrera || 'Carrera Desconocida';

        const gruposPorCiclo = reporteData.reduce((acc, curr) => {
            const ciclo = curr.ciclo || 'Sin Ciclo';
            if (!acc[ciclo]) acc[ciclo] = [];
            acc[ciclo].push(curr);
            return acc;
        }, {});

        const ordenCiclos = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10 };
        const ciclosOrdenados = Object.keys(gruposPorCiclo).sort((a, b) => (ordenCiclos[a] || 99) - (ordenCiclos[b] || 99));

        if (ciclosOrdenados.length === 0) return alert("No hay datos para exportar.");

        const dibujarEncabezado = () => {
            const imgW = 25; const imgH = 25; 
            try { doc.addImage(logoIzq, 'PNG', 15, 5, imgW, imgH); } catch (e) {}
            try { doc.addImage(logoDer, 'PNG', pageWidth - 40, 5, imgW, imgH); } catch (e) {}

            doc.setFontSize(14); doc.setTextColor(40, 53, 147);
            doc.text("UNIVERSIDAD ESTATAL DE BOLIVAR", pageWidth / 2, 15, { align: "center" });
            doc.setFontSize(10); doc.setTextColor(0);
            doc.text("REPORTE DE CUMPLIMIENTO - HABILIDADES BLANDAS", pageWidth / 2, 25, { align: "center" });
            doc.setFontSize(9); doc.setTextColor(100);
            doc.text(`Periodo: ${filtroPeriodo} | Carrera: ${nombreCarrera}`, pageWidth / 2, 32, { align: "center" });
        };

        let primero = true;
        ciclosOrdenados.forEach((ciclo) => {
            if (!primero) doc.addPage();
            primero = false;
            dibujarEncabezado();
            
            doc.setFontSize(12); doc.setTextColor(220, 38, 38);
            doc.text(`CICLO: ${ciclo}`, 15, 45);

            const body = gruposPorCiclo[ciclo].map(r => [
                r.asignatura,
                r.paralelo || '-', // <--- AÑADIDO PARALELO AL PDF
                r.docente || 'Sin Asignar', 
                r.habilidad, 
                r.estado, 
                (r.progreso !== undefined ? r.progreso : 0) + '%'
            ]);

            autoTable(doc, {
                startY: 48,
                margin: { bottom: 40 }, 
                // AÑADIDO ENCABEZADO PARALELO
                head: [['Asignatura', 'Paralelo', 'Docente', 'Habilidad', 'Estado', 'Avance']],
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], halign: 'center' },
                styles: { fontSize: 9, halign: 'center', valign: 'middle' },
                columnStyles: { 0: { halign: 'left' }, 2: { halign: 'left' } } // Ajustar alineación nombre docente
            });
        });

        const totalPagesDoc = doc.internal.getNumberOfPages();
        const fechaActual = new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        for (let i = 1; i <= totalPagesDoc; i++) {
            doc.setPage(i);
            
            // --- FIRMA COORDINADOR (Izquierda) ---
            doc.setDrawColor(0); 
            doc.setLineWidth(0.5);
            doc.line(15, pageHeight - 30, 85, pageHeight - 30); 
            
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text("Firma Coordinador(a)", 50, pageHeight - 23, { align: 'center' });

            // --- FECHA DE GENERACIÓN (Derecha) ---
            doc.setFontSize(9);
            doc.setTextColor(100); 
            doc.text(`Generado el: ${fechaActual}`, pageWidth - 15, pageHeight - 23, { align: 'right' });
        }
        
        doc.save(`Reporte_Habilidades_${filtroPeriodo}.pdf`);
    };

    const getBadgeColor = (estado) => {
        if (estado === 'Completado') return 'bg-green-100 text-green-700 border-green-200';
        if (estado === 'En Proceso' || estado === 'Planificado') return 'bg-blue-100 text-blue-700 border-blue-200';
        if (estado === 'Pendiente') return 'bg-red-100 text-red-700 border-red-200';
        return 'bg-gray-100 text-gray-600 border-gray-200';
    };

    const getIcon = (estado) => {
        if (estado === 'Completado') return <CheckCircleIcon className="h-4 w-4"/>;
        if (estado === 'En Proceso' || estado === 'Planificado') return <ClockIcon className="h-4 w-4"/>;
        if (estado === 'Pendiente') return <ExclamationTriangleIcon className="h-4 w-4"/>;
        return <ExclamationCircleIcon className="h-4 w-4"/>;
    };

    const opcionesPeriodos = periodos.map(p => ({ value: p.nombre, label: p.nombre, subtext: p.activo ? 'Activo' : '' }));

    const total = reporteData.length;
    const completados = reporteData.filter(r => r.estado === 'Completado').length;
    const enProceso = reporteData.filter(r => r.estado === 'En Proceso' || r.estado === 'Planificado').length;
    const pendientes = reporteData.filter(r => r.estado === 'Sin Planificar' || r.estado === 'Sin Estudiantes' || r.estado === 'Pendiente').length;

    return (
        <div className="space-y-6 animate-fade-in flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Reportes Generales</h2>
                    <p className="text-gray-500 text-sm">Monitoreo de cumplimiento por periodo académico.</p>
                </div>
                <button onClick={descargarPDF} disabled={total === 0} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg flex items-center gap-2 transform active:scale-95 disabled:opacity-50">
                    <PrinterIcon className="h-5 w-5"/> Exportar PDF
                </button>
            </div>

            {/* Filtros y Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Filtros */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FunnelIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </div>
                            <input
                                type="text"
                                disabled
                                value={reporteInfo?.carrera || "Cargando carrera..."}
                                className="block w-full pl-10 pr-3 py-2 text-base border-0 focus:ring-0 sm:text-sm bg-gray-100 text-gray-500 cursor-not-allowed font-medium rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                        <CustomSelect label="Periodo" icon={CalendarDaysIcon} options={opcionesPeriodos} value={filtroPeriodo} onChange={setFiltroPeriodo} placeholder="Cargando..." />
                    </div>
                </div>

                {/* Cards de Resumen */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
                    <div className="bg-white p-5 rounded-2xl border-l-4 border-green-500 shadow-sm flex flex-col justify-center">
                        <div className="flex justify-between items-start">
                            <div><p className="text-xs font-bold text-gray-400 uppercase">Completados</p><p className="text-3xl font-bold text-green-600 mt-1">{completados}</p></div>
                            <div className="p-2 bg-green-50 rounded-lg text-green-600"><CheckCircleIcon className="h-6 w-6"/></div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4"><div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${total > 0 ? (completados/total)*100 : 0}%` }}></div></div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border-l-4 border-blue-500 shadow-sm flex flex-col justify-center">
                        <div className="flex justify-between items-start">
                            <div><p className="text-xs font-bold text-gray-400 uppercase">En Proceso</p><p className="text-3xl font-bold text-blue-600 mt-1">{enProceso}</p></div>
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><ClockIcon className="h-6 w-6"/></div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${total > 0 ? (enProceso/total)*100 : 0}%` }}></div></div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border-l-4 border-red-500 shadow-sm flex flex-col justify-center">
                        <div className="flex justify-between items-start">
                            <div><p className="text-xs font-bold text-gray-400 uppercase">Sin Planificar</p><p className="text-3xl font-bold text-red-600 mt-1">{pendientes}</p></div>
                            <div className="p-2 bg-red-50 rounded-lg text-red-600"><ExclamationCircleIcon className="h-6 w-6"/></div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4"><div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${total > 0 ? (pendientes/total)*100 : 0}%` }}></div></div>
                    </div>
                </div>
            </div>

            {/* Tabla con Paginación */}
            <div className="flex flex-col flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2"><PresentationChartLineIcon className="h-5 w-5 text-blue-600"/> Detalle de Cumplimiento</h3>
                    {filtroPeriodo && <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">{filtroPeriodo}</span>}
                </div>
                
                <div className="overflow-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-white sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Asignatura</th>
                                {/* --- COLUMNA NUEVA --- */}
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Paralelo</th>
                                {/* --------------------- */}
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Docente</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Habilidad</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Estado</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Avance</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {loading ? <tr><td colSpan="6" className="text-center py-12 text-gray-400">Cargando...</td></tr> : 
                             currentItems.length === 0 ? <tr><td colSpan="6" className="text-center py-12 text-gray-400 italic">No se encontraron datos.</td></tr> :
                             currentItems.map((r, i) => (
                                <tr key={`${r.id}-${i}`} className="hover:bg-blue-50/30 transition">
                                    <td className="px-6 py-4 align-top">
                                        <div className="font-bold text-gray-800 text-sm">{r.asignatura}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded">{r.carrera}</span>
                                            <span className="bg-gray-100 px-2 py-0.5 rounded">{r.ciclo}</span>
                                        </div>
                                    </td>
                                    {/* --- CELDA NUEVA --- */}
                                    <td className="px-6 py-4 align-top text-center">
                                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                            {r.paralelo || '-'}
                                        </span>
                                    </td>
                                    {/* ------------------- */}
                                    <td className="px-6 py-4 align-top text-sm text-gray-700 font-medium">
                                        {r.docente || <span className="text-gray-400 italic">Sin asignar</span>}
                                    </td>
                                    
                                    <td className="px-6 py-4 align-top text-sm">
                                        {(!r.habilidad || r.habilidad === 'No definida' || r.habilidad === 'Sin Planificar') ? (
                                            <span className="text-red-400 italic font-medium">Sin Planificar</span>
                                        ) : (
                                            <span className="text-blue-600 font-medium">{r.habilidad}</span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 align-top text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getBadgeColor(r.estado)}`}>
                                            {getIcon(r.estado)} {r.estado}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4 align-top">
                                        <div className="flex items-center gap-3">
                                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className={`h-2 rounded-full ${r.progreso >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                                    style={{width: `${(!r.habilidad || r.habilidad === 'Sin Planificar' || r.habilidad === 'No definida') ? 0 : (r.progreso || 0)}%`}}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-bold text-gray-600 w-8 text-right">
                                                {(!r.habilidad || r.habilidad === 'Sin Planificar' || r.habilidad === 'No definida') ? 0 : (r.progreso || 0)}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- CONTROLES PAGINACIÓN --- */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        Mostrando del <span className="font-bold text-gray-800">{currentItems.length > 0 ? indexOfFirstItem + 1 : 0}</span> al <span className="font-bold text-gray-800">{Math.min(indexOfLastItem, processedData.length)}</span> de <span className="font-bold text-gray-800">{processedData.length}</span> registros
                    </span>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-lg border transition ${currentPage === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-white hover:shadow-sm'}`}
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </button>
                        
                        <span className="text-sm font-medium text-gray-600 px-2">
                            Página {currentPage} de {totalPages || 1}
                        </span>

                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className={`p-2 rounded-lg border transition ${currentPage === totalPages || totalPages === 0 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-white hover:shadow-sm'}`}
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportesCoordinador;