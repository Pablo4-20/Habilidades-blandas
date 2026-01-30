import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import CustomSelect from './ui/CustomSelect';
import { 
    BookOpenIcon, SparklesIcon, 
    CheckBadgeIcon, CalendarDaysIcon, ClockIcon, 
    CheckCircleIcon, TrashIcon, ListBulletIcon, LockClosedIcon,
    PencilSquareIcon, CheckIcon,
    ChevronLeftIcon, ChevronRightIcon // Iconos para la paginación
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
    
    // Resultados de aprendizaje
    const [resultadosAprendizaje, setResultadosAprendizaje] = useState({}); 

    const [esEdicion, setEsEdicion] = useState(false);

    // Estado para agregar nueva actividad
    const [nuevaActividad, setNuevaActividad] = useState(''); 
    const [habilidadParaActividad, setHabilidadParaActividad] = useState(null);

    // --- NUEVO ESTADO PARA PAGINACIÓN (Actualizado a 6 items) ---
    const [paginaActual, setPaginaActual] = useState(1);
    const ITEMS_POR_PAGINA = 6; // Se muestran 6 tarjetas por página (2 columnas x 3 filas)

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
            setPaginaActual(1); // Resetear página al cambiar filtros
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
        setHabilidadesSeleccionadas([]);
        setActividadesPorHabilidad({});
        setResultadosAprendizaje({});

        try {
            const res = await api.get(`/planificaciones/verificar/${form.asignatura_id}`, {
                params: { parcial: form.parcial, periodo: form.periodo_academico }
            });

            if (res.data.tiene_asignacion) {
                setCatalogoHabilidades(res.data.habilidades || []);
                
                if (res.data.es_edicion) {
                    setEsEdicion(true);
                    let seleccionadas = (res.data.habilidades_seleccionadas || []).map(id => Number(id));
                    const resultadosGuardados = res.data.resultados_guardados || {}; 

                    if (form.parcial === '2' && res.data.habilidades_p1 && res.data.habilidades_p1.length > 0) {
                        const idsP1 = res.data.habilidades_p1.map(id => Number(id));
                        const nuevaSeleccion = idsP1;
                        seleccionadas = nuevaSeleccion;

                        const actividadesLimpias = {};
                        const resultadosLimpios = {};

                        seleccionadas.forEach(id => {
                            if (res.data.actividades_guardadas && res.data.actividades_guardadas[id]) {
                                actividadesLimpias[id] = res.data.actividades_guardadas[id];
                            }
                            if (resultadosGuardados[id]) {
                                resultadosLimpios[id] = resultadosGuardados[id];
                            }
                        });
                        setActividadesPorHabilidad(actividadesLimpias);
                        setResultadosAprendizaje(resultadosLimpios);
                    } else {
                        setActividadesPorHabilidad(res.data.actividades_guardadas || {});
                        setResultadosAprendizaje(resultadosGuardados);
                    }
                    setHabilidadesSeleccionadas(seleccionadas);
                } else if (form.parcial === '2') {
                    const idsDelP1 = (res.data.habilidades_p1 || []).map(id => Number(id));
                    if (idsDelP1.length > 0) {
                        setEsEdicion(false); 
                        setHabilidadesSeleccionadas(idsDelP1);
                        setActividadesPorHabilidad({}); 
                        setResultadosAprendizaje({});
                        Swal.mixin({toast: true, position: 'top-end', timer: 3000, showConfirmButton: false})
                            .fire({icon: 'success', title: 'Habilidades del P1 cargadas. Defina los Resultados de Aprendizaje del 2do Parcial.'});
                    } else {
                        setEsEdicion(false);
                    }
                } else {
                    setEsEdicion(false);
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
        if (form.parcial === '2') return;
        const idNum = Number(id);
        setHabilidadesSeleccionadas(prev => {
            if (prev.includes(idNum)) {
                const newState = prev.filter(h => h !== idNum);
                const nuevasActividades = { ...actividadesPorHabilidad };
                delete nuevasActividades[idNum];
                setActividadesPorHabilidad(nuevasActividades);
                const nuevosResultados = { ...resultadosAprendizaje };
                delete nuevosResultados[idNum];
                setResultadosAprendizaje(nuevosResultados);
                return newState;
            } else {
                return [...prev, idNum];
            }
        });
    };

    const handleResultadoChange = (habilidadId, texto) => {
        setResultadosAprendizaje(prev => ({
            ...prev,
            [habilidadId]: texto
        }));
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
            const nombreHab = catalogoHabilidades.find(h => h.id === id)?.nombre;
            if (!resultadosAprendizaje[id] || resultadosAprendizaje[id].trim().length < 5) {
                return Swal.fire('Información Incompleta', `Debes definir un Resultado de Aprendizaje válido para: ${nombreHab}`, 'warning');
            }
            if (!actividadesPorHabilidad[id] || actividadesPorHabilidad[id].length === 0) {
                return Swal.fire('Faltan actividades', `Selecciona actividades para: ${nombreHab}`, 'warning');
            }
        }

        const user = JSON.parse(localStorage.getItem('user'));
        const detalles = habilidadesSeleccionadas.map(id => ({
            habilidad_blanda_id: id,
            actividades: actividadesPorHabilidad[id],
            resultado_aprendizaje: resultadosAprendizaje[id] 
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
                text: `Planificación guardada correctamente.`,
                returnFocus: false 
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            cargarPlanificacion();
            api.get('/docente/asignaturas').then(res => setMisAsignaturas(res.data));
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar la planificación.', 'error');
        }
    };

    // --- LÓGICA DE PAGINACIÓN ---
    // 1. Filtrar habilidades según el parcial
    const habilidadesFiltradas = catalogoHabilidades.filter(hab => {
        if (form.parcial === '2') return habilidadesSeleccionadas.includes(Number(hab.id));
        return true;
    });

    // 2. Calcular índices
    const indiceUltimoItem = paginaActual * ITEMS_POR_PAGINA;
    const indicePrimerItem = indiceUltimoItem - ITEMS_POR_PAGINA;
    const habilidadesPaginadas = habilidadesFiltradas.slice(indicePrimerItem, indiceUltimoItem);
    const totalPaginas = Math.ceil(habilidadesFiltradas.length / ITEMS_POR_PAGINA);

    // 3. Handlers de página
    const siguientePagina = () => setPaginaActual(prev => Math.min(prev + 1, totalPaginas));
    const anteriorPagina = () => setPaginaActual(prev => Math.max(prev - 1, 1));

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

                {/* LISTA DE HABILIDADES CON PAGINACIÓN */}
                {form.asignatura_id && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                                <SparklesIcon className="h-6 w-6 text-purple-600"/> 
                                {form.parcial === '2' ? 'Habilidades Continuas (2do Parcial)' : 'Selecciona las Habilidades (1er Parcial)'}
                            </h3>
                            <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                                Página {paginaActual} de {totalPaginas || 1}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            {habilidadesPaginadas.map(hab => {
                                    const seleccionado = habilidadesSeleccionadas.includes(Number(hab.id));
                                    const opcionesActividades = getOpcionesActividades(hab.id);
                                    const bloqueado = form.parcial === '2'; 

                                    return (
                                        <div key={hab.id} className={`border rounded-2xl p-6 transition-all flex flex-col shadow-sm hover:shadow-md ${seleccionado ? (bloqueado ? 'border-gray-300 bg-gray-50' : 'border-purple-500 bg-purple-50/30') : 'border-gray-200 bg-white'}`}>
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="relative flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={seleccionado} 
                                                        onChange={() => toggleHabilidad(hab.id)} 
                                                        disabled={bloqueado} 
                                                        className={`w-6 h-6 rounded focus:ring-purple-500 ${bloqueado ? 'text-gray-400 cursor-not-allowed bg-gray-200 border-gray-300' : 'text-purple-600 cursor-pointer'}`}
                                                    />
                                                    {bloqueado && seleccionado && <LockClosedIcon className="h-4 w-4 text-gray-500 absolute -top-1.5 -right-1.5 bg-white rounded-full ring-1 ring-gray-200 shadow-sm"/>}
                                                </div>

                                                <div className={bloqueado ? 'opacity-80' : ''}>
                                                    <p className="font-bold text-gray-900 text-lg">{hab.nombre}</p>
                                                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">{hab.descripcion}</p>
                                                </div>
                                            </div>
                                            
                                            {/* SECCIÓN EXPANDIBLE */}
                                            {seleccionado && (
                                                <div className="mt-auto pt-4 border-t border-purple-200/50">
                                                    
                                                    {/* CAMPO DE RESULTADO DE APRENDIZAJE */}
                                                    <div className="mb-5 bg-white p-4 rounded-xl border border-purple-100 shadow-sm group-focus-within:ring-2 ring-purple-100 transition-all">
                                                        <label className="text-xs font-bold text-purple-700 uppercase tracking-wide flex items-center gap-1 mb-2">
                                                            <PencilSquareIcon className="h-4 w-4"/> Resultado de Aprendizaje ({form.parcial === '1' ? '1er P.' : '2do P.'})
                                                        </label>
                                                        <textarea 
                                                            rows="3"
                                                            className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none resize-none bg-gray-50 focus:bg-white transition-all placeholder:text-gray-300"
                                                            placeholder={`Defina el resultado esperado para el ${form.parcial}º Parcial...`}
                                                            value={resultadosAprendizaje[hab.id] || ''}
                                                            onChange={(e) => handleResultadoChange(hab.id, e.target.value)}
                                                        />
                                                    </div>

                                                    <p className="text-xs font-bold text-purple-700 mb-3 uppercase tracking-wide">Actividades:</p>
                                                    <ul className="space-y-2 mb-4">
                                                        {(actividadesPorHabilidad[hab.id] || []).map((act, idx) => (
                                                            <li key={idx} className="flex justify-between items-start bg-white p-3 rounded-lg border border-purple-100 text-sm text-gray-700 shadow-sm">
                                                                <span className="flex-1 break-words">• {act}</span>
                                                                <button onClick={() => eliminarActividad(hab.id, idx)} className="ml-2 text-red-400 hover:text-red-600 shrink-0"><TrashIcon className="h-4 w-4"/></button>
                                                            </li>
                                                        ))}
                                                        {(actividadesPorHabilidad[hab.id] || []).length === 0 && <li className="text-sm text-gray-400 italic">Sin actividades asignadas.</li>}
                                                    </ul>
                                                    <div className="flex gap-2 items-end">
                                                        <div className="flex-1 min-w-0">
                                                            <CustomSelect 
                                                                label="" 
                                                                placeholder="Buscar actividad..." 
                                                                options={opcionesActividades} 
                                                                value={habilidadParaActividad === hab.id ? nuevaActividad : ''} 
                                                                onChange={(val) => { setHabilidadParaActividad(hab.id); setNuevaActividad(val); }} 
                                                                icon={ListBulletIcon} 
                                                                searchable={true} 
                                                            />
                                                        </div>
                                                        <button onClick={() => agregarActividad(hab.id)} className="bg-purple-600 text-white px-3 py-2.5 rounded-lg hover:bg-purple-700 transition shadow-sm h-[42px]" title="Agregar">
                                                            <CheckIcon className="h-6 w-6"/>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            
                            {/* Mensaje vacío */}
                            {habilidadesFiltradas.length === 0 && (
                                <div className="col-span-1 md:col-span-2 p-10 text-center border-2 border-dashed border-gray-200 rounded-xl">
                                    <p className="text-gray-500 text-base">
                                        {form.parcial === '2' 
                                            ? "No se encontraron habilidades del Primer Parcial para dar continuidad."
                                            : "No hay habilidades disponibles en el catálogo."}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* CONTROLES DE PAGINACIÓN */}
                        {habilidadesFiltradas.length > ITEMS_POR_PAGINA && (
                            <div className="mt-8 flex justify-center items-center gap-4">
                                <button 
                                    onClick={anteriorPagina} 
                                    disabled={paginaActual === 1}
                                    className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition ${paginaActual === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm'}`}
                                >
                                    <ChevronLeftIcon className="h-4 w-4"/> Anterior
                                </button>
                                <span className="text-gray-600 font-medium">
                                    Página {paginaActual} de {totalPaginas}
                                </span>
                                <button 
                                    onClick={siguientePagina} 
                                    disabled={paginaActual === totalPaginas}
                                    className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition ${paginaActual === totalPaginas ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm'}`}
                                >
                                    Siguiente <ChevronRightIcon className="h-4 w-4"/>
                                </button>
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                            <button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 transform active:scale-95 transition text-lg">
                                <CheckBadgeIcon className="h-7 w-7"/> {esEdicion ? 'Actualizar Planificación' : 'Guardar Planificación'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlanificacionDocente;