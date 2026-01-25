import { useState, useEffect } from 'react';
import api from '../services/api';
import CustomSelect from './ui/CustomSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    PresentationChartLineIcon, PrinterIcon, FunnelIcon,
    CheckCircleIcon, ClockIcon, CalendarDaysIcon, ExclamationCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import logoIzq from '../assets/facultad.png'; 
import logoDer from '../assets/software.png';

const ReportesCoordinador = () => {
    // --- ESTADOS ---
    const [reporteData, setReporteData] = useState([]);
    const [periodos, setPeriodos] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // --- FILTROS ---
    const [filtroCarrera, setFiltroCarrera] = useState('Todas');
    const [filtroPeriodo, setFiltroPeriodo] = useState('');

    const opcionesCarrera = [
        { value: 'Todas', label: 'Todas las Carreras' },
        { value: 'Software', label: 'Software' },
        { value: 'TI', label: 'Tecnologías de la Información' }
    ];

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
    }, [filtroCarrera, filtroPeriodo]);

    const cargarReporte = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/reportes/general-coordinador`, {
                params: {
                    carrera: filtroCarrera,
                    periodo: filtroPeriodo
                }
            });
            
            const datos = res.data.filas || [];
            setReporteData(datos); 

        } catch (error) {
            console.error("Error cargando reporte:", error);
            setReporteData([]);
        } finally {
            setLoading(false);
        }
    };

    // --- PDF ---
    const descargarPDF = () => {
        const doc = new jsPDF('l'); 
        const pageWidth = doc.internal.pageSize.getWidth();

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
            doc.text(`Periodo: ${filtroPeriodo} | Carrera: ${filtroCarrera}`, pageWidth / 2, 32, { align: "center" });
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
                r.docente || 'Sin Asignar', 
                r.habilidad, 
                r.estado, 
                (r.progreso !== undefined ? r.progreso : 0) + '%'
            ]);

            autoTable(doc, {
                startY: 48,
                head: [['Asignatura', 'Docente', 'Habilidad', 'Estado', 'Avance']],
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], halign: 'center' },
                styles: { fontSize: 9, halign: 'center', valign: 'middle' },
                columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' } }
            });
        });
        
        doc.save(`Reporte_Habilidades_${filtroPeriodo}.pdf`);
    };

    // --- HELPERS VISUALES ---
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

    // --- CÁLCULOS ESTADÍSTICOS ---
    const total = reporteData.length;
    const completados = reporteData.filter(r => r.estado === 'Completado').length;
    const enProceso = reporteData.filter(r => r.estado === 'En Proceso' || r.estado === 'Planificado').length;
    const pendientes = reporteData.filter(r => r.estado === 'Sin Planificar' || r.estado === 'Sin Estudiantes' || r.estado === 'Pendiente').length;

    return (
        <div className="space-y-6 animate-fade-in">
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
                        <CustomSelect label="Carrera" icon={FunnelIcon} options={opcionesCarrera} value={filtroCarrera} onChange={setFiltroCarrera} />
                    </div>
                    <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                        <CustomSelect label="Periodo" icon={CalendarDaysIcon} options={opcionesPeriodos} value={filtroPeriodo} onChange={setFiltroPeriodo} placeholder="Cargando..." />
                    </div>
                </div>

                {/* 3 TARJETAS DE RESUMEN */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
                    
                    {/* Completados */}
                    <div className="bg-white p-5 rounded-2xl border-l-4 border-green-500 shadow-sm flex flex-col justify-center">
                        <div className="flex justify-between items-start">
                            <div><p className="text-xs font-bold text-gray-400 uppercase">Completados</p><p className="text-3xl font-bold text-green-600 mt-1">{completados}</p></div>
                            <div className="p-2 bg-green-50 rounded-lg text-green-600"><CheckCircleIcon className="h-6 w-6"/></div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4"><div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${total > 0 ? (completados/total)*100 : 0}%` }}></div></div>
                    </div>

                    {/* En Proceso */}
                    <div className="bg-white p-5 rounded-2xl border-l-4 border-blue-500 shadow-sm flex flex-col justify-center">
                        <div className="flex justify-between items-start">
                            <div><p className="text-xs font-bold text-gray-400 uppercase">En Proceso</p><p className="text-3xl font-bold text-blue-600 mt-1">{enProceso}</p></div>
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><ClockIcon className="h-6 w-6"/></div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${total > 0 ? (enProceso/total)*100 : 0}%` }}></div></div>
                    </div>

                    {/* Pendientes */}
                    <div className="bg-white p-5 rounded-2xl border-l-4 border-red-500 shadow-sm flex flex-col justify-center">
                        <div className="flex justify-between items-start">
                            <div><p className="text-xs font-bold text-gray-400 uppercase">Sin Planificar</p><p className="text-3xl font-bold text-red-600 mt-1">{pendientes}</p></div>
                            <div className="p-2 bg-red-50 rounded-lg text-red-600"><ExclamationCircleIcon className="h-6 w-6"/></div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4"><div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${total > 0 ? (pendientes/total)*100 : 0}%` }}></div></div>
                    </div>

                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2"><PresentationChartLineIcon className="h-5 w-5 text-blue-600"/> Detalle de Cumplimiento</h3>
                    {filtroPeriodo && <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">{filtroPeriodo}</span>}
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Asignatura</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Docente</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Habilidad</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Estado</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Avance</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {loading ? <tr><td colSpan="5" className="text-center py-12 text-gray-400">Cargando...</td></tr> : 
                             reporteData.length === 0 ? <tr><td colSpan="5" className="text-center py-12 text-gray-400 italic">No se encontraron datos.</td></tr> :
                             reporteData.map((r, i) => (
                                <tr key={`${r.id}-${i}`} className="hover:bg-blue-50/30 transition">
                                    <td className="px-6 py-4 align-top">
                                        <div className="font-bold text-gray-800 text-sm">{r.asignatura}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded">{r.carrera}</span>
                                            <span className="bg-gray-100 px-2 py-0.5 rounded">{r.ciclo}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top text-sm text-gray-700 font-medium">
                                        {r.docente || <span className="text-gray-400 italic">Sin asignar</span>}
                                    </td>
                                    
                                    {/* COLUMNA HABILIDAD: Muestra "Sin Planificar" explícitamente */}
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

                                    {/* COLUMNA AVANCE: Barra vacía y 0% */}
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex items-center gap-3">
                                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                {/* Si no tiene habilidad, el ancho es 0 */}
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
            </div>
        </div>
    );
};

export default ReportesCoordinador;