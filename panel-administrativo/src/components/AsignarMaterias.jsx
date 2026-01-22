import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import CustomSelect from './ui/CustomSelect'; 
import { 
    UserIcon, BookOpenIcon, TrashIcon, PlusIcon, AcademicCapIcon,
    MagnifyingGlassIcon, CalendarDaysIcon, Squares2X2Icon,
    XMarkIcon, PencilSquareIcon, FunnelIcon, ClockIcon, CheckIcon, ExclamationTriangleIcon,
    ComputerDesktopIcon
} from '@heroicons/react/24/outline';

const AsignarMaterias = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // --- ESTADOS ---
    const [asignaciones, setAsignaciones] = useState([]);
    const [docentes, setDocentes] = useState([]);
    const [materias, setMaterias] = useState([]);
    const [periodos, setPeriodos] = useState([]); 
    const [carreras, setCarreras] = useState([]);
    const [ciclos, setCiclos] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [periodoActivo, setPeriodoActivo] = useState(null);
    
    // ESTADO DE GESTIÓN
    const [docenteGestionado, setDocenteGestionado] = useState(null);
    const [asignacionesEdicion, setAsignacionesEdicion] = useState([]);

    // --- FILTROS DE TABLA ---
    const [busqueda, setBusqueda] = useState('');
    const [filtroCiclo, setFiltroCiclo] = useState('');
    const [filtroCarrera, setFiltroCarrera] = useState('');
    const [filtroPeriodo, setFiltroPeriodo] = useState('');

    // --- FORMULARIO ---
    const initialFormState = {
        docente_id: '',
        asignatura_id: '',
        paralelo: 'A',
        periodo_id: '', 
        carrera_id: '', 
        ciclo_id: ''    
    };
    const [form, setForm] = useState(initialFormState);

    useEffect(() => {
        fetchData();
    }, []);

    // --- DETECCIÓN INTELIGENTE DEL PERIODO ACTIVO ---
    useEffect(() => {
        if (!loading && periodos.length > 0) {
            const activo = periodos.find(p => p.activo === 1 || p.activo === true);
            
            if (activo) {
                setPeriodoActivo(activo);
                if (!docenteGestionado) {
                    setForm(prev => ({ ...prev, periodo_id: activo.nombre }));
                    setFiltroPeriodo(activo.nombre); 
                }
            } else {
                setPeriodoActivo(null);
                setForm(prev => ({ ...prev, periodo_id: '' }));
            }
        }
    }, [periodos, loading, docenteGestionado]);

    // --- AUTO-SELECCIÓN DE CARRERA SI ES COORDINADOR ---
    useEffect(() => {
        if (carreras.length === 1) {
            // Si la API solo devolvió una carrera (porque es coordinador), la seleccionamos por defecto
            setForm(prev => ({ ...prev, carrera_id: carreras[0].id }));
            // También podemos bloquear el filtro de tabla
            setFiltroCarrera(carreras[0].nombre); 
        }
    }, [carreras]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resAsig, resAux, resPeriodos, resCarreras, resCiclos] = await Promise.all([
                api.get('/asignaciones'),
                api.get('/asignaciones/auxiliares'),
                api.get('/periodos'), 
                api.get('/carreras'), // Esto ya viene filtrado por el backend si es coordinador
                api.get('/ciclos')    
            ]);

            setAsignaciones(resAsig.data);
            setDocentes(resAux.data.docentes);
            setMaterias(resAux.data.asignaturas); // Esto también viene filtrado
            setPeriodos(Array.isArray(resPeriodos.data) ? resPeriodos.data : []);
            setCarreras(resCarreras.data);
            setCiclos(resCiclos.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const limpiarFecha = (fecha) => {
        if (!fecha) return '';
        return fecha.toString().split('T')[0].split(' ')[0];
    };

    const getDetallesPeriodo = (nombrePeriodo) => {
        const periodoEncontrado = periodos.find(p => p.nombre === nombrePeriodo);
        if (!periodoEncontrado) return null;
        return {
            inicio: limpiarFecha(periodoEncontrado.fecha_inicio),
            fin: limpiarFecha(periodoEncontrado.fecha_fin)
        };
    };

    // --- LÓGICA DE MATERIAS DISPONIBLES (FILTRADO MEJORADO) ---
    const materiasDisponibles = materias.filter(materia => {
        // Filtro por carrera del formulario
        if (form.carrera_id && String(materia.carrera_id) !== String(form.carrera_id)) return false;
        
        // Filtro por ciclo del formulario
        if (form.ciclo_id && String(materia.ciclo_id) !== String(form.ciclo_id)) return false;

        // Filtro de disponibilidad (si ya está asignada en este periodo)
        if (!form.periodo_id) return true;
        const estaOcupada = asignaciones.some(asignacion => 
            asignacion.asignatura_id === materia.id && 
            asignacion.periodo === form.periodo_id && 
            asignacion.paralelo === form.paralelo
        );
        return !estaOcupada;
    });

    const iniciarGestion = (docente, susAsignaciones) => {
        setDocenteGestionado(docente);
        setAsignacionesEdicion(JSON.parse(JSON.stringify(susAsignaciones))); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarGestion = () => {
        setDocenteGestionado(null);
        setAsignacionesEdicion([]);
        if (periodoActivo) {
            setForm(prev => ({ ...prev, periodo_id: periodoActivo.nombre }));
        }
    };

    const handleChangeEdicion = (idAsignacion, campo, valor) => {
        setAsignacionesEdicion(prev => prev.map(item => 
            item.id === idAsignacion ? { ...item, [campo]: valor } : item
        ));
    };

    const handleUpdateFila = async (asignacionEditada) => {
        try {
            await api.put(`/asignaciones/${asignacionEditada.id}`, {
                docente_id: asignacionEditada.docente_id,
                asignatura_id: asignacionEditada.asignatura_id,
                paralelo: asignacionEditada.paralelo,
                periodo: asignacionEditada.periodo
            });
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            Toast.fire({ icon: 'success', title: 'Actualizado' });
            fetchData();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Conflicto de horario', 'error');
        }
    };

    const handleGuardarNuevo = async (e) => {
        e.preventDefault();
        if(!periodoActivo) return Swal.fire('Error', 'No hay un periodo activo.', 'error');
        
        if(!form.docente_id || !form.asignatura_id || !form.periodo_id) {
            return Swal.fire('Atención', 'Complete todos los campos.', 'warning');
        }
        try {
            await api.post('/asignaciones', { ...form, periodo: form.periodo_id });
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            Toast.fire({ icon: 'success', title: 'Asignado' });
            fetchData();
            
            // RESET INTELIGENTE
            // Mantenemos periodo y carrera (si es coord)
            setForm(prev => ({ 
                ...initialFormState, 
                periodo_id: periodoActivo.nombre,
                carrera_id: carreras.length === 1 ? carreras[0].id : '' // Mantiene carrera si es única
            }));

        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Error al procesar', 'error');
        }
    };

    const handleEliminar = (id) => {
        Swal.fire({
            title: '¿Quitar materia?', text: "Se eliminará esta asignación.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Sí, quitar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/asignaciones/${id}`);
                    fetchData();
                    if(docenteGestionado) setAsignacionesEdicion(prev => prev.filter(a => a.id !== id));
                    Swal.fire('Eliminado', '', 'success');
                } catch (error) { Swal.fire('Error', 'No se pudo eliminar.', 'error'); }
            }
        });
    };

    // --- FILTROS VISUALES ---
    const asignacionesFiltradas = asignaciones.filter(item => {
        const term = busqueda.toLowerCase();
        
        const nombreDocente = `${item.docente?.nombres || ''} ${item.docente?.apellidos || ''}`.toLowerCase();
        const nombreMateria = (item.asignatura?.nombre || '').toLowerCase();
        const matchBusqueda = nombreDocente.includes(term) || nombreMateria.includes(term);
        
        const cicloItem = String(item.asignatura?.ciclo?.nombre || '').toLowerCase();
        const matchCiclo = filtroCiclo ? cicloItem === String(filtroCiclo).toLowerCase() : true;

        const carreraItem = String(item.asignatura?.carrera?.nombre || '').toLowerCase().trim();
        const matchCarrera = filtroCarrera ? carreraItem === String(filtroCarrera).toLowerCase().trim() : true;

        const periodoItem = String(item.periodo || '').toLowerCase();
        const matchPeriodo = filtroPeriodo ? periodoItem.includes(String(filtroPeriodo).toLowerCase()) : true;

        return matchBusqueda && matchCiclo && matchCarrera && matchPeriodo;
    });

    const docentesAgrupados = asignacionesFiltradas.reduce((acc, curr) => {
        const docId = curr.docente_id;
        if (!acc[docId]) acc[docId] = { docente: curr.docente, asignaciones: [] };
        acc[docId].asignaciones.push(curr);
        return acc;
    }, {});
    const listaVisual = Object.values(docentesAgrupados);
    const getInitials = (n) => n ? n.charAt(0).toUpperCase() : '?';

    // --- OPCIONES PARA FORMULARIO ---
    const opcionesDocentes = docentes.map(d => ({ value: d.id, label: `${d.apellidos} ${d.nombres}`, subtext: d.email }));
    const opcionesCarreras = carreras.map(c => ({ value: c.id, label: c.nombre }));
    const opcionesCiclos = ciclos.map(c => ({ value: c.id, label: c.nombre }));
    const opcionesMaterias = materiasDisponibles.map(m => ({ 
        value: m.id, 
        label: m.nombre, 
        subtext: `${m.carrera?.nombre || 'N/A'} - Ciclo ${m.ciclo?.nombre || 'N/A'}` 
    }));
    
    const opcionesPeriodosForm = periodos.map(p => ({ value: p.nombre, label: p.nombre, subtext: p.activo ? 'Activo' : '' }));
    const opcionesParalelos = [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }];

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpenIcon className="h-7 w-7 text-blue-600"/> Gestión de Carga Académica
            </h2>

            {/* FORMULARIO */}
            <div className={`p-6 rounded-2xl shadow-sm border transition-all duration-300 ${docenteGestionado ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-gray-100'}`}>
                <div className="flex justify-between items-center mb-4 border-b border-blue-100 pb-2">
                    <h3 className={`font-bold flex items-center gap-2 ${docenteGestionado ? 'text-blue-900' : 'text-blue-800'}`}>
                        {docenteGestionado ? (
                            <><PencilSquareIcon className="h-5 w-5"/> Editando carga de: {docenteGestionado.apellidos} {docenteGestionado.nombres}</>
                        ) : (
                            <><PlusIcon className="h-5 w-5"/> Nueva Asignación</>
                        )}
                    </h3>
                    {docenteGestionado && (
                        <button onClick={cancelarGestion} className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 font-bold bg-white px-3 py-1.5 rounded border border-gray-200 hover:border-red-300 transition shadow-sm">
                            <XMarkIcon className="h-4 w-4"/> Finalizar Edición
                        </button>
                    )}
                </div>

                {docenteGestionado ? (
                    /* MODO GESTIÓN */
                    <div className="space-y-3">
                        <p className="text-xs text-blue-600 mb-2 italic">Modifique el periodo o paralelo y guarde los cambios en cada fila.</p>
                        <div className="grid grid-cols-1 gap-2">
                            {asignacionesEdicion.length === 0 ? (
                                <p className="text-center text-sm text-gray-400 py-4">Este docente no tiene materias asignadas.</p>
                            ) : (
                                asignacionesEdicion.map((item) => (
                                    <div key={item.id} className="bg-white p-3 rounded-xl border border-blue-100 flex flex-col md:flex-row gap-3 items-center shadow-sm">
                                        <div className="flex-1 w-full">
                                            <span className="text-xs font-bold text-gray-400 uppercase">Materia</span>
                                            <div className="font-bold text-gray-800 text-sm flex items-center gap-1">
                                                <AcademicCapIcon className="h-4 w-4 text-blue-500"/>
                                                {item.asignatura?.nombre}
                                            </div>
                                        </div>
                                        <div className="w-full md:w-1/3">
                                            <span className="text-xs font-bold text-gray-400 uppercase">Periodo</span>
                                            <select className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 bg-gray-50 p-2" value={item.periodo} onChange={(e) => handleChangeEdicion(item.id, 'periodo', e.target.value)}>
                                                {opcionesPeriodosForm.map(op => (<option key={op.value} value={op.value}>{op.label}</option>))}
                                            </select>
                                        </div>
                                        <div className="w-full md:w-1/6">
                                            <span className="text-xs font-bold text-gray-400 uppercase">Paralelo</span>
                                            <select className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 bg-gray-50 p-2" value={item.paralelo} onChange={(e) => handleChangeEdicion(item.id, 'paralelo', e.target.value)}>
                                                <option value="A">A</option><option value="B">B</option>
                                            </select>
                                        </div>
                                        <div className="w-full md:w-auto flex justify-end mt-4 md:mt-0">
                                            <button onClick={() => handleUpdateFila(item)} className="bg-red-600 text-white hover:bg-red-700 p-2 rounded-lg transition flex items-center gap-1 text-xs font-bold shadow-md">
                                                <CheckIcon className="h-5 w-5"/> Actualizar
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    /* MODO NUEVO */
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Periodo (Automático)</label>
                            <div className={`flex items-center gap-2 w-full border rounded-lg p-2.5 cursor-not-allowed ${periodoActivo ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                <CalendarDaysIcon className="h-5 w-5"/>
                                <span className="text-sm font-medium">
                                    {loading ? 'Cargando...' : (periodoActivo ? periodoActivo.nombre : 'Sin Periodo Activo')}
                                </span>
                            </div>
                        </div>
                        <div className="md:col-span-4">
                            <CustomSelect label="Docente" icon={UserIcon} placeholder="Buscar..." options={opcionesDocentes} value={form.docente_id} onChange={(val) => setForm({...form, docente_id: val})} searchable={true} disabled={!periodoActivo} />
                        </div>
                        <div className="md:col-span-2">
                            <CustomSelect label="Paralelo" icon={Squares2X2Icon} options={opcionesParalelos} value={form.paralelo} onChange={(val) => setForm({...form, paralelo: val})} disabled={!periodoActivo} />
                        </div>
                        <div className="md:col-span-3">
                            {/* CARRERA CON AUTO-BLOQUEO SI ES UNICA */}
                            <CustomSelect 
                                label="Carrera" 
                                icon={ComputerDesktopIcon} 
                                placeholder="Filtrar..." 
                                options={opcionesCarreras} 
                                value={form.carrera_id} 
                                onChange={(val) => setForm({...form, carrera_id: val})} 
                                disabled={!periodoActivo || carreras.length === 1} // Se bloquea si solo hay una (coordinador)
                            />
                        </div>
                        <div className="md:col-span-2">
                            <CustomSelect label="Ciclo" icon={FunnelIcon} placeholder="Filtrar..." options={opcionesCiclos} value={form.ciclo_id} onChange={(val) => setForm({...form, ciclo_id: val})} disabled={!periodoActivo} />
                        </div>
                        <div className="md:col-span-7">
                            <CustomSelect 
                                label={`Asignatura (${opcionesMaterias.length} Disp.)`} 
                                icon={BookOpenIcon} 
                                placeholder={(!form.carrera_id && !form.ciclo_id) ? "Filtre para ver materias" : "Seleccione materia..."} 
                                options={opcionesMaterias} 
                                value={form.asignatura_id} 
                                onChange={(val) => setForm({...form, asignatura_id: val})} 
                                searchable={true} 
                                disabled={!periodoActivo || opcionesMaterias.length === 0} 
                            />
                        </div>
                        <div className="md:col-span-3 flex justify-end mt-2">
                            <button onClick={handleGuardarNuevo} disabled={!periodoActivo || !form.asignatura_id || !form.docente_id} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {periodoActivo ? <><PlusIcon className="h-5 w-5"/> Asignar</> : <><ExclamationTriangleIcon className="h-5 w-5"/> Periodo Inactivo</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* TABLA Y FILTROS INFERIORES */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input type="text" className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Buscar por docente o materia..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                    <select className="h-[42px] pl-3 pr-8 rounded-xl border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-blue-100 outline-none" value={filtroCiclo} onChange={(e) => setFiltroCiclo(e.target.value)}>
                        <option value="">Todos los Ciclos</option>
                        {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'].map(c => <option key={c} value={c}>Ciclo {c}</option>)}
                    </select>
                    
                    {/* FILTRO CARRERA (Oculto si es coordinador específico) */}
                    {carreras.length > 1 && (
                        <select className="h-[42px] pl-3 pr-8 rounded-xl border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-blue-100 outline-none" value={filtroCarrera} onChange={(e) => setFiltroCarrera(e.target.value)}>
                            <option value="">Todas las Carreras</option>
                            {['Software', 'TI'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    )}
                </div>
                {(busqueda || filtroCiclo || filtroCarrera || filtroPeriodo) && (
                    <button onClick={() => { setBusqueda(''); setFiltroCiclo(''); setFiltroCarrera(''); setFiltroPeriodo(''); }} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl font-medium transition border border-red-200 bg-white whitespace-nowrap">
                        Limpiar
                    </button>
                )}
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase w-3/12">Docente</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase w-5/12">Carga Académica (Lista)</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase w-2/12">Periodo Académico</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase w-2/12">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {loading ? <tr><td colSpan="4" className="text-center py-10 text-gray-400">Cargando...</td></tr> : 
                         listaVisual.length === 0 ? <tr><td colSpan="4" className="text-center py-12 text-gray-400"><FunnelIcon className="h-10 w-10 mx-auto mb-2 opacity-20"/> Sin resultados.</td></tr> :
                         listaVisual.map((grupo) => {
                             const periodosDelDocente = [...new Set(grupo.asignaciones.map(a => a.periodo))];
                             return (
                                <tr key={grupo.docente?.id} className={`hover:bg-gray-50 transition group ${docenteGestionado?.id === grupo.docente?.id ? 'bg-blue-50/30' : ''}`}>
                                    <td className="px-6 py-6 align-top border-r border-dashed border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border shadow-sm ${docenteGestionado?.id === grupo.docente?.id ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                {getInitials(grupo.docente?.nombres)}
                                            </div>
                                            <div>
                                                <span className="text-sm font-bold text-gray-900 block">{grupo.docente?.apellidos} {grupo.docente?.nombres}</span>
                                                <span className="text-xs text-gray-500 block mt-0.5">{grupo.docente?.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4 align-top">
                                        <ul className="space-y-1">
                                            {grupo.asignaciones.map(asig => (
                                                <li key={asig.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-blue-50/50 border border-transparent hover:border-blue-100 transition group/item">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                                            <div className="h-1.5 w-1.5 bg-blue-500 rounded-full"></div>
                                                            {asig.asignatura?.nombre}
                                                        </span>
                                                        <div className="text-[11px] text-gray-500 pl-3.5 mt-0.5 flex flex-wrap gap-x-2">
                                                            <span>{asig.asignatura?.carrera?.nombre || 'N/A'}</span>
                                                            <span className="text-gray-300">|</span>
                                                            <span>Ciclo {asig.asignatura?.ciclo?.nombre || 'N/A'}</span>
                                                            <span className="text-gray-300">|</span>
                                                            <span className="text-blue-600 font-semibold">Paralelo "{asig.paralelo}"</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleEliminar(asig.id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition opacity-0 group-hover/item:opacity-100" title="Quitar materia">
                                                        <TrashIcon className="h-4 w-4"/>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </td>

                                    <td className="px-6 py-4 align-top">
                                        <div className="flex flex-col gap-2">
                                            {periodosDelDocente.map(nombrePeriodo => {
                                                const detalles = getDetallesPeriodo(nombrePeriodo);
                                                return (
                                                    <div key={nombrePeriodo} className="text-xs bg-gray-50 border border-gray-200 rounded p-2">
                                                        <strong className="block text-gray-700 mb-1">{nombrePeriodo}</strong>
                                                        {detalles ? (
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                                <ClockIcon className="h-3 w-3"/>
                                                                {detalles.inicio} / {detalles.fin}
                                                            </div>
                                                        ) : <span className="text-[10px] text-gray-400">Sin fechas</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 align-top text-right">
                                        <button onClick={() => iniciarGestion(grupo.docente, grupo.asignaciones)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm border ${docenteGestionado?.id === grupo.docente?.id ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600'}`}>
                                            <PencilSquareIcon className="h-4 w-4"/> {docenteGestionado?.id === grupo.docente?.id ? 'Editando...' : 'Editar'}
                                        </button>
                                    </td>
                                </tr>
                             );
                         })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AsignarMaterias;