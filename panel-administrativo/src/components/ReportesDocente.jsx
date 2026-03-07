import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import CustomSelect from './ui/CustomSelect'; 
import { 
    DocumentTextIcon, BookOpenIcon, CalendarDaysIcon,
    ChartBarIcon, ArrowRightIcon, ArrowLeftIcon, ArrowDownTrayIcon, LockClosedIcon,
    SparklesIcon, CheckCircleIcon, ExclamationTriangleIcon, UserGroupIcon 
} from '@heroicons/react/24/outline';

const ReportesDocente = () => {
    // --- ESTADOS ---
    const [asignacionesRaw, setAsignacionesRaw] = useState([]);
    
    // Filtros
    const [selectedMateriaId, setSelectedMateriaId] = useState('');
    const [selectedParalelo, setSelectedParalelo] = useState('');
    const [selectedPeriodo, setSelectedPeriodo] = useState('');
    
    const [dataCompleta, setDataCompleta] = useState(null); 
    const [conclusiones, setConclusiones] = useState({}); // Solo guardará las notas extras
    
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [autoGuardado, setAutoGuardado] = useState(false);
    
    // Paginación y UI de Tarjetas
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
        if (selectedMateriaId && selectedPeriodo && selectedParalelo) {
            cargarDatosReporte();
            setPasoActual(0);
        } else {
            setDataCompleta(null);
            setConclusiones({});
        }
    }, [selectedMateriaId, selectedPeriodo, selectedParalelo]);

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

    // 4. CARGA DE DATOS + SEPARAR CONCLUSIÓN DE NOTA EXTRA
    const cargarDatosReporte = async () => {
        setLoading(true);
        try {
            const res = await api.post('/reportes/pdf-data', { 
                asignatura_id: selectedMateriaId, 
                periodo: selectedPeriodo,
                paralelo: selectedParalelo 
            });
            setDataCompleta(res.data);
            
            const initialConclusiones = {};
            const rawReportes = res.data.reportes || [];
            
            rawReportes.forEach(r => {
                const key = `${r.planificacion_id}_${r.habilidad_id}`;
                if (r.conclusion) {
                    // Si ya viene con el texto adicional unido, lo separamos para mostrarlo en el textarea
                    const partes = r.conclusion.split('\n\nNota Adicional: ');
                    if (partes.length > 1) {
                        initialConclusiones[key] = partes[1]; // Lo extra
                    } else {
                        // Si no tiene el separador, verificamos si es pura sugerencia o un texto viejo manual
                        if (!r.conclusion.includes('MEJORA:') && !r.conclusion.includes('ALERTA:') && !r.conclusion.includes('ESTABLE:')) {
                            initialConclusiones[key] = r.conclusion; 
                        } else {
                            initialConclusiones[key] = ''; // Era pura sugerencia automática
                        }
                    }
                }
            });
            setConclusiones(initialConclusiones);

        } catch (error) {
            console.error(error);
            setDataCompleta(null);
        } finally {
            setLoading(false);
        }
    };

    // --- FUNCIÓN INDEPENDIENTE PARA CALCULAR LA SUGERENCIA ---
    const calcularSugerenciaExterna = (grupo) => {
        if (!grupo) return '';
        const statsP1 = grupo.p1?.estadisticas;
        const statsP2 = grupo.p2?.estadisticas;
        if (!statsP1 || !statsP2) return '';

        const calcularPromedio = (stats) => {
            let total = 0, count = 0;
            Object.keys(stats).forEach(nivel => {
                total += Number(nivel) * Number(stats[nivel]);
                count += Number(stats[nivel]);
            });
            return count > 0 ? total / count : 0;
        };

        const promP1 = calcularPromedio(statsP1);
        const promP2 = calcularPromedio(statsP2);

        if (promP2 > promP1) {
            return `MEJORA: se evidencia avance del Parcial 1 al Parcial 2 en la habilidad de ${grupo.habilidad}.`;
        } else if (promP2 < promP1) {
            return `ALERTA: se evidencia un descenso del Parcial 1 al Parcial 2; se recomienda refuerzo y práctica guiada.`;
        } else {
            return `ESTABLE: se mantiene un desempeño similar entre Parcial 1 y Parcial 2; continuar con las estrategias aplicadas.`;
        }
    };

    // 5. NAVEGACIÓN
    const handleSiguiente = () => {
        handleAutoSave(); 
        if (pasoActual < reportesAgrupados.length - 1) setPasoActual(prev => prev + 1);
    };

    const handleAnterior = () => {
        handleAutoSave();
        if (pasoActual > 0) setPasoActual(prev => prev - 1);
    };

    // 6. AUTO GUARDADO
    const handleAutoSave = async () => {
        if (!itemActual) return;
        
        const totalP1 = calcularTotalEvaluados(itemActual.p1?.estadisticas);
        const totalP2 = calcularTotalEvaluados(itemActual.p2?.estadisticas);
        
        if ((totalP1 + totalP2) === 0) return; 

        const planID = itemActual.p2?.planificacion_id || itemActual.p1?.planificacion_id;
        const habID = itemActual.habilidad_id;
        
        const sugerencia = calcularSugerenciaExterna(itemActual);
        const notaExtra = conclusiones[keyTextAreaActual] || '';
        
        // Unir Sugerencia Automática con la Nota Adicional (si existe)
        const textoFinal = notaExtra.trim() ? `${sugerencia}\n\nNota Adicional: ${notaExtra.trim()}` : sugerencia;

        if (planID && habID) {
            setAutoGuardado(true);
            try {
                await api.post('/reportes/guardar-todo', { 
                    conclusiones: [{ id: planID, habilidad_id: habID, texto: textoFinal }] 
                });
                
                if (itemActual.p1 && itemActual.p2) {
                     await api.post('/reportes/guardar-todo', { 
                        conclusiones: [{ id: itemActual.p1.planificacion_id, habilidad_id: habID, texto: textoFinal }] 
                    });
                }
            } catch (e) {
                console.error("Error autoguardado", e);
            } finally {
                setTimeout(() => setAutoGuardado(false), 1000);
            }
        }
    };

    // 7. GUARDAR TODO
    const guardarTodo = async () => {
        for (const grupo of reportesAgrupados) {
            const listaEstudiantes = grupo.p1?.detalle_p1 || grupo.p2?.detalle_p2 || [];
            const totalMatriculados = listaEstudiantes.length;

            const evaluadosP1 = calcularTotalEvaluados(grupo.p1?.estadisticas);
            const evaluadosP2 = calcularTotalEvaluados(grupo.p2?.estadisticas);

            if (grupo.p1 && evaluadosP1 < totalMatriculados) {
                return Swal.fire({
                    title: 'Evaluación Incompleta',
                    html: `En la habilidad <b>"${grupo.habilidad}"</b> (Parcial 1):<br/>Ha calificado a <b>${evaluadosP1}</b> de <b>${totalMatriculados}</b> estudiantes.<br/><br/>Debe calificar a todos para finalizar.`,
                    icon: 'warning',
                    confirmButtonText: 'Entendido'
                });
            }

            if (grupo.p2 && evaluadosP2 < totalMatriculados) {
                return Swal.fire({
                    title: 'Evaluación Incompleta',
                    html: `En la habilidad <b>"${grupo.habilidad}"</b> (Parcial 2):<br/>Ha calificado a <b>${evaluadosP2}</b> de <b>${totalMatriculados}</b> estudiantes.<br/><br/>Debe calificar a todos para finalizar.`,
                    icon: 'warning',
                    confirmButtonText: 'Entendido'
                });
            }
        }

        setGuardando(true);
        try {
            const listaParaEnviar = [];
            
            reportesAgrupados.forEach(grupo => {
                const planP1 = grupo.p1?.planificacion_id;
                const keyP1 = grupo.uniqueKeyP1;
                const planP2 = grupo.p2?.planificacion_id;
                const keyP2 = grupo.uniqueKeyP2;
                const habId = grupo.habilidad_id; 

                const sugerencia = calcularSugerenciaExterna(grupo);
                const notaExtra = conclusiones[keyP2] || conclusiones[keyP1] || '';
                
                const textoFinal = notaExtra.trim() ? `${sugerencia}\n\nNota Adicional: ${notaExtra.trim()}` : sugerencia;

                const tP1 = calcularTotalEvaluados(grupo.p1?.estadisticas);
                const tP2 = calcularTotalEvaluados(grupo.p2?.estadisticas);
                
                if (textoFinal && (tP1 + tP2 > 0)) {
                    if (planP2) listaParaEnviar.push({ id: planP2, habilidad_id: habId, texto: textoFinal });
                    if (planP1) listaParaEnviar.push({ id: planP1, habilidad_id: habId, texto: textoFinal });
                }
            });

            if (listaParaEnviar.length === 0) {
                Swal.fire('Info', 'No ha ingresado conclusiones para guardar.', 'info');
                setGuardando(false);
                return;
            }

            await api.post('/reportes/guardar-todo', { conclusiones: listaParaEnviar });
            Swal.fire({ title: '¡Guardado!', text: 'Reporte actualizado correctamente.', icon: 'success', timer: 1500, showConfirmButton: false });
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar.', 'error');
        } finally {
            setGuardando(false);
        }
    };

    const calcularTotalEvaluados = (stats) => {
        if (!stats) return 0;
        return Object.values(stats).reduce((acc, curr) => acc + Number(curr), 0);
    };

    const MiniGrafico = ({ stats, titulo, totalMatriculados }) => {
        if (!stats) return <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400 text-xs">{titulo}: Pendiente</div>;
        
        const totalEvaluados = calcularTotalEvaluados(stats);
        const maxVal = Math.max(...Object.values(stats)) || 1; 
        
        const esCompleto = totalEvaluados >= totalMatriculados;
        const badgeColor = esCompleto ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200';

        return (
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{titulo}</h5>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeColor} flex items-center gap-1`}>
                         <UserGroupIcon className="h-3 w-3" /> {totalEvaluados} / {totalMatriculados}
                    </span>
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

    const handleCambioMateria = (val) => {
        if(!val) {
            setSelectedMateriaId('');
            setSelectedParalelo('');
            return;
        }
        const [id, par] = val.split('-');
        setSelectedMateriaId(id);
        setSelectedParalelo(par);
    };

    const opcionesMaterias = useMemo(() => {
        if (!selectedPeriodo) return [];
        const delPeriodo = asignacionesRaw.filter(a => a.periodo === selectedPeriodo);
        
        return delPeriodo.map(item => ({
            value: `${item.id}-${item.paralelo}`, 
            label: `${item.nombre} - Paralelo ${item.paralelo}`, 
            subtext: item.carrera 
        }));
    }, [asignacionesRaw, selectedPeriodo]);

    const valorSelectMateria = (selectedMateriaId && selectedParalelo) 
        ? `${selectedMateriaId}-${selectedParalelo}` 
        : '';

    const itemActual = reportesAgrupados[pasoActual];
    const keyTextAreaActual = itemActual ? (itemActual.uniqueKeyP2 || itemActual.uniqueKeyP1) : null;
    
    const listaEstudiantes = itemActual ? (itemActual.p1?.detalle_p1 || itemActual.p2?.detalle_p2 || []) : [];
    const totalMatriculados = listaEstudiantes.length;

    const totalP1 = itemActual ? calcularTotalEvaluados(itemActual.p1?.estadisticas) : 0;
    const totalP2 = itemActual ? calcularTotalEvaluados(itemActual.p2?.estadisticas) : 0;
    
    const esCompletoP1 = totalP1 >= totalMatriculados;
    const esCompletoP2 = totalP2 >= totalMatriculados;
    const habilitarEscritura = esCompletoP1 && esCompletoP2 && totalMatriculados > 0;

    const sugerenciaCalculada = useMemo(() => calcularSugerenciaExterna(itemActual), [itemActual]);

    return (
        <div className="space-y-4 animate-fade-in pb-20 p-4 bg-gray-50 min-h-screen">
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
                    <CustomSelect 
                        label="" 
                        placeholder={opcionesMaterias.length > 0 ? "Seleccionar Asignatura..." : "Sin materias"} 
                        options={opcionesMaterias} 
                        value={valorSelectMateria} 
                        onChange={handleCambioMateria} 
                        icon={BookOpenIcon} 
                    />
                </div>
            </div>

            {!loading && itemActual && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col transition-all duration-300">
                    
                    <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Habilidad {pasoActual + 1} / {reportesAgrupados.length}</span>
                            <div className="flex gap-1">{reportesAgrupados.map((_, idx) => (<div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === pasoActual ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-300'}`}></div>))}</div>
                        </div>
                    </div>

                    <div className="p-5 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-blue-200 shadow-md text-white shrink-0">
                                <SparklesIcon className="h-5 w-5"/>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 leading-tight">{itemActual.habilidad}</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <MiniGrafico stats={itemActual.p1?.estadisticas} titulo="Resultados P1" totalMatriculados={totalMatriculados} />
                            <MiniGrafico stats={itemActual.p2?.estadisticas} titulo="Resultados P2" totalMatriculados={totalMatriculados} />
                        </div>

                        {/* SECCIÓN DE ANÁLISIS REDISEÑADA */}
                        <div className={`p-5 rounded-xl border transition-colors relative ${habilitarEscritura ? 'bg-white border-blue-100 shadow-sm' : 'bg-gray-100 border-gray-200'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <label className={`block text-sm font-bold flex items-center gap-2 ${habilitarEscritura ? 'text-gray-800' : 'text-gray-500'}`}>
                                    <ChartBarIcon className="h-5 w-5 text-blue-600"/> Análisis y Conclusiones
                                </label>
                                
                                {habilitarEscritura ? (
                                    autoGuardado && <span className="text-[10px] text-green-600 font-bold flex items-center gap-1 animate-pulse"><CheckCircleIcon className="h-3 w-3"/> Guardando...</span>
                                ) : (
                                    <span className="text-[10px] text-orange-600 font-bold flex items-center gap-1 bg-white px-2 py-1 rounded border border-orange-200 shadow-sm">
                                        <ExclamationTriangleIcon className="h-3 w-3"/> Califique a TODOS ({totalMatriculados}) los estudiantes
                                    </span>
                                )}
                            </div>
                            
                            {habilitarEscritura ? (
                                <div className="space-y-4">
                                    {/* SUGERENCIA AUTOMÁTICA (SIEMPRE VISIBLE, SEPARADA DEL TEXTAREA) */}
                                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 shadow-inner">
                                        <SparklesIcon className="h-6 w-6 text-blue-500 shrink-0 mt-0.5"/>
                                        <div>
                                            <h4 className="text-blue-800 font-bold text-[11px] mb-1 uppercase tracking-wider">Análisis Automático del Sistema</h4>
                                            <p className="text-blue-900 text-sm leading-relaxed font-medium">{sugerenciaCalculada}</p>
                                        </div>
                                    </div>

                                    {/* TEXTAREA EXCLUSIVO PARA COMENTARIOS ADICIONALES */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
                                        <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-2">
                                            <DocumentTextIcon className="h-4 w-4"/> Observaciones Adicionales (Opcional)
                                        </label>
                                        <textarea 
                                            id="textarea-personalizado"
                                            rows="3"
                                            className="w-full p-0 bg-transparent border-none outline-none text-sm resize-none text-gray-700 placeholder-gray-400 focus:ring-0"
                                            placeholder="Escriba aquí si desea agregar un comentario manual aparte de la sugerencia automática..."
                                            value={conclusiones[keyTextAreaActual] || ''}
                                            onChange={(e) => {
                                                if (keyTextAreaActual) {
                                                    setConclusiones(prev => ({ ...prev, [keyTextAreaActual]: e.target.value }));
                                                }
                                            }}
                                            onBlur={handleAutoSave}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-gray-200 rounded-xl text-gray-500 text-sm text-center border border-gray-300 border-dashed">
                                    Debe calificar a TODOS los estudiantes en ambos parciales para habilitar el análisis.
                                </div>
                            )}
                        </div>

                    </div>

                    <div className="bg-white px-5 py-4 border-t border-gray-100 flex justify-between items-center mt-auto">
                        <button 
                            onClick={handleAnterior} 
                            disabled={pasoActual === 0} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition ${pasoActual === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-200'}`}
                        >
                            <ArrowLeftIcon className="h-4 w-4"/> Anterior
                        </button>

                        {pasoActual < reportesAgrupados.length - 1 ? (
                            <button 
                                onClick={handleSiguiente} 
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold text-xs shadow-md shadow-blue-200/50 flex items-center gap-2 transform active:scale-95 transition"
                            >
                                Siguiente <ArrowRightIcon className="h-4 w-4"/>
                            </button>
                        ) : (
                            <button 
                                onClick={guardarTodo} 
                                disabled={guardando} 
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-bold text-xs shadow-md shadow-green-200/50 flex items-center gap-2 transform active:scale-95 transition"
                            >
                                {guardando ? 'Guardando...' : <><ArrowDownTrayIcon className="h-4 w-4"/> Finalizar</>}
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