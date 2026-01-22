import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { RUBRICAS } from '../data/rubricas'; 
import CustomSelect from './ui/CustomSelect';
import { 
    UserGroupIcon, 
    CheckCircleIcon, ArrowPathIcon, InformationCircleIcon,
    ClockIcon, ListBulletIcon, StarIcon, CalendarDaysIcon, LockClosedIcon 
} from '@heroicons/react/24/outline';

const EvaluacionDocente = () => {
    // --- ESTADOS ---
    const [asignaturas, setAsignaturas] = useState([]);
    const [habilidadesPlanificadas, setHabilidadesPlanificadas] = useState([]);
    
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
                
                if (activo) {
                    setSelectedPeriodo(activo.nombre);
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchInicial();
    }, []);

    // --- CARGAR PLANIFICACIÓN ---
    useEffect(() => {
        if (selectedAsignatura && selectedParcial && selectedPeriodo) {
            cargarPlanificacion();
        }
    }, [selectedAsignatura, selectedParcial, selectedPeriodo]);

    // --- CARGAR ESTUDIANTES ---
    useEffect(() => {
        if (selectedAsignatura && habilidadActiva) {
            cargarEstudiantesYNotas();
        }
    }, [habilidadActiva]);

    const cargarPlanificacion = async () => {
        setLoading(true);
        setHabilidadesPlanificadas([]);
        setActividadesContexto({});
        setHabilidadActiva(null);
        setEstudiantes([]);
        setActividadesRubrica([]);
        
        try {
            const res = await api.get(`/planificaciones/verificar/${selectedAsignatura}?parcial=${selectedParcial}&periodo=${encodeURIComponent(selectedPeriodo)}`);
            
            if (res.data.tiene_asignacion && res.data.es_edicion) {
                const guardadas = res.data.actividades_guardadas || {};
                const catalogo = res.data.habilidades || [];
                const idsSeleccionados = res.data.habilidades_seleccionadas || [];
                
                const habilidadesListas = catalogo.filter(h => idsSeleccionados.includes(h.id));
                
                setHabilidadesPlanificadas(habilidadesListas);
                setActividadesContexto(guardadas);

                if (habilidadesListas.length > 0) {
                    setHabilidadActiva(habilidadesListas[0].id);
                }
            } else {
                Swal.fire('Atención', 'No has realizado la planificación de actividades para este parcial.', 'warning');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo cargar la planificación.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const cargarEstudiantesYNotas = async () => {
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
                setActividadesRubrica(res.data.actividades || []);
                
                if (res.data.estudiantes.length === 0) Swal.fire('Info', 'No hay estudiantes inscritos.', 'info');
                setMostrarRubrica(true);
            } else {
                setEstudiantes([]);
            }

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Error al cargar estudiantes y rúbrica.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA RÚBRICA ---
    const getNombreHabilidadActiva = () => {
        const hab = habilidadesPlanificadas.find(h => h.id === habilidadActiva);
        return hab ? hab.nombre : '';
    };

    const nombreNormalizado = getNombreHabilidadActiva().trim();
    const keyRubrica = Object.keys(RUBRICAS).find(k => k.toLowerCase() === nombreNormalizado.toLowerCase()) || nombreNormalizado;
    const rubricaActual = RUBRICAS[keyRubrica] || {};

    const handleNotaChange = (studentId, nuevoNivel) => {
        setEstudiantes(prev => prev.map(est => 
            est.estudiante_id === studentId ? { ...est, nivel: parseInt(nuevoNivel) } : est
        ));
    };

    const handleGuardar = async () => {
        try {
            const notas = estudiantes
                .filter(e => e.nivel)
                .map(e => ({ estudiante_id: e.estudiante_id, nivel: e.nivel }));

            if(notas.length === 0) return Swal.fire('Aviso', 'No has calificado a nadie.', 'warning');

            await api.post('/docente/guardar-notas', {
                asignatura_id: selectedAsignatura,
                habilidad_blanda_id: habilidadActiva,
                parcial: selectedParcial,
                periodo: selectedPeriodo,
                notas
            });
            Swal.fire('¡Guardado!', `Calificaciones registradas correctamente.`, 'success');
        } catch (error) { Swal.fire('Error', 'No se pudo guardar.', 'error'); }
    };

    const pendientes = estudiantes.filter(e => !e.nivel).length;

    // --- OPCIONES UI ---
    const asignaturasFiltradas = asignaturas.filter(a => a.periodo === selectedPeriodo);

    const opcionesAsignaturas = asignaturasFiltradas.map(a => ({
        value: a.id,
        label: a.nombre,
        subtext: `${a.carrera} (${a.paralelo})`,
        periodo: a.periodo 
    }));

    const opcionesParciales = [
        { value: '1', label: 'Primer Parcial' },
        { value: '2', label: 'Segundo Parcial' }
    ];

    // --- LÓGICA DE COLORES SEMÁNTICOS ---
    const getButtonClass = (est, nivelBoton) => {
        const esNotaActual = est.nivel === nivelBoton;
        const esNotaParcial1 = selectedParcial === '2' && est.nivel_p1 === nivelBoton;

        let baseClass = "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 border relative";
        
        // Colores según nivel (Semáforo)
        let colorActual = "";
        let colorSombra = "";
        
        if (nivelBoton <= 2) { 
            // ROJO (Bajo)
            colorActual = "bg-red-500 border-red-600 text-white ring-red-200";
            colorSombra = "bg-red-50 border-red-200 text-red-400";
        } else if (nivelBoton === 3) {
            // AMBAR (Medio)
            colorActual = "bg-amber-400 border-amber-500 text-white ring-amber-200";
            colorSombra = "bg-amber-50 border-amber-200 text-amber-500";
        } else {
            // VERDE (Alto)
            colorActual = "bg-green-500 border-green-600 text-white ring-green-200";
            colorSombra = "bg-green-50 border-green-200 text-green-600";
        }

        if (esNotaActual) {
            // NOTA SELECCIONADA (Color Fuerte)
            return `${baseClass} ${colorActual} scale-110 shadow-lg ring-2 ring-offset-1 z-10`;
        } 
        
        if (esNotaParcial1) {
            // SOMBRA PARCIAL 1 (Color Suave/Pastel)
            return `${baseClass} ${colorSombra} border-dashed`;
        }

        // ESTADO NORMAL (Blanco/Gris)
        return `${baseClass} bg-white text-gray-300 border-gray-100 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50`;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* CABECERA */}
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
                
                {/* --- PANEL IZQUIERDO --- */}
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
                            <CustomSelect 
                                label="Materia"
                                options={opcionesAsignaturas}
                                value={selectedAsignatura}
                                onChange={setSelectedAsignatura}
                                placeholder={asignaturasFiltradas.length > 0 ? "-- Seleccionar Materia --" : "Sin materias en este periodo"}
                            />
                        </div>
                        <div className={!selectedAsignatura ? 'opacity-50 pointer-events-none' : ''}>
                            <CustomSelect 
                                label="Parcial"
                                icon={ClockIcon}
                                options={opcionesParciales}
                                value={selectedParcial}
                                onChange={setSelectedParcial}
                            />
                        </div>
                    </div>

                    {habilidadesPlanificadas.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-gray-400 uppercase px-1">Habilidad a Evaluar</h3>
                            {habilidadesPlanificadas.map(hab => (
                                <button
                                    key={hab.id}
                                    onClick={() => setHabilidadActiva(hab.id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between group ${
                                        habilidadActiva === hab.id 
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200 ring-2 ring-white ring-offset-2 ring-offset-blue-100' 
                                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-blue-300'
                                    }`}
                                >
                                    {hab.nombre}
                                    {habilidadActiva === hab.id && <StarIcon className="h-4 w-4 text-white"/>}
                                </button>
                            ))}
                        </div>
                    )}

                    {habilidadActiva && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-fade-in">
                            <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2">
                                <ListBulletIcon className="h-5 w-5"/> Actividades Planificadas:
                            </h4>
                            <ul className="list-disc list-inside text-xs text-amber-900/80 space-y-1 ml-1 font-medium">
                                {actividadesRubrica.length > 0 ? (
                                    actividadesRubrica.map((act, idx) => (
                                        <li key={idx}>{act.descripcion || act}</li>
                                    ))
                                ) : (
                                    (actividadesContexto[habilidadActiva] || []).map((act, idx) => (
                                        <li key={idx}>{act}</li>
                                    ))
                                )}
                            </ul>
                        </div>
                    )}
                </div>

                {/* --- PANEL DERECHO --- */}
                <div className="lg:col-span-8 space-y-6">
                    {habilidadActiva ? (
                        <>
                            {/* GUÍA DE RÚBRICA */}
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm animate-fade-in">
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => setMostrarRubrica(!mostrarRubrica)}>
                                    <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                                        <InformationCircleIcon className="h-5 w-5"/>
                                        Guía de Rúbrica - {getNombreHabilidadActiva()}
                                    </h4>
                                    <span className="text-blue-500 text-xs font-semibold bg-white px-2 py-1 rounded border border-blue-200">
                                        {mostrarRubrica ? 'Ocultar ▲' : 'Ver Detalles ▼'}
                                    </span>
                                </div>
                                {mostrarRubrica && (
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2 text-[11px] text-blue-900">
                                        {[1, 2, 3, 4, 5].map(nivel => (
                                            <div key={nivel} className="flex flex-col gap-1 p-2 bg-white rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition">
                                                <div className="flex items-center gap-1.5 border-b border-blue-50 pb-1 mb-1">
                                                    <span className={`font-bold w-5 h-5 flex items-center justify-center rounded-full text-white text-xs ${
                                                        nivel <= 2 ? 'bg-red-400' : nivel <= 3 ? 'bg-amber-400' : 'bg-green-500'
                                                    }`}>
                                                        {nivel}
                                                    </span>
                                                    <span className="font-bold text-blue-700">Nivel {nivel}</span>
                                                </div>
                                                <p className="leading-tight opacity-90 text-gray-600">
                                                    {rubricaActual[nivel] || "Criterio estándar."}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* TABLA DE CALIFICACIÓN */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-350px)] min-h-[400px] animate-fade-in">
                                <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase items-center sticky top-0 z-10 shadow-sm">
                                    <div className="col-span-4 pl-2">Estudiante</div>
                                    <div className="col-span-8 grid grid-cols-5">
                                        {[1, 2, 3, 4, 5].map(n => <div key={n} className="text-center">Nivel {n}</div>)}
                                    </div>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto bg-white">
                                    {loading ? (
                                        <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                                            <ArrowPathIcon className="h-8 w-8 animate-spin mb-2"/>
                                            Cargando nómina...
                                        </div>
                                    ) : estudiantes.length === 0 ? (
                                        <div className="p-12 text-center text-gray-400">No hay estudiantes cargados para este curso.</div>
                                    ) : (
                                        estudiantes.map((est) => (
                                            <div key={est.estudiante_id} className={`grid grid-cols-12 gap-4 p-3 border-b border-gray-50 items-center transition ${est.nivel ? 'bg-blue-50/10' : 'hover:bg-gray-50'}`}>
                                                <div className="col-span-4 font-medium text-sm text-gray-800 truncate pl-2 flex flex-col">
                                                    <span>{est.nombres}</span>
                                                    {est.nivel && <span className="text-[10px] text-green-600 font-bold">Calificado (Nivel {est.nivel})</span>}
                                                </div>
                                                <div className="col-span-8 grid grid-cols-5 items-center">
                                                    {[1, 2, 3, 4, 5].map((nivel) => (
                                                        <div key={nivel} className="flex justify-center relative">
                                                            <button
                                                                onClick={() => handleNotaChange(est.estudiante_id, nivel)}
                                                                className={getButtonClass(est, nivel)}
                                                                title={selectedParcial === '2' && est.nivel_p1 === nivel ? "Nota del Parcial 1" : `Asignar Nivel ${nivel}`}
                                                            >
                                                                {nivel}
                                                            </button>
                                                            {/* Etiqueta flotante para P1 */}
                                                            {selectedParcial === '2' && est.nivel_p1 === nivel && est.nivel !== nivel && (
                                                                <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-[9px] bg-gray-400 text-white px-1.5 py-0.5 rounded-full shadow opacity-90 font-bold z-20">
                                                                    P1
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                
                                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center sticky bottom-0 z-20">
                                    <div className="flex items-center gap-4">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${pendientes > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                            {pendientes > 0 ? `Faltan ${pendientes} por calificar` : '¡Todos calificados!'}
                                        </span>
                                        {selectedParcial === '2' && (
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                <div className="flex gap-1">
                                                    <span className="w-3 h-3 bg-red-100 border border-red-200 rounded-full"></span>
                                                    <span className="w-3 h-3 bg-amber-100 border border-amber-200 rounded-full"></span>
                                                    <span className="w-3 h-3 bg-green-100 border border-green-200 rounded-full"></span>
                                                </div>
                                                <span>Ref. Parcial 1</span>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={handleGuardar} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-8 rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95">
                                        <CheckCircleIcon className="h-5 w-5"/> Guardar Notas
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                            <UserGroupIcon className="h-16 w-16 mb-4 opacity-20"/>
                            <p className="text-lg font-medium">Selecciona una Habilidad</p>
                            <p className="text-sm">Para ver la rúbrica y la lista de estudiantes.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EvaluacionDocente;