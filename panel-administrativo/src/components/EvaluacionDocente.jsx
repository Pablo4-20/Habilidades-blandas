import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { RUBRICAS } from '../data/rubricas'; 
import CustomSelect from './ui/CustomSelect';
import { 
    UserGroupIcon, 
    ArrowPathIcon, InformationCircleIcon,
    ClockIcon, ListBulletIcon, StarIcon, CalendarDaysIcon, LockClosedIcon, CheckCircleIcon,
    ChevronLeftIcon, ChevronRightIcon, BookOpenIcon 
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const EvaluacionDocente = () => {
    // --- ESTADOS ---
    const [asignaturas, setAsignaturas] = useState([]);
    const [habilidadesPlanificadas, setHabilidadesPlanificadas] = useState([]);
    const [progresoHabilidades, setProgresoHabilidades] = useState({}); 
    const [actividadesContexto, setActividadesContexto] = useState({}); 
    const [estudiantes, setEstudiantes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [mostrarRubrica, setMostrarRubrica] = useState(true); 
    
    // Filtros seleccionados
    const [selectedPeriodo, setSelectedPeriodo] = useState(''); 
    const [selectedAsignatura, setSelectedAsignatura] = useState('');
    const [selectedParalelo, setSelectedParalelo] = useState(''); // [NUEVO] Estado para el paralelo
    const [selectedParcial, setSelectedParcial] = useState('1');
    
    const [habilidadActiva, setHabilidadActiva] = useState(null); 
    const [p2Habilitado, setP2Habilitado] = useState(false);
    const [permisoCalificar, setPermisoCalificar] = useState(false);
    
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 7; 

    // --- CARGAS INICIALES ---
    useEffect(() => {
        const fetchInicial = async () => {
            try {
                const [resAsig, resPer] = await Promise.all([
                    api.get('/docente/asignaturas'),
                    api.get('/periodos/activos')
                ]);
                setAsignaturas(Array.isArray(resAsig.data) ? resAsig.data : []);
                
                const periodosActivos = Array.isArray(resPer.data) ? resPer.data : [];
                const activo = periodosActivos.find(p => p.activo === 1 || p.activo === true);
                if (activo) setSelectedPeriodo(activo.nombre);
            } catch (error) { console.error(error); }
        };
        fetchInicial();
    }, []);

    // --- VERIFICAR ESTADO DEL PARCIAL 1 ---
    const verificarEstadoP1 = async () => {
        if (!selectedAsignatura || !selectedPeriodo || !selectedParalelo) return;
        try {
            const [resPlan, resProg] = await Promise.all([
                api.get(`/planificaciones/verificar/${selectedAsignatura}`, { 
                    params: { parcial: '1', periodo: selectedPeriodo, paralelo: selectedParalelo } 
                }),
                api.get('/docente/progreso', {
                    params: { asignatura_id: selectedAsignatura, periodo: selectedPeriodo, parcial: '1', paralelo: selectedParalelo }
                })
            ]);

            const idsPlanificados = (resPlan.data.habilidades_seleccionadas || []).map(id => Number(id));
            const progresoMap = {};
            resProg.data.forEach(p => progresoMap[Number(p.habilidad_id)] = (p.completado === 1 || p.completado === true));
            const todoCompleto = idsPlanificados.length > 0 && idsPlanificados.every(id => progresoMap[id] === true);
            setP2Habilitado(todoCompleto);
        } catch (e) {
            console.error("Error verificando P1", e);
            setP2Habilitado(false);
        }
    };

    // --- EL CANDADO INTELIGENTE ---
    const verificarRequisitosPrevios = async () => {
        if (!selectedAsignatura || !selectedPeriodo || !selectedParalelo) return;
        
        setPermisoCalificar(false);
        setLoading(true);

        try {
            const res = await api.get(`/planificaciones/verificar/${selectedAsignatura}`, {
                params: { periodo: selectedPeriodo, paralelo: selectedParalelo } 
            });

            const data = res.data;
            
            // Si el servidor dice que TODO está bien
            if (data.planificacion_completa === true) {
                setPermisoCalificar(true);
                verificarEstadoP1();
            } else {
                // Diagnóstico preciso del problema
                let titulo = 'Acceso Denegado';
                let mensaje = 'La planificación está incompleta.';

                if (data.debug_sincronizados === false) {
                    titulo = 'Planificación Desactualizada';
                    mensaje = 'Ha modificado las habilidades en un parcial pero no en el otro. El 1er y 2do Parcial deben tener EXACTAMENTE las mismas habilidades seleccionadas.';
                } else if (!data.debug_p1_completo) {
                    mensaje = 'La planificación del Primer Parcial tiene habilidades sin actividades o resultados de aprendizaje.';
                } else if (!data.debug_p2_completo) {
                    mensaje = 'La planificación del Segundo Parcial tiene habilidades sin actividades o resultados de aprendizaje.';
                }

                Swal.fire({
                    icon: 'warning',
                    title: titulo,
                    text: mensaje,
                    footer: 'Por favor ve al módulo de Planificación y corrige las inconsistencias.',
                    confirmButtonText: 'Entendido',
                    allowOutsideClick: false
                }).then(() => {
                    // Resetear selección
                    setSelectedAsignatura('');
                    setSelectedParalelo('');
                    setHabilidadesPlanificadas([]);
                    setEstudiantes([]);
                    setHabilidadActiva(null);
                });
            }

        } catch (error) {
            console.error("Error verificando requisitos", error);
            Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- EFECTO AL SELECCIONAR MATERIA ---
    useEffect(() => {
        setEstudiantes([]);
        setHabilidadesPlanificadas([]);
        setHabilidadActiva(null);
        setProgresoHabilidades({});
        setActividadesContexto({});
        setPermisoCalificar(false);
        setP2Habilitado(false);

        if(selectedAsignatura && selectedPeriodo && selectedParalelo) {
            verificarRequisitosPrevios(); 
            setSelectedParcial('1');
        }
    }, [selectedAsignatura, selectedPeriodo, selectedParalelo]);

    // --- CARGAR DATOS DE LA VISTA ---
    useEffect(() => {
        if (selectedAsignatura && selectedParalelo && selectedParcial && selectedPeriodo && permisoCalificar) {
            cargarPlanificacionYProgreso(false);
        }
    }, [selectedAsignatura, selectedParalelo, selectedParcial, selectedPeriodo, permisoCalificar]);

    useEffect(() => {
        if (selectedAsignatura && selectedParalelo && habilidadActiva && selectedParcial && permisoCalificar) {
            cargarEstudiantesYNotas();
        }
    }, [habilidadActiva, selectedParcial]);

    const cargarPlanificacionYProgreso = async (forzarAvance = false, idRecienCompletado = null) => {
        setLoading(true);
        try {
            const resPlan = await api.get(`/planificaciones/verificar/${selectedAsignatura}`, {
                params: { 
                    parcial: selectedParcial, 
                    periodo: selectedPeriodo, 
                    paralelo: selectedParalelo 
                }
            });
            
            if (resPlan.data.tiene_asignacion && resPlan.data.es_edicion) {
                const guardadas = resPlan.data.actividades_guardadas || {};
                const catalogo = resPlan.data.habilidades || [];
                
                const idsSeleccionados = (resPlan.data.habilidades_seleccionadas || []).map(id => Number(id));
                let habilidadesListas = catalogo.filter(h => idsSeleccionados.includes(Number(h.id)));
                
                habilidadesListas.sort((a, b) => {
                    return idsSeleccionados.indexOf(Number(a.id)) - idsSeleccionados.indexOf(Number(b.id));
                });
                
                setHabilidadesPlanificadas(habilidadesListas);
                setActividadesContexto(guardadas);

                const resProgreso = await api.get('/docente/progreso', {
                    params: { 
                        asignatura_id: selectedAsignatura, 
                        periodo: selectedPeriodo, 
                        parcial: selectedParcial,
                        paralelo: selectedParalelo
                    }
                });
                
                const mapaProgreso = {};
                resProgreso.data.forEach(p => { 
                    mapaProgreso[Number(p.habilidad_id)] = (p.completado === 1 || p.completado === true || p.completado === '1'); 
                });

                if (idRecienCompletado) {
                    mapaProgreso[Number(idRecienCompletado)] = true;
                }

                setProgresoHabilidades(prev => ({
                    ...prev,
                    ...mapaProgreso
                }));

                if (habilidadesListas.length > 0) {
                    const activaEsValida = habilidadesListas.some(h => Number(h.id) === Number(habilidadActiva));
                    if (!habilidadActiva || !activaEsValida) {
                         const primeraPendiente = habilidadesListas.find(h => !mapaProgreso[Number(h.id)]);
                         const siguienteId = primeraPendiente ? Number(primeraPendiente.id) : Number(habilidadesListas[0].id);
                         setHabilidadActiva(siguienteId);
                    }
                }
            } else {
                setHabilidadesPlanificadas([]);
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const cargarEstudiantesYNotas = async () => {
        setLoading(true);
        try {
            const res = await api.post('/docente/rubrica', {
                asignatura_id: selectedAsignatura,
                habilidad_blanda_id: habilidadActiva,
                parcial: selectedParcial,
                periodo: selectedPeriodo,
                paralelo: selectedParalelo // Enviar paralelo
            });
            
            if (res.data && res.data.estudiantes) {
                setEstudiantes(res.data.estudiantes);
                setCurrentPage(1); 
                setMostrarRubrica(true);
            } else {
                setEstudiantes([]);
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const handleNotaChange = (studentId, nuevoNivel) => {
        setEstudiantes(prev => prev.map(est => 
            est.estudiante_id === studentId ? { ...est, nivel: parseInt(nuevoNivel) } : est
        ));
    };

    const handleGuardar = async () => {
        try {
            const notas = estudiantes.filter(e => e.nivel).map(e => ({ estudiante_id: e.estudiante_id, nivel: e.nivel }));
            if(notas.length === 0) return Swal.fire('Aviso', 'No has calificado a nadie.', 'warning');

            await api.post('/docente/guardar-notas', {
                asignatura_id: selectedAsignatura,
                habilidad_blanda_id: habilidadActiva,
                parcial: selectedParcial,
                periodo: selectedPeriodo,
                paralelo: selectedParalelo, // Guardar con paralelo
                notas
            });

            const pendientesLocal = estudiantes.filter(e => !e.nivel).length;
            const habilidadCompletada = (pendientesLocal === 0);

            const todasCompletadas = habilidadesPlanificadas.every(h => {
                const idH = Number(h.id);
                if (idH === Number(habilidadActiva)) return habilidadCompletada;
                return progresoHabilidades[idH];
            });

            if (habilidadCompletada) {
                setProgresoHabilidades(prev => ({ ...prev, [Number(habilidadActiva)]: true }));

                if (todasCompletadas) {
                    if (selectedParcial === '1') {
                        setP2Habilitado(true); 
                        Swal.fire({
                            title: '¡Primer Parcial Completado! 🎉',
                            text: 'Has finalizado todas las habilidades. ¿Deseas pasar al Segundo Parcial ahora mismo?',
                            icon: 'success',
                            showCancelButton: true,
                            confirmButtonColor: '#3085d6',
                            cancelButtonColor: '#64748b',
                            confirmButtonText: 'Sí, ir al 2do Parcial',
                            cancelButtonText: 'Quedarme aquí',
                        }).then((result) => {
                            if (result.isConfirmed) {
                                setSelectedParcial('2');
                                setHabilidadActiva(null); 
                            }
                        });
                    } else {
                        Swal.fire({
                            title: '¡Excelente Trabajo! 🎓',
                            text: 'Has completado la evaluación de esta asignatura exitosamente.',
                            icon: 'success',
                            confirmButtonColor: '#10B981'
                        });
                    }
                } else {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Habilidad completada ⭐', showConfirmButton: false, timer: 2000 });
                }
            } else {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Progreso guardado', showConfirmButton: false, timer: 1500 });
            }

            await cargarPlanificacionYProgreso(true, habilidadCompletada ? habilidadActiva : null); 
            
            if (selectedParcial === '1' && todasCompletadas) {
                verificarEstadoP1();
            }

        } catch (error) { Swal.fire('Error', 'No se pudo guardar.', 'error'); }
    };

    // --- MANEJO DE SELECTOR COMPUESTO (Materia + Paralelo) ---
    const handleCambioMateria = (val) => {
        if (!val) {
            setSelectedAsignatura('');
            setSelectedParalelo('');
            return;
        }
        // Separamos el valor compuesto "ID-PARALELO"
        const [id, par] = val.split('-');
        setSelectedAsignatura(id);
        setSelectedParalelo(par);
    };

    const pendientes = estudiantes.filter(e => !e.nivel).length;
    const asignaturasFiltradas = asignaturas.filter(a => a.periodo === selectedPeriodo);
    
    // Crear opciones con clave compuesta para el select
    const opcionesAsignaturas = asignaturasFiltradas.map(a => ({ 
        value: `${a.id}-${a.paralelo}`, // CLAVE ÚNICA COMPUESTA
        label: `${a.nombre} - Paralelo ${a.paralelo}`, 
        subtext: a.carrera, 
        periodo: a.periodo,
        icon: BookOpenIcon
    }));

    // Valor actual del selector
    const valorSelectMateria = (selectedAsignatura && selectedParalelo) 
        ? `${selectedAsignatura}-${selectedParalelo}` 
        : '';

    const opcionesParciales = [
        { value: '1', label: 'Primer Parcial' }, 
        { value: '2', label: p2Habilitado ? 'Segundo Parcial' : '🔒 2do Parcial (Bloqueado)', disabled: !p2Habilitado }
    ];

    const getButtonClass = (est, nivelBoton) => {
        const notaActual = est.nivel ? parseInt(est.nivel) : null;
        const notaP1 = est.nivel_p1 ? parseInt(est.nivel_p1) : null;
        const esNotaActual = notaActual === nivelBoton;
        const esRefP1 = selectedParcial === '2' && notaP1 === nivelBoton && !esNotaActual;

        let baseClass = "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 border relative ";

        if (esNotaActual) {
            if (nivelBoton === 1) return baseClass + "bg-red-600 border-red-700 text-white shadow-lg shadow-red-200 scale-110 z-10";
            if (nivelBoton === 2) return baseClass + "bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-200 scale-110 z-10";
            if (nivelBoton === 3) return baseClass + "bg-yellow-500 border-yellow-600 text-white shadow-lg shadow-yellow-200 scale-110 z-10";
            if (nivelBoton === 4) return baseClass + "bg-lime-500 border-lime-600 text-white shadow-lg shadow-lime-200 scale-110 z-10";
            if (nivelBoton === 5) return baseClass + "bg-green-700 border-green-800 text-white shadow-lg shadow-green-200 scale-110 z-10";
        }

        if (esRefP1) {
            if (nivelBoton === 1) return baseClass + "bg-white text-red-500 border-red-300 border-2 border-dashed opacity-80";
            if (nivelBoton === 2) return baseClass + "bg-white text-orange-500 border-orange-300 border-2 border-dashed opacity-80";
            if (nivelBoton === 3) return baseClass + "bg-white text-yellow-500 border-yellow-300 border-2 border-dashed opacity-80";
            if (nivelBoton === 4) return baseClass + "bg-white text-lime-600 border-lime-300 border-2 border-dashed opacity-80";
            if (nivelBoton === 5) return baseClass + "bg-white text-green-600 border-green-300 border-2 border-dashed opacity-80";
        }

        return baseClass + "bg-white text-gray-300 border-gray-100 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50";
    };

    const getNombreHabilidadActiva = () => {
        const hab = habilidadesPlanificadas.find(h => Number(h.id) === Number(habilidadActiva));
        return hab ? hab.nombre : '';
    };
    
    // Función para ignorar tildes y mayúsculas
    const normalizeText = (text) => {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    const nombreHabilidad = getNombreHabilidadActiva();
    const keyRubrica = Object.keys(RUBRICAS).find(k => normalizeText(k) === normalizeText(nombreHabilidad)) || nombreHabilidad;
    const rubricaActual = RUBRICAS[keyRubrica] || {};

    const handleCambioParcial = (val) => {
        if (val === '2' && !p2Habilitado) {
            Swal.fire({
                icon: 'warning',
                title: 'Parcial Bloqueado',
                text: 'Debe completar el 100% de las habilidades del Primer Parcial para desbloquear el Segundo Parcial.'
            });
            return;
        }
        setSelectedParcial(val);
    };

    const totalPages = Math.ceil(estudiantes.length / ITEMS_PER_PAGE);
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = estudiantes.slice(indexOfFirstItem, indexOfLastItem);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Evaluación Docente</h2>
                    <p className="text-gray-500 text-sm mt-1">Califica el desempeño en base a las actividades planificadas.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* PANEL IZQUIERDO */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Periodo Académico</label>
                            <div className="flex items-center gap-3 w-full border border-blue-200 rounded-xl p-3 bg-blue-50 text-blue-800 font-medium">
                                <CalendarDaysIcon className="h-5 w-5"/>
                                <span>{selectedPeriodo || 'Cargando...'}</span>
                                <LockClosedIcon className="h-4 w-4 ml-auto text-blue-400"/>
                            </div>
                        </div>
                        <div className={!selectedPeriodo ? 'opacity-50 pointer-events-none' : ''}>
                            {/* SELECTOR ACTUALIZADO QUE MANEJA PARALELO */}
                            <CustomSelect 
                                label="Materia y Paralelo" 
                                options={opcionesAsignaturas} 
                                value={valorSelectMateria} 
                                onChange={handleCambioMateria} 
                                placeholder={asignaturasFiltradas.length > 0 ? "-- Seleccionar Materia --" : "Sin materias en este periodo"} 
                            />
                        </div>
                        <div className={!selectedAsignatura ? 'opacity-50 pointer-events-none' : ''}>
                            <CustomSelect label="Parcial" icon={ClockIcon} options={opcionesParciales} value={selectedParcial} onChange={handleCambioParcial} />
                        </div>
                    </div>

                    {habilidadesPlanificadas.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-gray-400 uppercase px-1">Progreso de Habilidades ({selectedParcial === '1' ? '1er P.' : '2do P.'})</h3>
                            {habilidadesPlanificadas.map((hab) => {
                                const idHab = Number(hab.id);
                                const completado = progresoHabilidades[idHab] === true; 
                                const activo = Number(habilidadActiva) === idHab;
                                
                                return (
                                    <button
                                        key={hab.id}
                                        onClick={() => setHabilidadActiva(idHab)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between group 
                                            ${activo ? 'bg-blue-600 text-white shadow-md shadow-blue-200 ring-2 ring-white ring-offset-2 ring-offset-blue-100' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-blue-300' }`}
                                    >
                                        <div className="flex items-center gap-2">{hab.nombre}</div>
                                        {completado ? (
                                            <StarIconSolid className={`h-5 w-5 drop-shadow-sm transition-colors duration-300 ${activo ? 'text-yellow-300' : 'text-yellow-500'}`} title="¡Completado!" />
                                        ) : (
                                            activo ? <StarIcon className="h-4 w-4 text-white"/> : <StarIcon className="h-4 w-4 text-gray-300"/>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {habilidadActiva && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-fade-in">
                            <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2"><ListBulletIcon className="h-5 w-5"/> Actividades Planificadas:</h4>
                            <ul className="list-disc list-inside text-xs text-amber-900/80 space-y-1 ml-1 font-medium">
                                {(actividadesContexto[habilidadActiva] || []).length > 0 ? (
                                    (actividadesContexto[habilidadActiva] || []).map((act, idx) => <li key={idx}>{act}</li>)
                                ) : (
                                    <li className="italic text-amber-700/50">Sin actividades registradas.</li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>

                {/* PANEL DERECHO */}
                <div className="lg:col-span-8 space-y-6">
                    {habilidadActiva ? (
                        <>
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm animate-fade-in">
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => setMostrarRubrica(!mostrarRubrica)}>
                                    <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2"><InformationCircleIcon className="h-5 w-5"/> Guía de Rúbrica - {getNombreHabilidadActiva()}</h4>
                                    <span className="text-blue-500 text-xs font-semibold bg-white px-2 py-1 rounded border border-blue-200">{mostrarRubrica ? 'Ocultar ▲' : 'Ver Detalles ▼'}</span>
                                </div>
                                {mostrarRubrica && (
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2 text-[11px] text-blue-900">
                                            {[1, 2, 3, 4, 5].map(nivel => (
                                                <div key={nivel} className="flex flex-col gap-1 p-2 bg-white rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition">
                                                    <div className="flex items-center gap-1.5 border-b border-blue-50 pb-1 mb-1">
                                                        <span className={`font-bold w-5 h-5 flex items-center justify-center rounded-full text-white text-xs ${nivel === 1 ? 'bg-red-600' : nivel === 2 ? 'bg-orange-500' : nivel === 3 ? 'bg-yellow-500' : nivel === 4 ? 'bg-lime-500' : 'bg-green-700'}`}>{nivel}</span>
                                                        <span className="font-bold text-blue-700">Nivel {nivel}</span>
                                                    </div>
                                                    <p className="leading-tight opacity-90 text-gray-600">{rubricaActual[nivel] || "Criterio estándar."}</p>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col animate-fade-in">
                                <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase items-center sticky top-0 z-10 shadow-sm">
                                    <div className="col-span-1 text-center">#</div> 
                                    <div className="col-span-3 pl-2">Estudiante</div>
                                    <div className="col-span-8 grid grid-cols-5 text-center">
                                        {[1, 2, 3, 4, 5].map(n => <div key={n}>Nivel {n}</div>)}
                                    </div>
                                </div>

                                <div className="flex-1 bg-white">
                                    {loading ? <div className="p-12 text-center text-gray-400 flex flex-col items-center"><ArrowPathIcon className="h-8 w-8 animate-spin mb-2"/>Cargando nómina...</div> 
                                    : estudiantes.length === 0 ? <div className="p-12 text-center text-gray-400">No hay estudiantes cargados.</div> 
                                    : currentItems.map((est, index) => (
                                        <div key={est.estudiante_id} className={`grid grid-cols-12 gap-4 p-3 border-b border-gray-50 items-center transition ${est.nivel ? 'bg-blue-50/10' : 'hover:bg-gray-50'}`}>
                                            <div className="col-span-1 text-center font-bold text-gray-400 text-xs">{indexOfFirstItem + index + 1}</div>
                                            <div className="col-span-3 font-medium text-sm text-gray-800 truncate pl-2 flex flex-col">
                                                <span title={est.nombres}>{est.nombres}</span>
                                                {est.nivel && <span className="text-[10px] text-green-600 font-bold">Calificado (Nivel {est.nivel})</span>}
                                            </div>
                                            <div className="col-span-8 grid grid-cols-5 items-center">
                                                {[1, 2, 3, 4, 5].map((nivel) => {
                                                    const notaP1 = est.nivel_p1 ? parseInt(est.nivel_p1) : null;
                                                    const notaActual = est.nivel ? parseInt(est.nivel) : null;
                                                    const esRefP1 = selectedParcial === '2' && notaP1 === nivel && notaActual !== nivel;
                                                    return (
                                                        <div key={nivel} className="flex justify-center relative">
                                                            <button onClick={() => handleNotaChange(est.estudiante_id, nivel)} className={getButtonClass(est, nivel)} title={esRefP1 ? "Nota del Parcial 1" : `Asignar Nivel ${nivel}`}>{nivel}</button>
                                                            {esRefP1 && <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-[9px] bg-gray-500 text-white px-1.5 py-0.5 rounded-full shadow-sm opacity-90 font-bold z-20 pointer-events-none">P1</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center sticky bottom-0 z-20">
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"><ChevronLeftIcon className="h-4 w-4"/></button>
                                        <span className="font-medium">Página {currentPage} de {totalPages || 1}</span>
                                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"><ChevronRightIcon className="h-4 w-4"/></button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${pendientes > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{pendientes > 0 ? `Faltan ${pendientes}` : '¡Todos calificados!'}</span>
                                        <button onClick={handleGuardar} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95 text-sm"><CheckCircleIcon className="h-5 w-5"/> Guardar Notas</button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                            <UserGroupIcon className="h-16 w-16 mb-4 opacity-20"/>
                            <p className="text-lg font-medium">Selecciona una Habilidad</p>
                            <p className="text-sm">Completa las habilidades para desbloquear el siguiente parcial.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EvaluacionDocente;