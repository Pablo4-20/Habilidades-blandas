import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { 
    BookOpenIcon, FolderIcon, 
    ChevronRightIcon, MagnifyingGlassIcon, ClipboardDocumentListIcon, UserPlusIcon,
    TrashIcon, XMarkIcon, IdentificationIcon, CheckCircleIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

const MisCursos = () => {
    // Estados principales
    const [periodoNombre, setPeriodoNombre] = useState('');
    const [menuCursos, setMenuCursos] = useState([]);
    const [estudiantes, setEstudiantes] = useState([]);
    const [cicloAbierto, setCicloAbierto] = useState(null);
    const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busqueda, setBusqueda] = useState('');

    // Estados para el Modal
    const [showModal, setShowModal] = useState(false);
    const [listaGlobalEstudiantes, setListaGlobalEstudiantes] = useState([]);
    const [busquedaModal, setBusquedaModal] = useState('');
    const [loadingModal, setLoadingModal] = useState(false);
    const [selectedCedulas, setSelectedCedulas] = useState([]);

    useEffect(() => {
        cargarMenu();
    }, []);

    const cargarMenu = () => {
        api.get('/docente/mis-cursos')
            .then(res => {
                setPeriodoNombre(res.data.periodo);
                setMenuCursos(res.data.cursos || []);
            }).catch(e => console.error("Error cargando menú", e));
    };

    const handleSeleccionarMateria = async (materia) => {
        setMateriaSeleccionada(materia);
        setLoading(true);
        try {
            const res = await api.get(`/docente/curso/${materia.asignatura_id}/estudiantes`);
            setEstudiantes(res.data);
        } catch (e) {
            console.error(e);
            setEstudiantes([]);
            Swal.fire('Error', 'No se pudo cargar la lista de estudiantes', 'error');
        } finally {
            setLoading(false);
        }
    };

    const abrirModalAgregar = async () => {
        if (!materiaSeleccionada) return;
        setShowModal(true);
        setLoadingModal(true);
        setBusquedaModal('');
        setSelectedCedulas([]);
        try {
            const res = await api.get('/estudiantes');
            const estudiantesSoftware = res.data.filter(e => 
                e.carrera && e.carrera.toLowerCase().includes('software')
            );
            setListaGlobalEstudiantes(estudiantesSoftware);
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo cargar el listado global', 'error');
        } finally {
            setLoadingModal(false);
        }
    };

    // 👇 LOGICA DE FILTRADO MEJORADA 👇
    // Muestra SIEMPRE los seleccionados primero + los resultados de la búsqueda
    const estudiantesFiltradosModal = (() => {
        const termino = busquedaModal.toLowerCase();

        // 1. Identificar seleccionados (que no estén ya inscritos en la materia)
        const seleccionados = listaGlobalEstudiantes.filter(e => 
            selectedCedulas.includes(e.cedula) && 
            !estudiantes.some(inscrito => inscrito.cedula === e.cedula)
        );

        // 2. Identificar el resto (filtrados por búsqueda y no seleccionados)
        const resto = listaGlobalEstudiantes.filter(e => {
            // Excluir si ya está inscrito en la materia
            if (estudiantes.some(inscrito => inscrito.cedula === e.cedula)) return false;
            // Excluir si ya está en la lista de seleccionados (para no duplicar visualmente)
            if (selectedCedulas.includes(e.cedula)) return false;

            // Filtro de búsqueda normal
            return (e.nombres + ' ' + e.apellidos).toLowerCase().includes(termino) || 
                   e.cedula.includes(termino);
        });

        // 3. Unir: Seleccionados arriba + Resultados de búsqueda abajo
        return [...seleccionados, ...resto].slice(0, 20);
    })();

    // 👇 CAMBIO CLAVE: LIMPIAR BÚSQUEDA AL SELECCIONAR 👇
    const toggleSeleccion = (cedula) => {
        if (selectedCedulas.includes(cedula)) {
            setSelectedCedulas(prev => prev.filter(c => c !== cedula));
        } else {
            setSelectedCedulas(prev => [...prev, cedula]);
            // Limpiamos el filtro para ver la lista completa (y los seleccionados al inicio)
            setBusquedaModal(''); 
        }
    };

    const inscribirMasivo = async () => {
        if (selectedCedulas.length === 0) return;

        Swal.fire({
            title: 'Inscribiendo...',
            text: `Procesando ${selectedCedulas.length} estudiantes`,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        let exitos = 0;
        let errores = 0;

        await Promise.all(selectedCedulas.map(async (cedula) => {
            try {
                await api.post('/docente/agregar-estudiante', {
                    cedula: cedula,
                    asignatura_id: materiaSeleccionada.asignatura_id
                });
                exitos++;
            } catch (e) {
                errores++;
            }
        }));

        Swal.fire({
            title: errores === 0 ? '¡Éxito Total!' : 'Proceso Finalizado',
            text: `Se inscribieron ${exitos} estudiantes correctamente.${errores > 0 ? ` Fallaron ${errores}.` : ''}`,
            icon: errores === 0 ? 'success' : 'warning'
        });

        handleSeleccionarMateria(materiaSeleccionada);
        setShowModal(false);
    };

    const handleEliminarEstudiante = async (estudianteId) => {
        Swal.fire({
            title: '¿Dar de baja?',
            text: "El estudiante será removido de esta asignatura.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#9CA3AF',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.post('/docente/eliminar-estudiante', {
                        estudiante_id: estudianteId,
                        asignatura_id: materiaSeleccionada.asignatura_id
                    });
                    Swal.fire('Eliminado', 'El estudiante ha sido dado de baja.', 'success');
                    handleSeleccionarMateria(materiaSeleccionada); 
                } catch (e) {
                    Swal.fire('Error', e.response?.data?.message || 'No se pudo dar de baja.', 'error');
                }
            }
        });
    };

    const filtradosListaClase = estudiantes.filter(e => 
        e.nombres.toLowerCase().includes(busqueda.toLowerCase()) || e.cedula.includes(busqueda)
    );

    return (
        <div className="flex h-[calc(100vh-theme(spacing.24))] -m-6 animate-fade-in bg-gray-50 relative">
            {/* SIDEBAR DE CURSOS */}
            <aside className="w-72 bg-white border-r border-gray-200 overflow-y-auto">
                <div className="p-6 border-b">
                    <h2 className="font-bold flex items-center gap-2 text-gray-800">
                        <BookOpenIcon className="h-6 w-6 text-blue-600"/> Mis Clases
                    </h2>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold uppercase mt-2 inline-block">
                        {periodoNombre || 'Cargando...'}
                    </span>
                </div>
                <div className="p-4 space-y-2">
                    {menuCursos.map(grupo => (
                        <div key={grupo.ciclo} className="rounded-xl border border-gray-100 overflow-hidden">
                            <button 
                                onClick={() => setCicloAbierto(cicloAbierto === grupo.ciclo ? null : grupo.ciclo)}
                                className="w-full flex justify-between p-3 text-sm font-bold bg-gray-50 text-gray-700"
                            >
                                <div className="flex gap-2 items-center">
                                    <FolderIcon className="h-5 w-5 text-gray-400"/> Ciclo {grupo.ciclo}
                                </div>
                                <ChevronRightIcon className={`h-4 w-4 transition ${cicloAbierto === grupo.ciclo ? 'rotate-90' : ''}`}/>
                            </button>
                            {cicloAbierto === grupo.ciclo && (
                                <div className="bg-white p-2 space-y-1">
                                    {grupo.materias.map(m => (
                                        <button 
                                            key={m.asignatura_id} 
                                            onClick={() => handleSeleccionarMateria(m)}
                                            className={`w-full text-left p-2 rounded-lg transition ${materiaSeleccionada?.asignatura_id === m.asignatura_id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-50 text-gray-600'}`}
                                        >
                                            <div className="text-xs font-bold truncate">{m.nombre}</div>
                                            <div className={`text-[10px] ${materiaSeleccionada?.asignatura_id === m.asignatura_id ? 'text-blue-100' : 'text-gray-400'}`}>Paralelo {m.paralelo}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </aside>

            {/* CONTENIDO PRINCIPAL */}
            <main className="flex-1 flex flex-col bg-white">
                {materiaSeleccionada ? (
                    <>
                        <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{materiaSeleccionada.nombre}</h1>
                                <p className="text-sm text-gray-500">Oficial: {estudiantes.length} alumnos</p>
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={abrirModalAgregar}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-lg shadow-blue-200"
                                >
                                    <UserPlusIcon className="h-5 w-5"/> Agregar Alumno
                                </button>
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"/>
                                    <input 
                                        type="text" 
                                        placeholder="Buscar en lista..." 
                                        className="pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        onChange={e => setBusqueda(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-8 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-gray-400 text-xs uppercase tracking-wider border-b">
                                        <th className="pb-4 font-bold">#</th>
                                        <th className="pb-4 font-bold">Estudiante</th>
                                        <th className="pb-4 font-bold">Identificación</th>
                                        <th className="pb-4 font-bold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {loading ? (
                                        <tr><td colSpan="4" className="py-10 text-center text-gray-400">Cargando lista...</td></tr>
                                    ) : filtradosListaClase.map((e, i) => (
                                        <tr key={e.id} className="hover:bg-gray-50 group">
                                            <td className="py-4 text-gray-400 text-sm">{i+1}</td>
                                            <td className="py-4">
                                                <div className="font-bold text-gray-800">{e.nombres}</div>
                                                <div className="text-xs text-gray-500">{e.email}</div>
                                            </td>
                                            <td className="py-4 font-mono text-sm text-gray-600">{e.cedula}</td>
                                            <td className="py-4 text-right">
                                                <button 
                                                    onClick={() => handleEliminarEstudiante(e.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                                                    title="Dar de baja de esta materia"
                                                >
                                                    <TrashIcon className="h-5 w-5"/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                        <ClipboardDocumentListIcon className="h-20 w-20 mb-4 opacity-10"/>
                        <p className="text-xl font-medium">Seleccione una asignatura para ver la nómina</p>
                    </div>
                )}
            </main>

            {/* --- MODAL PARA AGREGAR ESTUDIANTE --- */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh]">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Inscribir Estudiantes</h3>
                                <p className="text-xs text-gray-500">Filtrando: <span className="font-bold text-blue-600">Software</span></p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
                                <XMarkIcon className="h-6 w-6"/>
                            </button>
                        </div>

                        {/* Buscador */}
                        <div className="p-6 border-b border-gray-100 shrink-0">
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"/>
                                <input 
                                    type="text" 
                                    placeholder="Buscar por nombre o cédula..." 
                                    autoFocus
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition"
                                    value={busquedaModal}
                                    onChange={e => setBusquedaModal(e.target.value)}
                                />
                                {busquedaModal && (
                                    <button 
                                        onClick={() => setBusquedaModal('')}
                                        className="absolute right-3 top-3 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                    >
                                        <XMarkIcon className="h-4 w-4"/>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Lista de Resultados */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                            {loadingModal ? (
                                <div className="py-10 text-center text-gray-400">Cargando catálogo...</div>
                            ) : estudiantesFiltradosModal.length === 0 ? (
                                <div className="py-10 text-center text-gray-400 flex flex-col items-center">
                                    <div className="bg-gray-100 p-4 rounded-full mb-3">
                                        <UserPlusIcon className="h-8 w-8 text-gray-300"/>
                                    </div>
                                    <p>No se encontraron resultados disponibles.</p>
                                    <p className="text-xs mt-1">Verifique que no estén ya inscritos.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {estudiantesFiltradosModal.map(est => {
                                        const isSelected = selectedCedulas.includes(est.cedula);
                                        return (
                                            <div 
                                                key={est.id} 
                                                onClick={() => toggleSeleccion(est.cedula)}
                                                className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none
                                                    ${isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:bg-white hover:shadow-md'}
                                                `}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`shrink-0 transition-colors ${isSelected ? 'text-blue-600' : 'text-gray-300'}`}>
                                                        {isSelected ? <CheckCircleSolid className="h-6 w-6"/> : <CheckCircleIcon className="h-6 w-6"/>}
                                                    </div>

                                                    <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                        {est.nombres.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className={`font-bold text-sm ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>
                                                            {est.nombres} {est.apellidos}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <IdentificationIcon className="h-3 w-3"/> 
                                                            <span className="font-mono">{est.cedula}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        
                        {/* Footer (Botón de Acción) */}
                        <div className="p-4 bg-white border-t border-gray-100 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <button 
                                onClick={inscribirMasivo}
                                disabled={selectedCedulas.length === 0}
                                className={`w-full py-3.5 rounded-xl font-bold text-white transition flex justify-center items-center gap-2
                                    ${selectedCedulas.length > 0 
                                        ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transform active:scale-[0.98]' 
                                        : 'bg-gray-300 cursor-not-allowed'}
                                `}
                            >
                                <UserPlusIcon className="h-5 w-5"/>
                                {selectedCedulas.length > 0 
                                    ? `Inscribir (${selectedCedulas.length}) Alumnos` 
                                    : 'Seleccione estudiantes para inscribir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default MisCursos;