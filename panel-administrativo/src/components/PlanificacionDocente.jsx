import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import CustomSelect from './ui/CustomSelect';
import { 
    BookOpenIcon, SparklesIcon, 
    CheckBadgeIcon, CalendarDaysIcon, ClockIcon, 
    CheckCircleIcon, PlusIcon, TrashIcon, ListBulletIcon, LockClosedIcon
} from '@heroicons/react/24/outline';

const PlanificacionDocente = () => {
    // Estados principales
    const [misAsignaturas, setMisAsignaturas] = useState([]);
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

    // 1. CARGA INICIAL
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [resAsig, resPer] = await Promise.all([
                    api.get('/docente/asignaturas'),
                    api.get('/periodos/activos')
                ]);
                setMisAsignaturas(Array.isArray(resAsig.data) ? resAsig.data : []);
                
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
        }
    }, [form.asignatura_id, form.parcial, form.periodo_academico]);

    // HANDLERS
    const handleCambioMateria = (val) => {
        const materia = misAsignaturas.find(m => String(m.id) === String(val) && m.periodo === form.periodo_academico);
        let nuevoParcial = '1';
        if (materia && materia.planificacion_p1 && !materia.planificacion_p2) nuevoParcial = '2';

        setForm(prev => ({ ...prev, asignatura_id: val, parcial: nuevoParcial }));
    };

    // --- LÓGICA PRINCIPAL ---
    const cargarPlanificacion = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/planificaciones/verificar/${form.asignatura_id}`, {
                params: { parcial: form.parcial, periodo: form.periodo_academico }
            });

            if (res.data.tiene_asignacion) {
                setCatalogoHabilidades(res.data.habilidades || []);
                
                if (res.data.es_edicion) {
                    setEsEdicion(true);
                    
                    let seleccionadas = (res.data.habilidades_seleccionadas || []).map(id => Number(id));
                    
                    // --- SINCRONIZACIÓN ESTRICTA ---
                    if (form.parcial === '2' && res.data.habilidades_p1 && res.data.habilidades_p1.length > 0) {
                        const idsP1 = res.data.habilidades_p1.map(id => Number(id));
                        
                        // Forzamos que la selección sea idéntica a la del P1.
                        const nuevaSeleccion = idsP1;

                        const huboCambios = seleccionadas.length !== nuevaSeleccion.length || 
                                            !seleccionadas.every(s => nuevaSeleccion.includes(s));

                        if (huboCambios) {
                             Swal.mixin({toast: true, position: 'top-end', timer: 3000, showConfirmButton: false})
                            .fire({icon: 'info', title: 'Se sincronizaron las habilidades con el Parcial 1.'});
                        }
                        
                        seleccionadas = nuevaSeleccion;

                        // Limpieza de actividades de habilidades que ya no existen
                        const actividadesLimpias = {};
                        seleccionadas.forEach(id => {
                            if (res.data.actividades_guardadas && res.data.actividades_guardadas[id]) {
                                actividadesLimpias[id] = res.data.actividades_guardadas[id];
                            }
                        });
                        
                        setActividadesPorHabilidad(actividadesLimpias);
                    } else {
                        setActividadesPorHabilidad(res.data.actividades_guardadas || {});
                    }
                    // -------------------------------------------------

                    setHabilidadesSeleccionadas(seleccionadas);
                    
                } else if (form.parcial === '2') {
                    // Carga inicial P2
                    const idsDelP1 = (res.data.habilidades_p1 || []).map(id => Number(id));
                    
                    if (idsDelP1.length > 0) {
                        setEsEdicion(false); 
                        setHabilidadesSeleccionadas(idsDelP1);
                        setActividadesPorHabilidad({}); 
                        
                        Swal.mixin({toast: true, position: 'top-end', timer: 3000, showConfirmButton: false})
                            .fire({icon: 'success', title: 'Habilidades del P1 cargadas. Defina las actividades.'});
                    } else {
                        setEsEdicion(false);
                        setHabilidadesSeleccionadas([]);
                        setActividadesPorHabilidad({});
                    }
                } else {
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

    const toggleHabilidad = (id) => {
        // --- BLOQUEO: Si es Parcial 2, NO permitir cambios ---
        if (form.parcial === '2') return;
        // -----------------------------------------------------

        const idNum = Number(id);
        setHabilidadesSeleccionadas(prev => {
            if (prev.includes(idNum)) {
                const newState = prev.filter(h => h !== idNum);
                const nuevasActividades = { ...actividadesPorHabilidad };
                delete nuevasActividades[idNum];
                setActividadesPorHabilidad(nuevasActividades);
                return newState;
            } else {
                return [...prev, idNum];
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
            
            await Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Planificación guardada correctamente.',
                returnFocus: false 
            });

            window.scrollTo({ top: 0, behavior: 'smooth' });
            cargarPlanificacion();
            api.get('/docente/asignaturas').then(res => setMisAsignaturas(res.data));

        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar la planificación.', 'error');
        }
    };

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
        if (!habilidadObj || !habilidadObj.actividades || habilidadObj.actividades.length === 0) {
            return [{ value: 'Actividad General', label: 'Actividad General' }];
        }
        return habilidadObj.actividades.map(act => ({
            value: act.descripcion,
            label: act.descripcion
        }));
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20 p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <BookOpenIcon className="h-7 w-7 text-blue-600"/> Planificación de Habilidades
                </h2>
                {esEdicion && <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">Modo Edición</span>}
            </div>

            <div className="w-full space-y-6">
                
                {/* FILTROS */}
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
                            <SparklesIcon className="h-5 w-5 text-purple-600"/> 
                            {form.parcial === '2' ? 'Habilidades Continuas (2do Parcial)' : 'Selecciona las Habilidades (1er Parcial)'}
                        </h3>
                        
                      
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            {catalogoHabilidades
                                .filter(hab => {
                                    if (form.parcial === '1') return true;
                                    // En P2 solo mostramos las que están seleccionadas (que son las del P1)
                                    // para no llenar la pantalla de opciones bloqueadas que no pueden usar.
                                    return habilidadesSeleccionadas.includes(Number(hab.id));
                                })
                                .map(hab => {
                                    const seleccionado = habilidadesSeleccionadas.includes(Number(hab.id));
                                    const opcionesActividades = getOpcionesActividades(hab.id);
                                    
                                    // Variable de bloqueo
                                    const bloqueado = form.parcial === '2';

                                    return (
                                        <div key={hab.id} className={`border rounded-xl p-4 transition-all flex flex-col ${seleccionado ? (bloqueado ? 'border-gray-300 bg-gray-50' : 'border-purple-500 bg-purple-50/30') : 'border-gray-200'}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="relative flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={seleccionado} 
                                                        onChange={() => toggleHabilidad(hab.id)} 
                                                        disabled={bloqueado} // Deshabilita el click
                                                        className={`w-5 h-5 rounded focus:ring-purple-500 ${bloqueado ? 'text-gray-400 cursor-not-allowed bg-gray-200 border-gray-300' : 'text-purple-600 cursor-pointer'}`}
                                                    />
                                                    {/* Ícono de candado visual */}
                                                    {bloqueado && seleccionado && <LockClosedIcon className="h-3 w-3 text-gray-500 absolute -top-1 -right-1 bg-white rounded-full ring-1 ring-gray-200 shadow-sm"/>}
                                                </div>

                                                <div className={bloqueado ? 'opacity-80' : ''}>
                                                    <p className="font-bold text-gray-800">{hab.nombre}</p>
                                                    <p className="text-xs text-gray-500 line-clamp-2">{hab.descripcion}</p>
                                                </div>
                                            </div>
                                            
                                            {/* Sección expandible de actividades */}
                                            {seleccionado && (
                                                <div className="mt-auto pt-3 border-t border-purple-200/50">
                                                    <p className="text-[10px] font-bold text-purple-700 mb-2 uppercase tracking-wide">Actividades:</p>
                                                    <ul className="space-y-1.5 mb-3">
                                                        {(actividadesPorHabilidad[hab.id] || []).map((act, idx) => (
                                                            <li key={idx} className="flex justify-between items-start bg-white p-2 rounded border border-purple-100 text-xs text-gray-700">
                                                                <span className="flex-1 break-words">• {act}</span>
                                                                <button onClick={() => eliminarActividad(hab.id, idx)} className="ml-2 text-red-400 hover:text-red-600 shrink-0"><TrashIcon className="h-3.5 w-3.5"/></button>
                                                            </li>
                                                        ))}
                                                        {(actividadesPorHabilidad[hab.id] || []).length === 0 && <li className="text-xs text-gray-400 italic">Sin actividades.</li>}
                                                    </ul>
                                                    <div className="flex gap-1 items-end">
                                                        <div className="flex-1 min-w-0">
                                                            <CustomSelect label="" placeholder="Actividad..." options={opcionesActividades} value={habilidadParaActividad === hab.id ? nuevaActividad : ''} onChange={(val) => { setHabilidadParaActividad(hab.id); setNuevaActividad(val); }} icon={ListBulletIcon} />
                                                        </div>
                                                        <button onClick={() => agregarActividad(hab.id)} className="bg-purple-600 text-white px-2 py-2.5 rounded-lg hover:bg-purple-700 transition shadow-sm h-[42px]" title="Agregar"><PlusIcon className="h-5 w-5"/></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            
                            {/* Mensaje vacío */}
                            {form.parcial === '2' && catalogoHabilidades.filter(hab => habilidadesSeleccionadas.includes(Number(hab.id))).length === 0 && (
                                <div className="col-span-1 md:col-span-2 p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                                    <p className="text-gray-400 text-sm">No se encontraron habilidades del Primer Parcial para dar continuidad.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                            <button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 transform active:scale-95 transition">
                                <CheckBadgeIcon className="h-6 w-6"/> {esEdicion ? 'Actualizar Planificación' : 'Guardar Planificación'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlanificacionDocente;