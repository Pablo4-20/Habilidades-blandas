import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { RUBRICAS } from '../data/rubricas'; 
import CustomSelect from './ui/CustomSelect';
import { 
    UserGroupIcon, 
    ArrowPathIcon, InformationCircleIcon,
    ClockIcon, ListBulletIcon, StarIcon, CalendarDaysIcon, LockClosedIcon, CheckCircleIcon
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
    const [actividadesRubrica, setActividadesRubrica] = useState([]); 

    const [selectedPeriodo, setSelectedPeriodo] = useState(''); 
    const [selectedAsignatura, setSelectedAsignatura] = useState('');
    const [selectedParcial, setSelectedParcial] = useState('1');
    const [habilidadActiva, setHabilidadActiva] = useState(null); 

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

    // --- CARGAR PLANIFICACIÓN Y PROGRESO ---
    useEffect(() => {
        if (selectedAsignatura && selectedParcial && selectedPeriodo) {
            cargarPlanificacionYProgreso(false);
        }
    }, [selectedAsignatura, selectedParcial, selectedPeriodo]);

    // --- CARGAR ESTUDIANTES ---
    useEffect(() => {
        if (selectedAsignatura && habilidadActiva && selectedParcial) {
            cargarEstudiantesYNotas();
        }
    }, [habilidadActiva, selectedParcial]);

    const cargarPlanificacionYProgreso = async (forzarAvance = false) => {
        setLoading(true);
        try {
            const resPlan = await api.get(`/planificaciones/verificar/${selectedAsignatura}?parcial=${selectedParcial}&periodo=${encodeURIComponent(selectedPeriodo)}`);
            
            if (resPlan.data.tiene_asignacion && resPlan.data.es_edicion) {
                const guardadas = resPlan.data.actividades_guardadas || {};
                const catalogo = resPlan.data.habilidades || [];
                const idsSeleccionados = resPlan.data.habilidades_seleccionadas || [];
                
                // --- CORRECCIÓN CRÍTICA AQUÍ ---
                // Convertimos todo a String para comparar, evitando error de tipos en servidor
                const habilidadesListas = catalogo.filter(h => 
                    idsSeleccionados.some(selId => String(selId) === String(h.id))
                );
                
                setHabilidadesPlanificadas(habilidadesListas);
                setActividadesContexto(guardadas);

                const resProgreso = await api.get('/docente/progreso', {
                    params: { asignatura_id: selectedAsignatura, periodo: selectedPeriodo, parcial: selectedParcial }
                });
                
                const mapaProgreso = {};
                resProgreso.data.forEach(p => { mapaProgreso[String(p.habilidad_id)] = p.completado; });
                setProgresoHabilidades(mapaProgreso);

                if (habilidadesListas.length > 0) {
                    // Buscar la primera pendiente (comparando como String por seguridad)
                    const primeraPendiente = habilidadesListas.find(h => !mapaProgreso[String(h.id)]);
                    const siguienteId = primeraPendiente ? primeraPendiente.id : habilidadesListas[0].id;

                    if (forzarAvance) {
                        // Comparación segura
                        if (habilidadActiva && mapaProgreso[String(habilidadActiva)] && String(siguienteId) !== String(habilidadActiva)) {
                            setHabilidadActiva(siguienteId);
                            // Si estamos forzando avance (guardado exitoso) y era la última, podríamos manejar lógica extra aquí
                            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pasando a siguiente habilidad...', showConfirmButton: false, timer: 2000 });
                        }
                    } else {
                        // Validar si la activa actual sigue siendo válida en la nueva lista
                        const activaEsValida = habilidadesListas.some(h => String(h.id) === String(habilidadActiva));
                        
                        if (!habilidadActiva || !activaEsValida) {
                            setHabilidadActiva(siguienteId);
                        }
                    }
                } else {
                    // Si no hay habilidades planificadas (lista vacía)
                    setHabilidadActiva(null);
                }
            } else {
                setHabilidadesPlanificadas([]);
                setHabilidadActiva(null);
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const cargarEstudiantesYNotas = async () => {
        if (!habilidadActiva) return; // Protección extra
        setLoading(true);
        try {
            const res = await api.post('/docente/rubrica', {
                asignatura_id: selectedAsignatura,
                habilidad_blanda_id: habilidadActiva,
                parcial: selectedParcial,
                periodo: selectedPeriodo
            });
            
            if (res.data && res.data.estudiantes) {
                setEstudiantes(res.data.estudiantes);
                let acts = res.data.actividades;
                if (typeof acts === 'string') { try { acts = JSON.parse(acts); } catch { acts = []; } }
                if (!Array.isArray(acts)) acts = [];
                setActividadesRubrica(acts);
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
                notas
            });
            Swal.fire('¡Guardado!', `Calificaciones registradas correctamente.`, 'success');
            await cargarPlanificacionYProgreso(true); 
        } catch (error) { Swal.fire('Error', 'No se pudo guardar.', 'error'); }
    };

    const pendientes = estudiantes.filter(e => !e.nivel).length;
    const asignaturasFiltradas = asignaturas.filter(a => a.periodo === selectedPeriodo);
    const opcionesAsignaturas = asignaturasFiltradas.map(a => ({ value: a.id, label: a.nombre, subtext: `${a.carrera} (${a.paralelo})`, periodo: a.periodo }));
    const opcionesParciales = [{ value: '1', label: 'Primer Parcial' }, { value: '2', label: 'Segundo Parcial' }];

    // --- ESTILOS DE LOS BOTONES ---
    const getButtonClass = (est, nivelBoton) => {
        const notaActual = est.nivel ? parseInt(est.nivel) : null;
        const notaP1 = est.nivel_p1 ? parseInt(est.nivel_p1) : null;

        const esNotaActual = notaActual === nivelBoton;
        // Solo es referencia si: Estamos en P2 Y coincide con P1 Y NO es la nota que acabamos de poner en P2
        const esRefP1 = selectedParcial === '2' && notaP1 === nivelBoton && !esNotaActual;

        let baseClass = "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 border relative ";

        // 1. SELECCIONADA (SÓLIDO)
        if (esNotaActual) {
            if (nivelBoton === 1) return baseClass + "bg-red-600 border-red-700 text-white shadow-lg shadow-red-200 scale-110 z-10";
            if (nivelBoton === 2) return baseClass + "bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-200 scale-110 z-10";
            if (nivelBoton === 3) return baseClass + "bg-yellow-500 border-yellow-600 text-white shadow-lg shadow-yellow-200 scale-110 z-10";
            if (nivelBoton === 4) return baseClass + "bg-lime-500 border-lime-600 text-white shadow-lg shadow-lime-200 scale-110 z-10";
            if (nivelBoton === 5) return baseClass + "bg-green-700 border-green-800 text-white shadow-lg shadow-green-200 scale-110 z-10";
        }

        // 2. REFERENCIA P1 (FANTASMA / CONTORNO)
        if (esRefP1) {
            if (nivelBoton === 1) return baseClass + "bg-white text-red-500 border-red-300 border-2 border-dashed opacity-80";
            if (nivelBoton === 2) return baseClass + "bg-white text-orange-500 border-orange-300 border-2 border-dashed opacity-80";
            if (nivelBoton === 3) return baseClass + "bg-white text-yellow-500 border-yellow-300 border-2 border-dashed opacity-80";
            if (nivelBoton === 4) return baseClass + "bg-white text-lime-600 border-lime-300 border-2 border-dashed opacity-80";
            if (nivelBoton === 5) return baseClass + "bg-white text-green-600 border-green-300 border-2 border-dashed opacity-80";
        }

        // 3. INACTIVA
        return baseClass + "bg-white text-gray-300 border-gray-100 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50";
    };

    const getNombreHabilidadActiva = () => {
        const hab = habilidadesPlanificadas.find(h => String(h.id) === String(habilidadActiva));
        return hab ? hab.nombre : '';
    };
    
    const nombreNormalizado = getNombreHabilidadActiva().trim();
    const keyRubrica = Object.keys(RUBRICAS).find(k => k.toLowerCase() === nombreNormalizado.toLowerCase()) || nombreNormalizado;
    const rubricaActual = RUBRICAS[keyRubrica] || {};

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Evaluación Docente</h2>
                    <p className="text-gray-500 text-sm mt-1">Califica el desempeño en base a las actividades planificadas.</p>
                </div>
                {estudiantes.length > 0 && (
                    <button onClick={cargarEstudiantesYNotas} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 bg-white px-3 py-1 rounded border border-blue-200">
                        <ArrowPathIcon className="h-4 w-4"/> Refrescar Lista
                    </button>
                )}
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
                            <CustomSelect label="Materia" options={opcionesAsignaturas} value={selectedAsignatura} onChange={setSelectedAsignatura} placeholder={asignaturasFiltradas.length > 0 ? "-- Seleccionar Materia --" : "Sin materias en este periodo"} />
                        </div>
                        <div className={!selectedAsignatura ? 'opacity-50 pointer-events-none' : ''}>
                            <CustomSelect label="Parcial" icon={ClockIcon} options={opcionesParciales} value={selectedParcial} onChange={setSelectedParcial} />
                        </div>
                    </div>

                    {habilidadesPlanificadas.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-gray-400 uppercase px-1">Progreso de Habilidades</h3>
                            {habilidadesPlanificadas.map((hab, index) => {
                                // Aseguramos comparación string
                                const completado = progresoHabilidades[String(hab.id)]; 
                                const activo = String(habilidadActiva) === String(hab.id);
                                const anteriorCompletada = index === 0 || progresoHabilidades[String(habilidadesPlanificadas[index - 1].id)];
                                const bloqueado = !anteriorCompletada;

                                return (
                                    <button
                                        key={hab.id}
                                        onClick={() => !bloqueado && setHabilidadActiva(hab.id)}
                                        disabled={bloqueado}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between group 
                                            ${activo 
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200 ring-2 ring-white ring-offset-2 ring-offset-blue-100' 
                                                : bloqueado 
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-100' 
                                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-blue-300' 
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {bloqueado && <LockClosedIcon className="h-4 w-4"/>}
                                            {hab.nombre}
                                        </div>
                                        {completado ? <StarIconSolid className="h-5 w-5 text-yellow-400 drop-shadow-sm"/> : (activo ? <StarIcon className="h-4 w-4 text-white"/> : <StarIcon className="h-4 w-4 text-gray-300"/>)}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {habilidadActiva && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-fade-in">
                            <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2"><ListBulletIcon className="h-5 w-5"/> Actividades Planificadas:</h4>
                            <ul className="list-disc list-inside text-xs text-amber-900/80 space-y-1 ml-1 font-medium">
                                {Array.isArray(actividadesRubrica) && actividadesRubrica.length > 0 ? (
                                    actividadesRubrica.map((act, idx) => <li key={idx}>{act.descripcion || act}</li>)
                                ) : (
                                    (actividadesContexto[habilidadActiva] || []).map((act, idx) => <li key={idx}>{act}</li>)
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

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-350px)] min-h-[400px] animate-fade-in">
                                <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase items-center sticky top-0 z-10 shadow-sm">
                                    <div className="col-span-4 pl-2">Estudiante</div>
                                    <div className="col-span-8 grid grid-cols-5">{[1, 2, 3, 4, 5].map(n => <div key={n} className="text-center">Nivel {n}</div>)}</div>
                                </div>
                                <div className="flex-1 overflow-y-auto bg-white">
                                    {loading ? <div className="p-12 text-center text-gray-400 flex flex-col items-center"><ArrowPathIcon className="h-8 w-8 animate-spin mb-2"/>Cargando nómina...</div> 
                                    : estudiantes.length === 0 ? <div className="p-12 text-center text-gray-400">No hay estudiantes cargados.</div> 
                                    : estudiantes.map((est) => (
                                        <div key={est.estudiante_id} className={`grid grid-cols-12 gap-4 p-3 border-b border-gray-50 items-center transition ${est.nivel ? 'bg-blue-50/10' : 'hover:bg-gray-50'}`}>
                                            <div className="col-span-4 font-medium text-sm text-gray-800 truncate pl-2 flex flex-col">
                                                <span>{est.nombres}</span>
                                                {est.nivel && <span className="text-[10px] text-green-600 font-bold">Calificado (Nivel {est.nivel})</span>}
                                            </div>
                                            <div className="col-span-8 grid grid-cols-5 items-center">
                                                {[1, 2, 3, 4, 5].map((nivel) => {
                                                    const notaP1 = est.nivel_p1 ? parseInt(est.nivel_p1) : null;
                                                    const notaActual = est.nivel ? parseInt(est.nivel) : null;
                                                    const esRefP1 = selectedParcial === '2' && notaP1 === nivel && notaActual !== nivel;

                                                    return (
                                                        <div key={nivel} className="flex justify-center relative">
                                                            <button onClick={() => handleNotaChange(est.estudiante_id, nivel)} className={getButtonClass(est, nivel)} title={esRefP1 ? "Nota del Parcial 1" : `Asignar Nivel ${nivel}`}>
                                                                {nivel}
                                                            </button>
                                                            {esRefP1 && (
                                                                <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-[9px] bg-gray-500 text-white px-1.5 py-0.5 rounded-full shadow-sm opacity-90 font-bold z-20 pointer-events-none">
                                                                    P1
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center sticky bottom-0 z-20">
                                    <div className="flex items-center gap-4">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${pendientes > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{pendientes > 0 ? `Faltan ${pendientes}` : '¡Todos calificados!'}</span>
                                        {selectedParcial === '2' && (
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                <div className="flex gap-1">
                                                    <span className="w-3 h-3 bg-red-600 rounded-full" title="Nivel 1"></span>
                                                    <span className="w-3 h-3 bg-orange-500 rounded-full" title="Nivel 2"></span>
                                                    <span className="w-3 h-3 bg-yellow-500 rounded-full" title="Nivel 3"></span>
                                                    <span className="w-3 h-3 bg-lime-500 rounded-full" title="Nivel 4"></span>
                                                    <span className="w-3 h-3 bg-green-700 rounded-full" title="Nivel 5"></span>
                                                </div>
                                                <span>Escala</span>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={handleGuardar} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-8 rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95"><CheckCircleIcon className="h-5 w-5"/> Guardar Notas</button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                            <UserGroupIcon className="h-16 w-16 mb-4 opacity-20"/>
                            <p className="text-lg font-medium">Selecciona una Habilidad</p>
                            <p className="text-sm">Completa las habilidades en orden para desbloquear la siguiente.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EvaluacionDocente;