import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import CustomSelect from './ui/CustomSelect'; 
import { 
    DocumentTextIcon, BookOpenIcon, CalendarDaysIcon,
    ChartBarIcon, ArrowRightIcon, ArrowLeftIcon, ArrowDownTrayIcon, LockClosedIcon,
    SparklesIcon, CheckCircleIcon, ExclamationTriangleIcon
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
    const [autoGuardado, setAutoGuardado] = useState(false); // Indicador visual
    
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
            setConclusiones({});
        }
    }, [selectedMateriaId, selectedPeriodo]);

    // 3. AGRUPAR POR HABILIDAD
    const reportesAgrupados = useMemo(() => {
        if (!dataCompleta || !dataCompleta.reportes) return [];

        const grupos = {};
        
        dataCompleta.reportes.forEach(r => {
            const nombreHab = r.habilidad;
            
            if (!grupos[nombreHab]) {
                grupos[nombreHab] = {
                    habilidad: nombreHab,
                    habilidad_id: r.habilidad_id,
                    p1: null,
                    p2: null,
                    uniqueKeyP1: null,
                    uniqueKeyP2: null
                };
            }
            
            const key = `${r.planificacion_id}_${r.habilidad_id}`;

            if (r.parcial_asignado === '1') {
                grupos[nombreHab].p1 = r;
                grupos[nombreHab].uniqueKeyP1 = key;
            } else {
                grupos[nombreHab].p2 = r;
                grupos[nombreHab].uniqueKeyP2 = key;
            }
        });

        return Object.values(grupos);
    }, [dataCompleta]);

    // 4. CARGA DE DATOS + POBLAR CONCLUSIONES
    const cargarDatosReporte = async () => {
        setLoading(true);
        try {
            const res = await api.post('/reportes/pdf-data', { 
                asignatura_id: selectedMateriaId, 
                periodo: selectedPeriodo   
            });
            setDataCompleta(res.data);
            
            // Cargar conclusiones existentes en el estado
            const initialConclusiones = {};
            const rawReportes = res.data.reportes || [];
            rawReportes.forEach(r => {
                const key = `${r.planificacion_id}_${r.habilidad_id}`;
                if (r.conclusion) initialConclusiones[key] = r.conclusion;
            });
            setConclusiones(initialConclusiones);

        } catch (error) {
            console.error(error);
            setDataCompleta(null);
        } finally {
            setLoading(false);
        }
    };

    // 5. NAVEGACIÓN
    const handleSiguiente = () => {
        // Forzamos guardado antes de cambiar
        handleAutoSave(); 
        if (pasoActual < reportesAgrupados.length - 1) setPasoActual(prev => prev + 1);
    };

    const handleAnterior = () => {
        handleAutoSave();
        if (pasoActual > 0) setPasoActual(prev => prev - 1);
    };

    // 6. AUTO GUARDADO INDIVIDUAL
    const handleAutoSave = async () => {
        if (!itemActual) return;
        
        // --- VALIDACIÓN EXTRA ---
        const totalP1 = calcularTotalEvaluados(itemActual.p1?.estadisticas);
        const totalP2 = calcularTotalEvaluados(itemActual.p2?.estadisticas);
        if ((totalP1 + totalP2) === 0) return; // No guardar si no hay datos
        // -----------------------

        const planID = itemActual.p2?.planificacion_id || itemActual.p1?.planificacion_id;
        const habID = itemActual.habilidad_id;
        const texto = conclusiones[keyTextAreaActual];

        if (planID && habID && texto !== undefined) {
            setAutoGuardado(true);
            try {
                await api.post('/reportes/guardar-todo', { 
                    conclusiones: [{ id: planID, habilidad_id: habID, texto: texto }] 
                });
                
                if (itemActual.p1 && itemActual.p2) {
                     await api.post('/reportes/guardar-todo', { 
                        conclusiones: [{ id: itemActual.p1.planificacion_id, habilidad_id: habID, texto: texto }] 
                    });
                }
            } catch (e) {
                console.error("Error autoguardado", e);
            } finally {
                setTimeout(() => setAutoGuardado(false), 1000);
            }
        }
    };

    // 7. GUARDAR TODO (Botón Final)
    const guardarTodo = async () => {
        setGuardando(true);
        try {
            const listaParaEnviar = [];
            
            reportesAgrupados.forEach(grupo => {
                const planP1 = grupo.p1?.planificacion_id;
                const keyP1 = grupo.uniqueKeyP1;
                const planP2 = grupo.p2?.planificacion_id;
                const keyP2 = grupo.uniqueKeyP2;
                const habId = grupo.habilidad_id; 

                const texto = conclusiones[keyP2] || conclusiones[keyP1];

                // Validación: Solo enviar si hay texto y si realmente hubo evaluaciones para ese grupo
                const tP1 = calcularTotalEvaluados(grupo.p1?.estadisticas);
                const tP2 = calcularTotalEvaluados(grupo.p2?.estadisticas);
                
                if (texto && (tP1 + tP2 > 0)) {
                    if (planP2) listaParaEnviar.push({ id: planP2, habilidad_id: habId, texto });
                    if (planP1) listaParaEnviar.push({ id: planP1, habilidad_id: habId, texto });
                }
            });

            if (listaParaEnviar.length === 0) {
                Swal.fire('Info', 'No hay datos válidos para guardar.', 'info');
                setGuardando(false);
                return;
            }

            await api.post('/reportes/guardar-todo', { conclusiones: listaParaEnviar });
            Swal.fire({ title: '¡Guardado!', text: 'Reporte actualizado.', icon: 'success', timer: 1500, showConfirmButton: false });
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar.', 'error');
        } finally {
            setGuardando(false);
        }
    };

    // --- HELPER PARA CALCULAR TOTAL ---
    const calcularTotalEvaluados = (stats) => {
        if (!stats) return 0;
        return Object.values(stats).reduce((acc, curr) => acc + Number(curr), 0);
    };

    // --- COMPONENTE GRAFICO CON BORDES CIRCULARES ---
    const MiniGrafico = ({ stats, titulo }) => {
        if (!stats) return <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400 text-xs">{titulo}: Pendiente</div>;
        const totalEvaluados = calcularTotalEvaluados(stats);
        const maxVal = Math.max(...Object.values(stats)) || 1; 

        return (
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{titulo}</h5>
                    <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-blue-100">Total: {totalEvaluados}</span>
                </div>
                <div className="flex items-end justify-between h-32 gap-2 px-2"> 
                    {[1, 2, 3, 4, 5].map(nivel => {
                        const cantidad = stats[nivel] || 0;
                        const altura = (cantidad / (maxVal || 1)) * 100;
                        let colorClass = "";
                        if (nivel === 1) colorClass = "bg-red-600"; else if (nivel === 2) colorClass = "bg-orange-500"; else if (nivel === 3) colorClass = "bg-yellow-500"; else if (nivel === 4) colorClass = "bg-lime-500"; else colorClass = "bg-green-700";

                        return (
                            <div key={nivel} className="flex flex-col items-center justify-end h-full w-full group relative"> 
                                <div className={`text-[10px] font-bold mb-0.5 transition-all ${cantidad > 0 ? 'text-gray-600' : 'text-transparent'}`}>{cantidad}</div>
                                <div className="w-full bg-gray-100 rounded-t-2xl h-full relative overflow-hidden flex items-end">
                                    {/* CAMBIO: rounded-t-2xl para bordes circulares */}
                                    <div className={`w-full rounded-t-2xl transition-all duration-1000 ease-out ${colorClass} hover:opacity-90`} style={{ height: `${altura}%`, minHeight: cantidad > 0 ? '4px' : '0' }}></div>
                                </div>
                                <div className="mt-1 text-[9px] font-bold text-gray-400">N{nivel}</div>
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

    // Variables de renderizado
    const itemActual = reportesAgrupados[pasoActual];
    const keyTextAreaActual = itemActual ? (itemActual.uniqueKeyP2 || itemActual.uniqueKeyP1) : null;
    
    // --- LÓGICA DE BLOQUEO ---
    const totalP1 = itemActual ? calcularTotalEvaluados(itemActual.p1?.estadisticas) : 0;
    const totalP2 = itemActual ? calcularTotalEvaluados(itemActual.p2?.estadisticas) : 0;
    const hayCalificaciones = (totalP1 + totalP2) > 0;

    return (
        <div className="space-y-4 animate-fade-in pb-12 p-4 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><DocumentTextIcon className="h-6 w-6 text-blue-600"/> Reportes de Evolución</h2>
                </div>
            </div>

            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 border border-blue-100 rounded-lg p-2 bg-blue-50 text-blue-800 text-sm font-bold">
                    <CalendarDaysIcon className="h-5 w-5"/><span>{selectedPeriodo || 'Cargando...'}</span><LockClosedIcon className="h-4 w-4 ml-auto text-blue-400 opacity-50"/>
                </div>
                <div className={!selectedPeriodo ? 'opacity-50' : ''}>
                    <CustomSelect label="" placeholder={opcionesMaterias.length > 0 ? "Seleccionar Asignatura..." : "Sin materias"} options={opcionesMaterias} value={selectedMateriaId} onChange={setSelectedMateriaId} icon={BookOpenIcon} />
                </div>
            </div>

            {!loading && itemActual && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col transition-all duration-300 h-[calc(100vh-200px)]">
                    
                    {/* --- HEADER COMPACTO --- */}
                    <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Habilidad {pasoActual + 1} / {reportesAgrupados.length}</span>
                            <div className="flex gap-1">{reportesAgrupados.map((_, idx) => (<div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === pasoActual ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-300'}`}></div>))}</div>
                        </div>
                    </div>

                    {/* --- CONTENIDO CON SCROLL SI ES NECESARIO --- */}
                    <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                        
                        {/* Título más pequeño y compacto */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-blue-200 shadow-md text-white">
                                <SparklesIcon className="h-5 w-5"/>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 leading-tight">{itemActual.habilidad}</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <MiniGrafico stats={itemActual.p1?.estadisticas} titulo="Resultados P1" />
                            <MiniGrafico stats={itemActual.p2?.estadisticas} titulo="Resultados P2" />
                        </div>

                        <div className={`p-4 rounded-xl border transition-colors relative ${hayCalificaciones ? 'bg-blue-50/50 border-blue-100 focus-within:bg-blue-50 focus-within:border-blue-300' : 'bg-gray-100 border-gray-200 opacity-80 cursor-not-allowed'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <label className={`block text-xs font-bold flex items-center gap-2 ${hayCalificaciones ? 'text-gray-700' : 'text-gray-400'}`}>
                                    <ChartBarIcon className="h-4 w-4"/> Análisis y Conclusiones
                                </label>
                                
                                {hayCalificaciones ? (
                                    autoGuardado && <span className="text-[10px] text-green-600 font-bold flex items-center gap-1 animate-pulse"><CheckCircleIcon className="h-3 w-3"/> Guardando...</span>
                                ) : (
                                    <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-red-200 shadow-sm"><ExclamationTriangleIcon className="h-3 w-3"/> Califique primero</span>
                                )}
                            </div>
                            
                            <textarea 
                                rows="3"
                                disabled={!hayCalificaciones}
                                className={`w-full px-3 py-2 border rounded-lg outline-none text-xs resize-none transition-all ${hayCalificaciones ? 'border-blue-200 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300' : 'border-gray-300 bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                                placeholder={hayCalificaciones ? `Conclusiones sobre "${itemActual.habilidad}"...` : "Debe calificar a los estudiantes primero."}
                                value={conclusiones[keyTextAreaActual] || ''}
                                onChange={(e) => {
                                    if (keyTextAreaActual && hayCalificaciones) {
                                        setConclusiones(prev => ({ ...prev, [keyTextAreaActual]: e.target.value }));
                                    }
                                }}
                                onBlur={handleAutoSave}
                            />
                        </div>
                    </div>

                    {/* --- FOOTER DE NAVEGACIÓN --- */}
                    <div className="bg-white px-5 py-3 border-t border-gray-100 flex justify-between items-center z-10">
                        <button 
                            onClick={handleAnterior} 
                            disabled={pasoActual === 0} 
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-xs transition ${pasoActual === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-200'}`}
                        >
                            <ArrowLeftIcon className="h-3 w-3"/> Anterior
                        </button>

                        {pasoActual < reportesAgrupados.length - 1 ? (
                            <button 
                                onClick={handleSiguiente} 
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold text-xs shadow-md shadow-blue-200/50 flex items-center gap-2 transform active:scale-95 transition"
                            >
                                Siguiente <ArrowRightIcon className="h-3 w-3"/>
                            </button>
                        ) : (
                            <button 
                                onClick={guardarTodo} 
                                disabled={guardando} 
                                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-bold text-xs shadow-md shadow-green-200/50 flex items-center gap-2 transform active:scale-95 transition"
                            >
                                {guardando ? 'Guardando...' : <><ArrowDownTrayIcon className="h-3 w-3"/> Finalizar</>}
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            {!loading && !dataCompleta && selectedMateriaId && (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 text-gray-400">
                    <DocumentTextIcon className="h-10 w-10 mb-2 opacity-30"/>
                    <p className="font-medium text-sm">No se encontraron evaluaciones.</p>
                </div>
            )}
        </div>
    );
};

export default ReportesDocente;