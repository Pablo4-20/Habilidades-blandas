import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import CustomSelect from './ui/CustomSelect'; 
import { 
    DocumentTextIcon, BookOpenIcon, CalendarDaysIcon,
    ChartBarIcon, ArrowRightIcon, ArrowLeftIcon, ArrowDownTrayIcon, LockClosedIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

const ReportesDocente = () => {
    // --- ESTADOS ---
    const [asignacionesRaw, setAsignacionesRaw] = useState([]);
    const [selectedMateriaId, setSelectedMateriaId] = useState('');
    const [selectedPeriodo, setSelectedPeriodo] = useState('');
    
    const [dataCompleta, setDataCompleta] = useState(null); 
    const [conclusiones, setConclusiones] = useState({});
    
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    
    // Paginación
    const [pasoActual, setPasoActual] = useState(0);

    // 1. CARGA INICIAL
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [resAsig, resPer] = await Promise.all([
                    api.get('/docente/asignaturas'),
                    api.get('/periodos/activos')
                ]);
                setAsignacionesRaw(Array.isArray(resAsig.data) ? resAsig.data : []);
                const listaPeriodos = Array.isArray(resPer.data) ? resPer.data : [];
                const activo = listaPeriodos.find(p => p.activo === 1 || p.activo === true);
                if (activo) setSelectedPeriodo(activo.nombre);
            } catch (error) { console.error("Error inicial:", error); }
        };
        cargarDatos();
    }, []);

    // 2. CARGAR REPORTE
    useEffect(() => {
        if (selectedMateriaId && selectedPeriodo) {
            cargarDatosReporte();
            setPasoActual(0);
        } else {
            setDataCompleta(null);
        }
    }, [selectedMateriaId, selectedPeriodo]);

    // 3. AGRUPAR POR HABILIDAD (Separar Adaptabilidad de Autocontrol, etc.)
    const reportesAgrupados = useMemo(() => {
        if (!dataCompleta || !dataCompleta.reportes) return [];

        const grupos = {};
        
        dataCompleta.reportes.forEach(r => {
            // Agrupamos por NOMBRE DE HABILIDAD
            const nombreHab = r.habilidad;
            
            if (!grupos[nombreHab]) {
                grupos[nombreHab] = {
                    habilidad: nombreHab,
                    habilidad_id: r.habilidad_id, // Guardamos el ID de la habilidad
                    p1: null,
                    p2: null,
                    // Usamos una clave compuesta para el textarea: PLAN_ID + HABILIDAD_ID
                    uniqueKeyP1: null,
                    uniqueKeyP2: null
                };
            }
            
            // Asignamos al parcial correspondiente
            if (r.parcial_asignado === '1') {
                grupos[nombreHab].p1 = r;
                grupos[nombreHab].uniqueKeyP1 = `${r.planificacion_id}_${r.habilidad_id}`;
            } else {
                grupos[nombreHab].p2 = r;
                grupos[nombreHab].uniqueKeyP2 = `${r.planificacion_id}_${r.habilidad_id}`;
            }
        });

        return Object.values(grupos);
    }, [dataCompleta]);

    // 4. PETICIÓN BACKEND
    const cargarDatosReporte = async () => {
        setLoading(true);
        try {
            const res = await api.post('/reportes/pdf-data', { 
                asignatura_id: selectedMateriaId, 
                periodo: selectedPeriodo   
            });
            setDataCompleta(res.data);
            
            const initialConclusiones = {};
            const rawReportes = res.data.reportes || [];
            rawReportes.forEach(r => {
                // Clave única compuesta para evitar conflictos
                const key = `${r.planificacion_id}_${r.habilidad_id}`;
                if (r.conclusion) initialConclusiones[key] = r.conclusion;
            });
            setConclusiones(initialConclusiones);

        } catch (error) {
            console.error(error);
            setDataCompleta(null);
            if (error.response && error.response.status === 404) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'No hay evaluaciones.', showConfirmButton: false, timer: 3000 });
            }
        } finally {
            setLoading(false);
        }
    };

    // 5. NAVEGACIÓN
    const handleSiguiente = () => {
        if (pasoActual < reportesAgrupados.length - 1) setPasoActual(prev => prev + 1);
    };

    const handleAnterior = () => {
        if (pasoActual > 0) setPasoActual(prev => prev - 1);
    };

    // 6. GUARDAR
    const guardarTodo = async () => {
        setGuardando(true);
        try {
            const listaParaEnviar = [];
            
            reportesAgrupados.forEach(grupo => {
                // Obtenemos IDs y Keys
                const planP1 = grupo.p1?.planificacion_id;
                const keyP1 = grupo.uniqueKeyP1;
                
                const planP2 = grupo.p2?.planificacion_id;
                const keyP2 = grupo.uniqueKeyP2;

                // Buscamos si hay texto escrito. Priorizamos P2 (cierre), si no P1.
                // Nota: Usamos la misma conclusión para ambos parciales de la misma habilidad por ahora
                const texto = conclusiones[keyP2] || conclusiones[keyP1];

                if (texto) {
                    if (planP2) listaParaEnviar.push({ id: planP2, texto });
                    if (planP1) listaParaEnviar.push({ id: planP1, texto });
                }
            });

            await api.post('/reportes/guardar-todo', { conclusiones: listaParaEnviar });
            Swal.fire({ title: '¡Guardado!', text: 'Observaciones registradas.', icon: 'success', timer: 2000, showConfirmButton: false });
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar.', 'error');
        } finally {
            setGuardando(false);
        }
    };

    // --- COMPONENTE GRAFICO ---
    const MiniGrafico = ({ stats, titulo }) => {
        if (!stats) return <div className="h-40 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400 text-sm">{titulo}: Pendiente</div>;

        const totalEvaluados = Object.values(stats).reduce((a, b) => a + b, 0);
        const maxVal = Math.max(...Object.values(stats)) || 1; 

        return (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{titulo}</h5>
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-100">Total: {totalEvaluados}</span>
                </div>
                <div className="flex items-end justify-between h-40 gap-2 px-2"> 
                    {[1, 2, 3, 4, 5].map(nivel => {
                        const cantidad = stats[nivel] || 0;
                        const altura = (cantidad / (maxVal || 1)) * 100;
                        let colorClass = "";
                        if (nivel === 1) colorClass = "bg-red-600"; else if (nivel === 2) colorClass = "bg-orange-500"; else if (nivel === 3) colorClass = "bg-yellow-500"; else if (nivel === 4) colorClass = "bg-lime-500"; else colorClass = "bg-green-700";

                        return (
                            <div key={nivel} className="flex flex-col items-center justify-end h-full w-full group relative"> 
                                <div className={`text-xs font-bold mb-1 transition-all ${cantidad > 0 ? 'text-gray-600' : 'text-transparent'}`}>{cantidad}</div>
                                <div className="w-full bg-gray-100 rounded-t-md h-full relative overflow-hidden flex items-end">
                                    <div className={`w-full rounded-t-md transition-all duration-1000 ease-out ${colorClass} hover:opacity-90`} style={{ height: `${altura}%`, minHeight: cantidad > 0 ? '4px' : '0' }}></div>
                                </div>
                                <div className="mt-2 text-[10px] font-bold text-gray-400">N{nivel}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const opcionesMaterias = useMemo(() => {
        if (!selectedPeriodo) return [];
        const delPeriodo = asignacionesRaw.filter(a => a.periodo === selectedPeriodo);
        const unicas = [];
        const map = new Map();
        for (const item of delPeriodo) {
            if(!map.has(item.id)) { map.set(item.id, true); unicas.push({ value: item.id, label: item.nombre, subtext: `${item.carrera} (${item.paralelo})` }); }
        }
        return unicas;
    }, [asignacionesRaw, selectedPeriodo]);

    const itemActual = reportesAgrupados[pasoActual];
    // Clave para el textarea actual (Preferimos P2, sino P1)
    const keyTextAreaActual = itemActual ? (itemActual.uniqueKeyP2 || itemActual.uniqueKeyP1) : null;

    return (
        <div className="space-y-6 animate-fade-in pb-12 p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><DocumentTextIcon className="h-7 w-7 text-blue-600"/> Reportes de Evolución</h2>
                    <p className="text-gray-500 text-sm">Análisis comparativo de desempeño por habilidad.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 border border-blue-100 rounded-lg p-2 bg-blue-50 text-blue-800 text-sm font-bold">
                    <CalendarDaysIcon className="h-5 w-5"/><span>{selectedPeriodo || 'Cargando...'}</span><LockClosedIcon className="h-4 w-4 ml-auto text-blue-400 opacity-50"/>
                </div>
                <div className={!selectedPeriodo ? 'opacity-50' : ''}>
                    <CustomSelect label="" placeholder={opcionesMaterias.length > 0 ? "Seleccionar Asignatura..." : "Sin materias"} options={opcionesMaterias} value={selectedMateriaId} onChange={setSelectedMateriaId} icon={BookOpenIcon} />
                </div>
            </div>

            {!loading && itemActual && (
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden flex flex-col transition-all duration-300">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Habilidad {pasoActual + 1} / {reportesAgrupados.length}</span>
                        <div className="flex gap-1.5">{reportesAgrupados.map((_, idx) => (<div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === pasoActual ? 'w-8 bg-blue-600' : 'w-2 bg-gray-300'}`}></div>))}</div>
                    </div>

                    <div className="p-6 md:p-8 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-blue-200 shadow-lg text-white"><SparklesIcon className="h-6 w-6"/></div>
                            <h3 className="text-2xl font-bold text-gray-800">{itemActual.habilidad}</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <MiniGrafico stats={itemActual.p1?.estadisticas} titulo="Resultados Parcial 1" />
                            <MiniGrafico stats={itemActual.p2?.estadisticas} titulo="Resultados Parcial 2" />
                        </div>

                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 relative">
                            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><ChartBarIcon className="h-5 w-5 text-blue-600"/> Análisis de Evolución y Conclusiones</label>
                            <textarea 
                                rows="4"
                                className="w-full px-4 py-3 border border-blue-200 rounded-xl bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-300 outline-none text-sm resize-none transition-all"
                                placeholder={`Describa el avance del grupo en la habilidad "${itemActual.habilidad}"...`}
                                value={conclusiones[keyTextAreaActual] || ''}
                                onChange={(e) => {
                                    if (keyTextAreaActual) {
                                        setConclusiones({ ...conclusiones, [keyTextAreaActual]: e.target.value });
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-5 border-t border-gray-100 flex justify-between items-center">
                        <button onClick={handleAnterior} disabled={pasoActual === 0} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition ${pasoActual === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900 border border-transparent hover:border-gray-200'}`}><ArrowLeftIcon className="h-4 w-4"/> Anterior</button>
                        {pasoActual < reportesAgrupados.length - 1 ? (
                            <button onClick={handleSiguiente} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-200/50 flex items-center gap-2 transform active:scale-95 transition">Siguiente Habilidad <ArrowRightIcon className="h-4 w-4"/></button>
                        ) : (
                            <button onClick={guardarTodo} disabled={guardando} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-green-200/50 flex items-center gap-2 transform active:scale-95 transition">{guardando ? 'Guardando...' : <><ArrowDownTrayIcon className="h-5 w-5"/> Finalizar y Guardar Reporte</>}</button>
                        )}
                    </div>
                </div>
            )}
            
            {!loading && !dataCompleta && selectedMateriaId && (
                <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50 text-gray-400">
                    <DocumentTextIcon className="h-12 w-12 mb-3 opacity-30"/>
                    <p className="font-medium">No se encontraron evaluaciones.</p>
                </div>
            )}
        </div>
    );
};

export default ReportesDocente;