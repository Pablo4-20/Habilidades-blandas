import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { 
    BookOpenIcon, UserGroupIcon, FolderIcon, FolderOpenIcon, 
    ChevronRightIcon, MagnifyingGlassIcon, ClipboardDocumentListIcon, UserPlusIcon
} from '@heroicons/react/24/outline';

const MisCursos = () => {
    const [periodoNombre, setPeriodoNombre] = useState('');
    const [menuCursos, setMenuCursos] = useState([]);
    const [estudiantes, setEstudiantes] = useState([]);
    const [cicloAbierto, setCicloAbierto] = useState(null);
    const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        api.get('/docente/mis-cursos')
            .then(res => {
                setPeriodoNombre(res.data.periodo);
                setMenuCursos(res.data.cursos || []);
            }).catch(e => console.error("Error cargando menú", e));
    }, []);

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

    const handleAgregarEstudiante = async () => {
        if (!materiaSeleccionada) return;

        const { value: cedula } = await Swal.fire({
            title: 'Agregar Estudiante (Arrastre)',
            text: 'Ingrese la cédula del estudiante:',
            input: 'text',
            showCancelButton: true,
            confirmButtonText: 'Inscribir',
            confirmButtonColor: '#2563EB',
            inputValidator: (value) => !value && 'Debe ingresar una cédula'
        });

        if (cedula) {
            try {
                await api.post('/docente/agregar-estudiante', {
                    cedula,
                    asignatura_id: materiaSeleccionada.asignatura_id
                });
                Swal.fire('Guardado', 'Estudiante inscrito en esta materia', 'success');
                handleSeleccionarMateria(materiaSeleccionada); // Recargar lista
            } catch (e) {
                Swal.fire('Error', e.response?.data?.message || 'Error al agregar', 'error');
            }
        }
    };

    const filtrados = estudiantes.filter(e => 
        e.nombres.toLowerCase().includes(busqueda.toLowerCase()) || e.cedula.includes(busqueda)
    );

    return (
        <div className="flex h-[calc(100vh-theme(spacing.24))] -m-6 animate-fade-in bg-gray-50">
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
                                    onClick={handleAgregarEstudiante}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition"
                                >
                                    <UserPlusIcon className="h-5 w-5"/> Agregar Alumno
                                </button>
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"/>
                                    <input 
                                        type="text" 
                                        placeholder="Buscar..." 
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
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {loading ? (
                                        <tr><td colSpan="3" className="py-10 text-center text-gray-400">Cargando lista...</td></tr>
                                    ) : filtrados.map((e, i) => (
                                        <tr key={e.id} className="hover:bg-gray-50">
                                            <td className="py-4 text-gray-400 text-sm">{i+1}</td>
                                            <td className="py-4">
                                                <div className="font-bold text-gray-800">{e.nombres}</div>
                                                <div className="text-xs text-gray-500">{e.email}</div>
                                            </td>
                                            <td className="py-4 font-mono text-sm text-gray-600">{e.cedula}</td>
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
        </div>
    );
};
export default MisCursos;