import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import CustomSelect from './ui/CustomSelect';
import { 
    BookOpenIcon, SparklesIcon, UserGroupIcon, 
    CheckBadgeIcon, CalendarDaysIcon, ClockIcon, 
    CheckCircleIcon, PlusIcon, TrashIcon, ListBulletIcon, LockClosedIcon
} from '@heroicons/react/24/outline';

const PlanificacionDocente = () => {
    // Estados principales
    const [misAsignaturas, setMisAsignaturas] = useState([]);
    const [estudiantes, setEstudiantes] = useState([]);
    const [catalogoHabilidades, setCatalogoHabilidades] = useState([]);
    const [loading, setLoading] = useState(false);

    // Formulario
    const [form, setForm] = useState({
        asignatura_id: '',
        parcial: '1',
        periodo_academico: '', 
    });

    // Estado de la planificación actual
    const [habilidadesSeleccionadas, setHabilidadesSeleccionadas] = useState([]); 
    const [actividadesPorHabilidad, setActividadesPorHabilidad] = useState({}); 
    const [esEdicion, setEsEdicion] = useState(false);

    // Estado para agregar nueva actividad
    const [nuevaActividad, setNuevaActividad] = useState(''); 
    const [habilidadParaActividad, setHabilidadParaActividad] = useState(null);

    // --- BASE DE DATOS DE ACTIVIDADES (De la Guía Oficial) ---
    const ACTIVIDADES_GUIA = {
        "Comunicación Efectiva": [
            "Debates y mesas redondas", "Presentaciones orales y proyectos grupales",
            "Simulaciones y dramatizaciones", "Análisis de discursos y textos"
        ],
        "Resolución de Problemas": [
            "Observación directa", "Estudio de casos", "Debates y discusiones",
            "Simulaciones y role-playing", "Proyectos colaborativos", "Autoevaluación y reflexión"
        ],
        "Trabajo en Equipo": [
            "Observación directa", "Estudio de casos", "Debates y discusiones",
            "Simulaciones y role-playing", "Proyectos colaborativos"
        ],
        "Gestión del Tiempo": [
            "Observación directa", "Análisis de resultados",
            "Retroalimentación de pares", "Uso de indicadores de desempeño"
        ],
        "Adaptabilidad": [
            "Aprendizaje basado en problemas", "Simulación de escenarios cambiantes",
            "Proyectos interdisciplinarios", "Uso de metodologías activas"
        ],
        "Aprender a Aprender": [
            "Aprendizaje basado en problemas", "Simulación de escenarios cambiantes",
            "Proyectos interdisciplinarios"
        ],
        "Asertividad": [
            "Debates y discusiones guiadas", "Sesiones de preguntas y respuestas",
            "Análisis de casos", "Proyectos de innovación"
        ],
        "Creatividad": [
            "Debates y discusiones guiadas", "Análisis de casos",
            "Proyectos de innovación", "Evaluación del proceso creativo"
        ],
        "Pensamiento Crítico": [
            "Feedback constructivo", "Análisis de casos",
            "Debates estructurados", "Ensayos reflexivos"
        ],
        "Liderazgo": [
            "Rubricas de evaluación de liderazgo", "Autoevaluación y metacognición",
            "Portafolios reflexivos", "Evaluación entre pares"
        ],
        "Toma de Decisiones": [
            "Rubricas de evaluación", "Autoevaluación y metacognición",
            "Portafolios reflexivos", "Estudio de casos reales"
        ]
    };

    // 1. CARGA INICIAL
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [resAsig, resPer] = await Promise.all([
                    api.get('/docente/asignaturas'),
                    api.get('/periodos/activos')
                ]);
                setMisAsignaturas(Array.isArray(resAsig.data) ? resAsig.data : []);
                
                // AUTOMATIZACIÓN DEL PERIODO
                const periodosActivos = Array.isArray(resPer.data) ? resPer.data : [];
                const activo = periodosActivos.find(p => p.activo === 1 || p.activo === true);
                
                if (activo) {
                    setForm(prev => ({ ...prev, periodo_academico: activo.nombre }));
                }
            } catch (error) {
                console.error("Error cargando datos iniciales", error);
            }
        };
        cargarDatos();
    }, []);

    // 2. RECARGA AL CAMBIAR FILTROS
    useEffect(() => {
        if (form.asignatura_id && form.parcial && form.periodo_academico) {
            cargarPlanificacion();
            cargarEstudiantes(form.asignatura_id);
        }
    }, [form.asignatura_id, form.parcial, form.periodo_academico]);

    // HANDLERS
    const handleCambioMateria = (val) => {
        const materia = misAsignaturas.find(m => String(m.id) === String(val) && m.periodo === form.periodo_academico);
        let nuevoParcial = '1';
        if (materia && materia.planificacion_p1 && !materia.planificacion_p2) nuevoParcial = '2';

        setForm(prev => ({ ...prev, asignatura_id: val, parcial: nuevoParcial }));
    };

    // --- LÓGICA PRINCIPAL CORREGIDA ---
    const cargarPlanificacion = async () => {
        setLoading(true);
        try {
            // 1. Intentar cargar planificación del parcial ACTUAL
            const res = await api.get(`/planificaciones/verificar/${form.asignatura_id}`, {
                params: { parcial: form.parcial, periodo: form.periodo_academico }
            });

            if (res.data.tiene_asignacion) {
                setCatalogoHabilidades(res.data.habilidades || []);
                
                if (res.data.es_edicion) {
                    // CASO A: Ya existe planificación para este parcial (Edición)
                    setEsEdicion(true);
                    setHabilidadesSeleccionadas(res.data.habilidades_seleccionadas || []);
                    setActividadesPorHabilidad(res.data.actividades_guardadas || {});
                    Swal.mixin({toast: true, position: 'top-end', timer: 2000, showConfirmButton: false})
                        .fire({icon: 'info', title: 'Planificación cargada'});
                
                } else if (form.parcial === '2') {
                    // CASO B: No existe plan P2, intentamos copiar habilidades de P1
                    const resP1 = await api.get(`/planificaciones/verificar/${form.asignatura_id}`, {
                        params: { parcial: '1', periodo: form.periodo_academico }
                    });

                    if (resP1.data.es_edicion) {
                        setEsEdicion(false); // Es nueva, pero pre-llenada
                        // Copiamos SOLO las habilidades
                        setHabilidadesSeleccionadas(resP1.data.habilidades_seleccionadas || []);
                        // Dejamos actividades vacías para que el docente elija nuevas
                        setActividadesPorHabilidad({}); 
                        
                        Swal.mixin({toast: true, position: 'top-end', timer: 3000, showConfirmButton: false})
                            .fire({icon: 'success', title: 'Habilidades copiadas del Parcial 1. Seleccione las nuevas actividades.'});
                    } else {
                        // Si no hay P1, todo limpio
                        setEsEdicion(false);
                        setHabilidadesSeleccionadas([]);
                        setActividadesPorHabilidad({});
                    }
                } else {
                    // CASO C: Es Parcial 1 y no hay nada (Todo nuevo)
                    setEsEdicion(false);
                    setHabilidadesSeleccionadas([]);
                    setActividadesPorHabilidad({});
                }
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo cargar la planificación.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const cargarEstudiantes = (id) => {
        api.get(`/docente/estudiantes/${id}`).then(res => setEstudiantes(res.data));
    };

    // GESTIÓN DE HABILIDADES Y ACTIVIDADES
    const toggleHabilidad = (id) => {
        setHabilidadesSeleccionadas(prev => {
            if (prev.includes(id)) {
                const newState = prev.filter(h => h !== id);
                const nuevasActividades = { ...actividadesPorHabilidad };
                delete nuevasActividades[id];
                setActividadesPorHabilidad(nuevasActividades);
                return newState;
            } else {
                return [...prev, id];
            }
        });
    };

    const agregarActividad = (habilidadId) => {
        if (!nuevaActividad) return;
        const actuales = actividadesPorHabilidad[habilidadId] || [];
        if(actuales.includes(nuevaActividad)) {
            return Swal.fire('Atención', 'Esta actividad ya fue agregada.', 'info');
        }
        setActividadesPorHabilidad(prev => ({
            ...prev,
            [habilidadId]: [...(prev[habilidadId] || []), nuevaActividad]
        }));
        setNuevaActividad('');
        setHabilidadParaActividad(null);
    };

    const eliminarActividad = (habilidadId, index) => {
        setActividadesPorHabilidad(prev => {
            const actividades = [...(prev[habilidadId] || [])];
            actividades.splice(index, 1);
            return { ...prev, [habilidadId]: actividades };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (habilidadesSeleccionadas.length === 0) return Swal.fire('Error', 'Selecciona al menos una habilidad.', 'warning');

        for (let id of habilidadesSeleccionadas) {
            if (!actividadesPorHabilidad[id] || actividadesPorHabilidad[id].length === 0) {
                const nombreHab = catalogoHabilidades.find(h => h.id === id)?.nombre;
                return Swal.fire('Faltan actividades', `Selecciona actividades para: ${nombreHab}`, 'warning');
            }
        }

        const user = JSON.parse(localStorage.getItem('user'));
        const detalles = habilidadesSeleccionadas.map(id => ({
            habilidad_blanda_id: id,
            actividades: actividadesPorHabilidad[id] 
        }));

        try {
            await api.post('/planificaciones', {
                asignatura_id: form.asignatura_id,
                docente_id: user.id,
                parcial: form.parcial,
                periodo_academico: form.periodo_academico,
                detalles: detalles
            });
            Swal.fire('¡Éxito!', 'Planificación guardada correctamente.', 'success');
            setEsEdicion(true);
            api.get('/docente/asignaturas').then(res => setMisAsignaturas(res.data));
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar la planificación.', 'error');
        }
    };

    // OPCIONES SELECT Y HELPER
    const asignaturasDelPeriodo = misAsignaturas.filter(a => a.periodo === form.periodo_academico);
    const opcionesAsignaturas = asignaturasDelPeriodo.map(a => ({
        value: a.id,
        label: a.nombre,
        subtext: `${a.carrera} (${a.paralelo})`,
        icon: (a.planificacion_p1 && a.planificacion_p2) ? CheckCircleIcon : null
    }));
    const opcionesParciales = [{ value: '1', label: '1er Parcial' }, { value: '2', label: '2do Parcial' }];

    const getOpcionesActividades = (habilidadId) => {
        const habilidadObj = catalogoHabilidades.find(h => h.id === habilidadId);
        if (!habilidadObj) return [];
        const nombreBD = habilidadObj.nombre;
        let actividades = ACTIVIDADES_GUIA[nombreBD] || [];
        
        if (actividades.length === 0) {
            const key = Object.keys(ACTIVIDADES_GUIA).find(k => nombreBD.includes(k) || k.includes(nombreBD));
            if (key) actividades = ACTIVIDADES_GUIA[key];
        }
        if (actividades.length === 0) return [{ value: 'Actividad General', label: 'Actividad General' }];
        return actividades.map(act => ({ value: act, label: act }));
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20 p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <BookOpenIcon className="h-7 w-7 text-blue-600"/> Planificación de Habilidades
                </h2>
                {esEdicion && <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">Modo Edición</span>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* FILTROS CON PERIODO AUTOMÁTICO */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Periodo Académico (Automático)</label>
                            <div className="flex items-center gap-3 w-full border border-blue-200 rounded-xl p-3 bg-blue-50 text-blue-800 font-medium">
                                <CalendarDaysIcon className="h-5 w-5"/>
                                <span>{form.periodo_academico || 'Cargando periodo activo...'}</span>
                                <LockClosedIcon className="h-4 w-4 ml-auto text-blue-400"/>
                            </div>
                        </div>
                        <CustomSelect label="Asignatura" icon={BookOpenIcon} options={opcionesAsignaturas} value={form.asignatura_id} onChange={handleCambioMateria} disabled={!form.periodo_academico} />
                        <CustomSelect label="Parcial" icon={ClockIcon} options={opcionesParciales} value={form.parcial} onChange={v => setForm({...form, parcial: v})} disabled={!form.asignatura_id} />
                    </div>

                    {/* LISTA DE HABILIDADES */}
                    {form.asignatura_id && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <SparklesIcon className="h-5 w-5 text-purple-600"/> Selecciona las Habilidades
                            </h3>
                            <div className="space-y-4">
                                {catalogoHabilidades.map(hab => {
                                    const seleccionado = habilidadesSeleccionadas.includes(hab.id);
                                    const opcionesActividades = getOpcionesActividades(hab.id);
                                    return (
                                        <div key={hab.id} className={`border rounded-xl p-4 transition-all ${seleccionado ? 'border-purple-500 bg-purple-50/30' : 'border-gray-200'}`}>
                                            <div className="flex items-center gap-3">
                                                <input type="checkbox" checked={seleccionado} onChange={() => toggleHabilidad(hab.id)} className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"/>
                                                <div>
                                                    <p className="font-bold text-gray-800">{hab.nombre}</p>
                                                    <p className="text-xs text-gray-500">{hab.descripcion}</p>
                                                </div>
                                            </div>
                                            {seleccionado && (
                                                <div className="mt-4 pl-8 border-l-2 border-purple-200 ml-2">
                                                    <p className="text-xs font-bold text-purple-700 mb-2 uppercase">Actividades Planificadas:</p>
                                                    <ul className="space-y-2 mb-3">
                                                        {(actividadesPorHabilidad[hab.id] || []).map((act, idx) => (
                                                            <li key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-purple-100 text-sm text-gray-700">
                                                                <span>• {act}</span>
                                                                <button onClick={() => eliminarActividad(hab.id, idx)} className="text-red-400 hover:text-red-600"><TrashIcon className="h-4 w-4"/></button>
                                                            </li>
                                                        ))}
                                                        {(actividadesPorHabilidad[hab.id] || []).length === 0 && <li className="text-xs text-gray-400 italic">No hay actividades seleccionadas.</li>}
                                                    </ul>
                                                    <div className="flex gap-2 items-end">
                                                        <div className="flex-1">
                                                            <CustomSelect label="" placeholder="Seleccionar actividad sugerida..." options={opcionesActividades} value={habilidadParaActividad === hab.id ? nuevaActividad : ''} onChange={(val) => { setHabilidadParaActividad(hab.id); setNuevaActividad(val); }} icon={ListBulletIcon} />
                                                        </div>
                                                        <button onClick={() => agregarActividad(hab.id)} className="bg-purple-600 text-white px-3 py-2.5 rounded-lg hover:bg-purple-700 transition shadow-sm h-[42px]" title="Agregar"><PlusIcon className="h-5 w-5"/></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                                <button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 transform active:scale-95 transition">
                                    <CheckBadgeIcon className="h-6 w-6"/> {esEdicion ? 'Actualizar Planificación' : 'Guardar Planificación'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full max-h-[600px] flex flex-col overflow-hidden sticky top-6">
                        <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
                            <UserGroupIcon className="h-5 w-5 text-blue-600"/>
                            <h3 className="font-bold text-gray-700">Nómina</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0">
                            {estudiantes.length > 0 ? (
                                <ul className="divide-y divide-gray-50">
                                    {estudiantes.map((est, i) => (
                                        <li key={est.id} className="p-3 hover:bg-blue-50 flex items-center gap-3 text-sm">
                                            <span className="font-bold text-gray-400 w-5">{i+1}</span>
                                            <div>
                                                <p className="font-bold text-gray-800">{est.apellidos} {est.nombres}</p>
                                                <p className="text-xs text-gray-400">{est.email}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-8 text-center text-gray-400 text-sm">Selecciona una materia para ver estudiantes.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlanificacionDocente;