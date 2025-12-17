import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { 
    MagnifyingGlassIcon, 
    PlusIcon, 
    DocumentTextIcon, 
    TrashIcon,
    PencilSquareIcon,
    UserGroupIcon,
    AcademicCapIcon,
    FunnelIcon,
    CloudArrowUpIcon,
    IdentificationIcon,
    EnvelopeIcon
} from '@heroicons/react/24/outline';

const GestionUsuarios = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    // --- ESTADOS ---
    const [activeTab, setActiveTab] = useState('administrativo');
    const [dataList, setDataList] = useState([]); 
    const [loading, setLoading] = useState(false);
    
    // Edición
    const [editingId, setEditingId] = useState(null); 

    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroRol, setFiltroRol] = useState('');          
    const [filtroCarrera, setFiltroCarrera] = useState('');  
    const [filtroCiclo, setFiltroCiclo] = useState('');      

    // Modales
    const [showModal, setShowModal] = useState(false);       
    const [showImportModal, setShowImportModal] = useState(false); 
    const [fileToUpload, setFileToUpload] = useState(null);  

    // Formularios
    const [formUser, setFormUser] = useState({ 
        cedula: '', nombres: '', apellidos: '', email: '', rol: 'docente', password: '' 
    });
    const [formStudent, setFormStudent] = useState({ 
        cedula: '', nombres: '', apellidos: '', email: '', carrera: 'Software', ciclo_actual: 'I' 
    });

    // --- CARGA DE DATOS ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'administrativo' ? '/users' : '/estudiantes';
            const res = await api.get(endpoint);
            setDataList(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error cargando datos:", error);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    // Efecto inicial y al cambiar pestaña
    useEffect(() => {
        fetchData();
        setBusqueda('');
        setFiltroRol('');
        setFiltroCarrera('');
        setFiltroCiclo('');
    }, [activeTab]);

    const handleTabChange = (tab) => {
        if (tab !== activeTab) {
            setActiveTab(tab);
            setEditingId(null);
        }
    };

    // --- IMPORTAR (SOLUCIÓN ACTUALIZACIÓN) ---
    const handleImportar = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        
        if (!fileToUpload) return Swal.fire('Atención', 'Seleccione un archivo CSV.', 'warning');
        
        const formData = new FormData();
        formData.append('file', fileToUpload);
        
        const endpoint = activeTab === 'administrativo' ? '/users/import' : '/estudiantes/import';
        
        try {
            Swal.fire({
                title: 'Subiendo...',
                text: 'Procesando datos y enviando correos masivos.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const res = await api.post(endpoint, formData, { 
                headers: { 'Content-Type': 'multipart/form-data' } 
            });
            
            Swal.fire('¡Éxito!', res.data.message, 'success');
            
            setShowImportModal(false);
            setFileToUpload(null);
            fetchData();

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Formato incorrecto o datos duplicados.', 'error');
        }
    };

    // --- GUARDAR (AQUÍ ESTÁ LA MEJORA DE CARGA) ---
    const handleGuardar = async (e) => {
        e.preventDefault();
        const baseEndpoint = activeTab === 'administrativo' ? '/users' : '/estudiantes';
        const payload = activeTab === 'administrativo' ? formUser : formStudent;

        if (payload.cedula.length !== 10) return Swal.fire('Error', 'La cédula debe tener 10 dígitos.', 'warning');

        // 1. Mostrar alerta de "Guardando..."
        Swal.fire({
            title: editingId ? 'Actualizando...' : 'Creando Usuario...',
            text: editingId 
                ? 'Guardando cambios en la base de datos.' 
                : 'Registrando y enviando correo de verificacion. Por favor espere.',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading(); // Muestra el spinner
            }
        });

        try {
            if (editingId) {
                await api.put(`${baseEndpoint}/${editingId}`, payload);
                
                // 2. Reemplazar alerta de carga con éxito
                Swal.fire({ 
                    title: '¡Actualizado!', 
                    text: 'Los datos se guardaron correctamente.',
                    icon: 'success', 
                    timer: 2000, 
                    showConfirmButton: false 
                });
            } else {
                await api.post(baseEndpoint, payload);
                
                // 2. Reemplazar alerta de carga con éxito
                Swal.fire({ 
                    title: '¡Registrado!', 
                    text: 'El usuario ha sido creado y notificado por correo.',
                    icon: 'success', 
                    confirmButtonColor: '#3085d6' 
                });
            }
            resetForms();
            fetchData(); 
        } catch (error) {
            // 3. Si falla, mostrar error
            Swal.fire({
                title: 'Error',
                text: error.response?.data?.message || 'Error al guardar.',
                icon: 'error',
                confirmButtonColor: '#d33'
            });
        }
    };

    // --- ACCIONES AUXILIARES ---
    const resetForms = () => {
        setFormUser({ cedula: '', nombres: '', apellidos: '', email: '', rol: 'docente', password: '' });
        setFormStudent({ cedula: '', nombres: '', apellidos: '', email: '', carrera: 'Software', ciclo_actual: 'I' });
        setEditingId(null); 
        setShowModal(false);
    };

    const handleEditar = (item) => {
        setEditingId(item.id); 
        if (activeTab === 'administrativo') {
            setFormUser({ ...item, password: '' });
        } else {
            setFormStudent({ ...item });
        }
        setShowModal(true);
    };

    const handleEliminar = (id) => {
        const endpoint = activeTab === 'administrativo' ? `/users/${id}` : `/estudiantes/${id}`;
        Swal.fire({
            title: '¿Eliminar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Sí'
        }).then(async (result) => {
            if (result.isConfirmed) {
                // Agregar carga al eliminar también para que se vea fluido
                Swal.fire({ title: 'Eliminando...', didOpen: () => Swal.showLoading() });
                
                try {
                    await api.delete(endpoint);
                    fetchData();
                    Swal.fire('Eliminado', '', 'success');
                } catch (error) {
                    Swal.fire('Error', 'No se pudo eliminar', 'error');
                }
            }
        });
    };

    const handleInputCedula = (e, isUser) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
        if (isUser) setFormUser({ ...formUser, cedula: val });
        else setFormStudent({ ...formStudent, cedula: val });
    };

    // Filtros visuales
    const filteredData = dataList.filter(item => {
        const term = busqueda.toLowerCase();
        const fullName = `${item.nombres} ${item.apellidos}`.toLowerCase();
        const matchesText = fullName.includes(term) || 
                            (item.email || '').toLowerCase().includes(term) || 
                            (item.cedula || '').includes(term);

        if (activeTab === 'administrativo') {
            return matchesText && (filtroRol ? item.rol === filtroRol : true);
        } else {
            const carreraItem = (item.carrera || '').toLowerCase().trim();
            const carreraFiltro = filtroCarrera.toLowerCase().trim();
            const matchCarrera = filtroCarrera ? carreraItem === carreraFiltro : true;
            const matchCiclo = filtroCiclo ? item.ciclo_actual === filtroCiclo : true;
            return matchesText && matchCarrera && matchCiclo;
        }
    });

    const getInitials = (n) => n ? n.charAt(0).toUpperCase() : '?';
    const getRoleStyle = (r) => {
        if(r === 'admin') return 'bg-purple-100 text-purple-700 border-purple-200';
        if(r === 'coordinador') return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-green-100 text-green-700 border-green-200';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
                    <p className="text-gray-500 text-sm mt-1">Administración de personal y nómina estudiantil</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm transition text-sm">
                        <DocumentTextIcon className="h-5 w-5" /> Carga Masiva
                    </button>
                    <button onClick={() => { resetForms(); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm transition text-sm">
                        <PlusIcon className="h-5 w-5" />
                        {activeTab === 'administrativo' ? 'Nuevo Usuario' : 'Nuevo Estudiante'}
                    </button>
                </div>
            </div>

            {/* PESTAÑAS */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => handleTabChange('administrativo')} className={`py-4 px-1 border-b-2 font-medium text-sm flex gap-2 transition ${activeTab === 'administrativo' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <UserGroupIcon className="h-5 w-5" /> Personal Administrativo
                    </button>
                    <button onClick={() => handleTabChange('estudiantil')} className={`py-4 px-1 border-b-2 font-medium text-sm flex gap-2 transition ${activeTab === 'estudiantil' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <AcademicCapIcon className="h-5 w-5" /> Listado Estudiantil
                    </button>
                </nav>
            </div>

            {/* FILTROS */}
            <div className="flex flex-col md:flex-row gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input type="text" className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Buscar por cédula, nombre, email..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
                {activeTab === 'administrativo' ? (
                    <div className="w-full md:w-48">
                        <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white outline-none text-sm text-gray-600">
                            <option value="">Todos los Roles</option><option value="docente">Docentes</option><option value="coordinador">Coordinadores</option><option value="admin">Administradores</option>
                        </select>
                    </div>
                ) : (
                    <>
                        <div className="w-full md:w-48">
                            <select value={filtroCarrera} onChange={(e) => setFiltroCarrera(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white outline-none text-sm text-gray-600">
                                <option value="">Todas las Carreras</option><option value="Software">Software</option><option value="TI">TI</option>
                            </select>
                        </div>
                        <div className="w-full md:w-32">
                            <select value={filtroCiclo} onChange={(e) => setFiltroCiclo(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white outline-none text-sm text-gray-600">
                                <option value="">Todos Ciclos</option><option value="I">I</option><option value="II">II</option><option value="III">III</option><option value="IV">IV</option><option value="V">V</option><option value="VI">VI</option><option value="VII">VII</option><option value="VIII">VIII</option>
                            </select>
                        </div>
                    </>
                )}
                {(busqueda || filtroRol || filtroCarrera || filtroCiclo) && (
                    <button onClick={() => { setBusqueda(''); setFiltroRol(''); setFiltroCarrera(''); setFiltroCiclo(''); }} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Limpiar</button>
                )}
            </div>

            {/* TABLA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-white">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Cédula</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Nombres y Apellidos</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Correo Electrónico</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{activeTab === 'administrativo' ? 'Rol' : 'Carrera'}</th>
                            {activeTab === 'estudiantil' && <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Ciclo</th>}
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {loading ? <tr><td colSpan="6" className="text-center py-10 text-gray-400">Cargando...</td></tr> : filteredData.length === 0 ? (
                            <tr><td colSpan="6" className="text-center py-12 text-gray-400"><FunnelIcon className="h-10 w-10 mx-auto mb-2 opacity-20"/>Sin resultados.</td></tr>
                        ) : filteredData.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded w-fit border border-gray-200 flex items-center gap-1">
                                        <IdentificationIcon className="h-3 w-3 text-gray-400"/> 
                                        {item.cedula || 'S/N'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs border">{getInitials(item.nombres)}</div>
                                    <div className="text-sm font-semibold text-gray-900">{item.apellidos} {item.nombres}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <EnvelopeIcon className="h-4 w-4 text-gray-400"/>
                                        {item.email}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    {activeTab === 'administrativo' ? 
                                        <span className={`px-2 py-1 text-xs font-bold uppercase rounded-full border ${getRoleStyle(item.rol)}`}>{item.rol}</span> 
                                        : item.carrera}
                                </td>
                                {activeTab === 'estudiantil' && <td className="px-6 py-4 text-sm font-bold text-gray-600">{item.ciclo_actual}</td>}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => handleEditar(item)} className="text-gray-400 hover:text-amber-600 p-2 hover:bg-amber-50 rounded-full transition"><PencilSquareIcon className="h-5 w-5" /></button>
                                         {item.id !== currentUser.id && (       
                                        <button onClick={() => handleEliminar(item.id)} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition"><TrashIcon className="h-5 w-5" /></button>
                                        )}
                                        </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL CREAR/EDITAR */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4">
                            {editingId ? 'Editar' : 'Nuevo'} {activeTab === 'administrativo' ? 'Usuario' : 'Estudiante'}
                        </h3>
                        <form onSubmit={handleGuardar} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cédula</label>
                                <div className="relative">
                                    <IdentificationIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                    <input type="text" required maxLength="10" className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none" 
                                        value={activeTab === 'administrativo' ? formUser.cedula : formStudent.cedula}
                                        onChange={(e) => handleInputCedula(e, activeTab === 'administrativo')} placeholder="1234567890"/>
                                </div>
                            </div>
                            {activeTab === 'administrativo' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input required placeholder="Nombres" className="w-full px-4 py-2 border rounded-lg" value={formUser.nombres} onChange={e => setFormUser({...formUser, nombres: e.target.value})} />
                                        <input required placeholder="Apellidos" className="w-full px-4 py-2 border rounded-lg" value={formUser.apellidos} onChange={e => setFormUser({...formUser, apellidos: e.target.value})} />
                                    </div>
                                    <input required type="email" placeholder="Correo" className="w-full px-4 py-2 border rounded-lg" value={formUser.email} onChange={e => setFormUser({...formUser, email: e.target.value})} />
                                    <select className="w-full px-4 py-2 border rounded-lg bg-white" value={formUser.rol} onChange={e => setFormUser({...formUser, rol: e.target.value})}>
                                        <option value="docente">Docente</option><option value="coordinador">Coordinador</option><option value="admin">Administrador</option>
                                    </select>
                                    <input type="password" placeholder={editingId ? "Contraseña (opcional)" : "Contraseña"} className="w-full px-4 py-2 border rounded-lg" value={formUser.password} onChange={e => setFormUser({...formUser, password: e.target.value})} />
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input required placeholder="Nombres" className="w-full px-4 py-2 border rounded-lg" value={formStudent.nombres} onChange={e => setFormStudent({...formStudent, nombres: e.target.value})} />
                                        <input required placeholder="Apellidos" className="w-full px-4 py-2 border rounded-lg" value={formStudent.apellidos} onChange={e => setFormStudent({...formStudent, apellidos: e.target.value})} />
                                    </div>
                                    <input required type="email" placeholder="Correo Estudiantil" className="w-full px-4 py-2 border rounded-lg" value={formStudent.email} onChange={e => setFormStudent({...formStudent, email: e.target.value})} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <select className="w-full px-4 py-2 border rounded-lg bg-white" value={formStudent.carrera} onChange={e => setFormStudent({...formStudent, carrera: e.target.value})}>
                                            <option value="Software">Software</option><option value="TI">TI</option>
                                        </select>
                                        <select className="w-full px-4 py-2 border rounded-lg bg-white" value={formStudent.ciclo_actual} onChange={e => setFormStudent({...formStudent, ciclo_actual: e.target.value})}>
                                            <option value="I">I</option><option value="II">II</option><option value="III">III</option><option value="IV">IV</option><option value="V">V</option><option value="VI">VI</option><option value="VII">VII</option><option value="VIII">VIII</option>
                                        </select>
                                    </div>
                                </>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={resetForms} className="flex-1 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancelar</button>
                                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">{editingId ? 'Actualizar' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL IMPORTAR */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
                        <CloudArrowUpIcon className="h-12 w-12 text-green-600 mx-auto mb-4 bg-green-50 p-2 rounded-full"/>
                        <h3 className="text-xl font-bold mb-2">Importar {activeTab === 'administrativo' ? 'Usuarios' : 'Estudiantes'}</h3>
                        <div className="bg-slate-100 p-3 rounded-lg text-left mb-4 border border-slate-200">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Columnas:</p>
                            <code className="text-xs font-mono text-blue-600 block bg-white p-2 rounded border break-all">
                                {activeTab === 'administrativo' ? 'cedula,nombres,apellidos,email,password,rol' : 'cedula,nombres,apellidos,email,carrera,ciclo'}
                            </code>
                        </div>
                        <input type="file" accept=".csv" onChange={(e) => setFileToUpload(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-green-50 file:text-green-700 file:border-0 mb-6 cursor-pointer"/>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowImportModal(false)} className="flex-1 py-2 bg-gray-100 rounded-lg font-bold">Cancelar</button>
                            <button type="button" onClick={handleImportar} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">Subir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionUsuarios;