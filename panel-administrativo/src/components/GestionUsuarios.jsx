import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx'; 
import { 
    MagnifyingGlassIcon, 
    PlusIcon, 
    DocumentTextIcon, 
    TrashIcon,
    PencilSquareIcon,
    UserGroupIcon,
    AcademicCapIcon,
    CloudArrowUpIcon,
    IdentificationIcon,
    EnvelopeIcon,
    XMarkIcon,
    ArrowDownTrayIcon,
    CheckCircleIcon, 
    ClockIcon,
    ExclamationCircleIcon 
} from '@heroicons/react/24/outline';

// --- VALIDACIÓN CÉDULA ECUADOR ---
const validarCedulaEcuador = (cedula) => {
    if (cedula.length !== 10) return false;
    const digitoRegion = parseInt(cedula.substring(0, 2));
    if (digitoRegion < 1 || digitoRegion > 24) return false;
    const ultimoDigito = parseInt(cedula.substring(9, 10));
    const pares = parseInt(cedula.substring(1, 2)) + parseInt(cedula.substring(3, 4)) + parseInt(cedula.substring(5, 6)) + parseInt(cedula.substring(7, 8));
    let numeroUno = parseInt(cedula.substring(0, 1)) * 2;
    if (numeroUno > 9) numeroUno -= 9;
    let numeroTres = parseInt(cedula.substring(2, 3)) * 2;
    if (numeroTres > 9) numeroTres -= 9;
    let numeroCinco = parseInt(cedula.substring(4, 5)) * 2;
    if (numeroCinco > 9) numeroCinco -= 9;
    let numeroSiete = parseInt(cedula.substring(6, 7)) * 2;
    if (numeroSiete > 9) numeroSiete -= 9;
    let numeroNueve = parseInt(cedula.substring(8, 9)) * 2;
    if (numeroNueve > 9) numeroNueve -= 9;
    const impares = numeroUno + numeroTres + numeroCinco + numeroSiete + numeroNueve;
    const sumaTotal = pares + impares;
    const primerDigitoSuma = parseInt(String(sumaTotal).substring(0, 1));
    const decena = (primerDigitoSuma + 1) * 10;
    let digitoValidador = decena - sumaTotal;
    if (digitoValidador === 10) digitoValidador = 0;
    return digitoValidador === ultimoDigito;
};

const GestionUsuarios = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    // --- ESTADOS ---
    const [activeTab, setActiveTab] = useState('administrativo');
    const [dataList, setDataList] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null); 

    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroRol, setFiltroRol] = useState('');          
    const [filtroCarrera, setFiltroCarrera] = useState('');  
    const [filtroCiclo, setFiltroCiclo] = useState('');      

    // Modales y Archivos
    const [showModal, setShowModal] = useState(false);       
    const [showImportModal, setShowImportModal] = useState(false); 
    const [fileToUpload, setFileToUpload] = useState(null);  
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef(null);

    // Formularios
    const [formUser, setFormUser] = useState({ cedula: '', nombres: '', apellidos: '', email: '', rol: 'docente', password: '' });
    const [formStudent, setFormStudent] = useState({ cedula: '', nombres: '', apellidos: '', email: '', carrera: 'Software', ciclo_actual: 'I' });

    // Estado Errores
    const [errors, setErrors] = useState({});

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

    useEffect(() => {
        fetchData();
        setBusqueda(''); setFiltroRol(''); setFiltroCarrera(''); setFiltroCiclo('');
        setFileToUpload(null); setFileName('');
        setErrors({});
    }, [activeTab]);

    const handleTabChange = (tab) => {
        if (tab !== activeTab) {
            setActiveTab(tab);
            setEditingId(null);
            setErrors({});
        }
    };

    // --- MANEJO DE INPUTS Y VALIDACIÓN ---
    const handleInputCedula = (e, isUser) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 10); 
        if (isUser) setFormUser({ ...formUser, cedula: val });
        else setFormStudent({ ...formStudent, cedula: val });

        if (val.length === 10) {
            if (!validarCedulaEcuador(val)) {
                setErrors(prev => ({ ...prev, cedula: 'Cédula inválida (Digito verificador incorrecto)' }));
            } else {
                setErrors(prev => { const { cedula, ...rest } = prev; return rest; }); 
            }
        } else {
            setErrors(prev => ({ ...prev, cedula: 'Debe tener 10 dígitos' }));
        }
    };

    const handleInputEmail = (e, isUser) => {
        const val = e.target.value.toLowerCase().trim(); 
        if (isUser) setFormUser({ ...formUser, email: val });
        else setFormStudent({ ...formStudent, email: val });

        const institutionalRegex = /^[a-zA-Z0-9._%+-]+@(ueb\.edu\.ec|mailes\.ueb\.edu\.ec)$/;
        if (val.length > 0 && !institutionalRegex.test(val)) {
            setErrors(prev => ({ ...prev, email: 'Solo se permiten correos institucionales (@ueb.edu.ec)' }));
        } else {
            setErrors(prev => { const { email, ...rest } = prev; return rest; });
        }
    };

    const handleGenericInput = (e, field, isUser) => {
        const val = e.target.value;
        if (isUser) setFormUser({ ...formUser, [field]: val });
        else setFormStudent({ ...formStudent, [field]: val });

        if (val.trim().length < 3) {
            setErrors(prev => ({ ...prev, [field]: 'Mínimo 3 caracteres' }));
        } else {
            setErrors(prev => { const { [field]: removed, ...rest } = prev; return rest; });
        }
    };

    // --- GUARDAR ---
    const handleGuardar = async (e) => {
        e.preventDefault();
        
        if (Object.keys(errors).length > 0) return Swal.fire('Datos Incorrectos', 'Corrija los errores en rojo.', 'error');

        const baseEndpoint = activeTab === 'administrativo' ? '/users' : '/estudiantes';
        const payload = activeTab === 'administrativo' ? formUser : formStudent;

        if (!validarCedulaEcuador(payload.cedula)) {
            setErrors(prev => ({ ...prev, cedula: 'Cédula inválida' }));
            return;
        }
        
        const institutionalRegex = /^[a-zA-Z0-9._%+-]+@(ueb\.edu\.ec|mailes\.ueb\.edu\.ec)$/;
        if (!institutionalRegex.test(payload.email)) {
            setErrors(prev => ({ ...prev, email: 'Correo no autorizado (Use dominio UEB)' }));
            return;
        }

        Swal.fire({
            title: editingId ? 'Actualizando...' : 'Registrando...',
            text: 'Procesando...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            if (editingId) {
                await api.put(`${baseEndpoint}/${editingId}`, payload);
                Swal.fire({ title: '¡Actualizado!', icon: 'success', timer: 1500, showConfirmButton: false });
            } else {
                await api.post(baseEndpoint, payload);
                Swal.fire({ title: '¡Registrado!', text: 'Usuario creado y notificado.', icon: 'success', confirmButtonColor: '#3085d6' });
            }
            resetForms();
            fetchData(); 
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al guardar.';
            if(msg.toLowerCase().includes('cedula')) setErrors(prev => ({ ...prev, cedula: 'Esta cédula ya existe' }));
            if(msg.toLowerCase().includes('email')) setErrors(prev => ({ ...prev, email: 'Este correo ya está registrado' }));
            Swal.fire({ title: 'Error', text: msg, icon: 'error', confirmButtonColor: '#d33' });
        }
    };

    // --- IMPORTACIÓN Y OTROS ---
    const downloadTemplate = () => {
        let data = [];
        let name = "";
        let wscols = [];
        if (activeTab === 'administrativo') {
            name = "Plantilla_Personal.xlsx";
            data = [{ Cedula: "0201234567", Nombres: "Juan", Apellidos: "Perez", Email: "jperez@ueb.edu.ec", Password: "123", Rol: "docente" }];
            wscols = [{wch: 15}, {wch: 15}, {wch: 15}, {wch: 25}, {wch: 10}, {wch: 15}];
        } else {
            name = "Plantilla_Estudiantes.xlsx";
            data = [{ Cedula: "0201234567", Nombres: "Carlos", Apellidos: "Ruiz", Email: "cruiz@mailes.ueb.edu.ec", Carrera: "Software", Ciclo: "I" }];
            wscols = [{wch: 15}, {wch: 15}, {wch: 15}, {wch: 25}, {wch: 15}, {wch: 5}];
        }
        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = wscols;
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");
        XLSX.writeFile(workbook, name);
    };

    const handleFileSelect = (e) => { const file = e.target.files[0]; if (file) { setFileToUpload(file); setFileName(file.name); } };
    const handleClickUploadArea = () => { fileInputRef.current.click(); };

    const handleImportar = async () => {
        if (!fileToUpload) return Swal.fire('Atención', 'Seleccione un archivo.', 'warning');
        Swal.fire({ title: 'Procesando...', text: 'Verificando datos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            if (fileToUpload.name.endsWith('.xlsx') || fileToUpload.name.endsWith('.xls')) {
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    const bstr = evt.target.result;
                    const workbook = XLSX.read(bstr, { type: 'binary' });
                    const wsname = workbook.SheetNames[0];
                    const ws = workbook.Sheets[wsname];
                    const csvData = XLSX.utils.sheet_to_csv(ws);
                    const blob = new Blob([csvData], { type: 'text/csv' });
                    const convertedFile = new File([blob], "converted.csv", { type: "text/csv" });
                    await enviarArchivoAlBackend(convertedFile);
                };
                reader.readAsBinaryString(fileToUpload);
            } else { await enviarArchivoAlBackend(fileToUpload); }
        } catch (error) { Swal.fire('Error', 'No se pudo procesar.', 'error'); }
    };

    const enviarArchivoAlBackend = async (file) => {
        const formData = new FormData(); formData.append('file', file);
        const endpoint = activeTab === 'administrativo' ? '/users/import' : '/estudiantes/import';
        try {
            const res = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            Swal.fire('¡Éxito!', res.data.message, 'success');
            setShowImportModal(false); setFileToUpload(null); setFileName(''); fetchData();
        } catch (error) { Swal.fire('Error', 'Formato incorrecto o datos duplicados.', 'error'); }
    };

    const resetForms = () => {
        setFormUser({ cedula: '', nombres: '', apellidos: '', email: '', rol: 'docente', password: '' });
        setFormStudent({ cedula: '', nombres: '', apellidos: '', email: '', carrera: 'Software', ciclo_actual: 'I' });
        setEditingId(null); setErrors({}); setShowModal(false);
    };

    const handleEditar = (item) => {
        setEditingId(item.id); 
        if (activeTab === 'administrativo') setFormUser({ ...item, password: '' });
        else setFormStudent({ ...item });
        setErrors({}); 
        setShowModal(true);
    };

    const handleEliminar = (id) => {
        const endpoint = activeTab === 'administrativo' ? `/users/${id}` : `/estudiantes/${id}`;
        Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Sí' }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Eliminando...', didOpen: () => Swal.showLoading() });
                try { await api.delete(endpoint); fetchData(); Swal.fire('Eliminado', '', 'success'); } catch { Swal.fire('Error', 'No se pudo eliminar', 'error'); }
            }
        });
    };

    const filteredData = dataList.filter(item => {
        const term = busqueda.toLowerCase();
        const fullName = `${item.nombres} ${item.apellidos}`.toLowerCase();
        const matchesText = fullName.includes(term) || (item.email || '').toLowerCase().includes(term) || (item.cedula || '').includes(term);
        if (activeTab === 'administrativo') return matchesText && (filtroRol ? item.rol === filtroRol : true);
        else return matchesText && (filtroCarrera ? item.carrera === filtroCarrera : true) && (filtroCiclo ? item.ciclo_actual === filtroCiclo : true);
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
                        <CloudArrowUpIcon className="h-5 w-5" /> Carga Masiva
                    </button>
                    <button onClick={() => { resetForms(); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm transition text-sm">
                        <PlusIcon className="h-5 w-5" /> {activeTab === 'administrativo' ? 'Nuevo Usuario' : 'Nuevo Estudiante'}
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => handleTabChange('administrativo')} className={`py-4 px-1 border-b-2 font-medium text-sm flex gap-2 transition ${activeTab === 'administrativo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <UserGroupIcon className="h-5 w-5" /> Personal Administrativo
                    </button>
                    <button onClick={() => handleTabChange('estudiantil')} className={`py-4 px-1 border-b-2 font-medium text-sm flex gap-2 transition ${activeTab === 'estudiantil' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <AcademicCapIcon className="h-5 w-5" /> Listado Estudiantil
                    </button>
                </nav>
            </div>

            {/* FILTROS */}
            <div className="flex flex-col md:flex-row gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input type="text" className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
                {activeTab === 'administrativo' ? (
                    <div className="w-full md:w-48"><select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white outline-none text-sm text-gray-600"><option value="">Todos los Roles</option><option value="docente">Docentes</option><option value="coordinador">Coordinadores</option><option value="admin">Administradores</option></select></div>
                ) : (
                    <>
                        <div className="w-full md:w-48"><select value={filtroCarrera} onChange={(e) => setFiltroCarrera(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white outline-none text-sm text-gray-600"><option value="">Todas las Carreras</option><option value="Software">Software</option><option value="TI">TI</option></select></div>
                        <div className="w-full md:w-32"><select value={filtroCiclo} onChange={(e) => setFiltroCiclo(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white outline-none text-sm text-gray-600"><option value="">Ciclos</option><option value="I">I</option><option value="II">II</option><option value="III">III</option><option value="IV">IV</option><option value="V">V</option><option value="VI">VI</option><option value="VII">VII</option><option value="VIII">VIII</option></select></div>
                    </>
                )}
                {(busqueda || filtroRol || filtroCarrera || filtroCiclo) && <button onClick={() => { setBusqueda(''); setFiltroRol(''); setFiltroCarrera(''); setFiltroCiclo(''); }} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Limpiar</button>}
            </div>

            {/* TABLA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Cédula</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Nombres y Apellidos</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Correo</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">{activeTab === 'administrativo' ? 'Rol' : 'Carrera'}</th>
                            {activeTab === 'estudiantil' && <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Ciclo</th>}
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {loading ? <tr><td colSpan="6" className="text-center py-10 text-gray-500">Cargando...</td></tr> : filteredData.length === 0 ? (
                            <tr><td colSpan="6" className="text-center py-12 text-gray-400">Sin resultados.</td></tr>
                        ) : filteredData.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 text-sm text-gray-600 font-mono">{item.cedula}</td>
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{getInitials(item.nombres)}</div>
                                    <div className="text-sm font-semibold text-gray-900">{item.apellidos} {item.nombres}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 text-sm text-gray-500"><EnvelopeIcon className="h-4 w-4 text-gray-400"/>{item.email}</div>
                                        <div className="mt-1">
                                            {item.email_verified_at ? <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200"><CheckCircleIcon className="h-3 w-3" /> Verificado</span> : <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200"><ClockIcon className="h-3 w-3" /> Pendiente</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm">{activeTab === 'administrativo' ? <span className={`px-2 py-1 text-xs font-bold uppercase rounded-full border ${getRoleStyle(item.rol)}`}>{item.rol}</span> : item.carrera}</td>
                                {activeTab === 'estudiantil' && <td className="px-6 py-4 text-sm font-bold text-gray-600">{item.ciclo_actual}</td>}
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button onClick={() => handleEditar(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"><PencilSquareIcon className="h-5 w-5" /></button>
                                    
                                    {/* 👇 SOLUCIÓN: Mostramos el botón eliminar SIEMPRE para estudiantes O si no es el mismo admin */}
                                    {(activeTab === 'estudiantil' || item.id !== currentUser.id) && (
                                        <button onClick={() => handleEliminar(item.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-full"><TrashIcon className="h-5 w-5" /></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL CON VALIDACIONES */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-8 py-6 bg-gradient-to-r from-blue-700 to-indigo-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-wide">{editingId ? 'Editar' : 'Nuevo'} {activeTab === 'administrativo' ? 'Usuario' : 'Estudiante'}</h3>
                                <p className="text-blue-100 text-sm mt-1">Complete la información del registro</p>
                            </div>
                            <button onClick={resetForms} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"><XMarkIcon className="h-6 w-6" /></button>
                        </div>

                        <form onSubmit={handleGuardar} className="p-8 space-y-5">
                            {/* CÉDULA */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cédula</label>
                                <div className="relative">
                                    <IdentificationIcon className={`absolute left-3 top-3 h-5 w-5 ${errors.cedula ? 'text-red-500' : 'text-gray-400'}`} />
                                    <input type="text" required maxLength="10" 
                                        className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl outline-none focus:bg-white focus:ring-4 transition-all ${errors.cedula ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'}`}
                                        value={activeTab === 'administrativo' ? formUser.cedula : formStudent.cedula}
                                        onChange={(e) => handleInputCedula(e, activeTab === 'administrativo')} 
                                        placeholder="Ej: 1234567890"/>
                                </div>
                                {errors.cedula && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><ExclamationCircleIcon className="h-3 w-3"/>{errors.cedula}</p>}
                            </div>
                            
                            {activeTab === 'administrativo' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <input required placeholder="Nombres" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none" value={formUser.nombres} onChange={e => handleGenericInput(e, 'nombres', true)} />
                                            {errors.nombres && <span className="text-red-500 text-xs">{errors.nombres}</span>}
                                        </div>
                                        <div>
                                            <input required placeholder="Apellidos" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none" value={formUser.apellidos} onChange={e => handleGenericInput(e, 'apellidos', true)} />
                                            {errors.apellidos && <span className="text-red-500 text-xs">{errors.apellidos}</span>}
                                        </div>
                                    </div>
                                    
                                    {/* EMAIL DOCENTE */}
                                    <div>
                                        <input required type="email" placeholder="Correo Electrónico (@ueb.edu.ec)" 
                                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none focus:bg-white transition-all ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
                                            value={formUser.email} onChange={e => handleInputEmail(e, true)} />
                                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                    </div>

                                    <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none" value={formUser.rol} onChange={e => setFormUser({...formUser, rol: e.target.value})}>
                                        <option value="docente">Docente</option><option value="coordinador">Coordinador</option><option value="admin">Administrador</option>
                                    </select>
                                    <input type="password" placeholder={editingId ? "Contraseña (dejar vacío para no cambiar)" : "Contraseña"} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none" value={formUser.password} onChange={e => setFormUser({...formUser, password: e.target.value})} />
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input required placeholder="Nombres" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none" value={formStudent.nombres} onChange={e => handleGenericInput(e, 'nombres', false)} />
                                        <input required placeholder="Apellidos" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none" value={formStudent.apellidos} onChange={e => handleGenericInput(e, 'apellidos', false)} />
                                    </div>
                                    
                                    {/* EMAIL ESTUDIANTE */}
                                    <div>
                                        <input required type="email" placeholder="Correo Institucional (@mailes.ueb.edu.ec)" 
                                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none focus:bg-white transition-all ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
                                            value={formStudent.email} onChange={e => handleInputEmail(e, false)} />
                                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none" value={formStudent.carrera} onChange={e => setFormStudent({...formStudent, carrera: e.target.value})}>
                                            <option value="Software">Software</option><option value="TI">TI</option>
                                        </select>
                                        <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none" value={formStudent.ciclo_actual} onChange={e => setFormStudent({...formStudent, ciclo_actual: e.target.value})}>
                                            <option value="I">I</option><option value="II">II</option><option value="III">III</option><option value="IV">IV</option><option value="V">V</option><option value="VI">VI</option><option value="VII">VII</option><option value="VIII">VIII</option>
                                        </select>
                                    </div>
                                </>
                            )}
                            
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={resetForms} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition">Cancelar</button>
                                {/* BOTÓN GUARDAR (Deshabilitado si hay errores) */}
                                <button type="submit" 
                                    className={`flex-1 py-3 text-white font-bold rounded-xl transition transform hover:-translate-y-0.5 ${Object.keys(errors).length > 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg'}`}
                                    disabled={Object.keys(errors).length > 0}
                                >
                                    {editingId ? 'Guardar Cambios' : 'Registrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL IMPORTAR (SE MANTIENE IGUAL) */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 text-center relative overflow-hidden">
                        <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 border border-green-100">
                            <CloudArrowUpIcon className="h-10 w-10 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Importar {activeTab === 'administrativo' ? 'Personal' : 'Estudiantes'}</h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 mt-4 text-left">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase">Estructura Excel/CSV:</h4>
                                <button onClick={downloadTemplate} className="text-xs flex items-center gap-1 text-green-700 hover:text-green-800 font-semibold bg-white px-3 py-1.5 rounded-lg border border-green-200 shadow-sm transition hover:shadow-md">
                                    <ArrowDownTrayIcon className="h-3 w-3" /> Descargar Plantilla
                                </button>
                            </div>
                            <div className="overflow-hidden rounded-lg border border-slate-300 shadow-sm bg-white">
                                <table className="min-w-full text-xs text-left">
                                    <thead className="bg-slate-200 text-slate-700 font-bold">
                                        <tr><th className="px-3 py-2 border-r">Cedula</th><th className="px-3 py-2 border-r">Nombres</th><th className="px-3 py-2">Email</th></tr>
                                    </thead>
                                    <tbody className="text-slate-600"><tr><td className="px-3 py-2 border-r">1234567890</td><td className="px-3 py-2 border-r">Juan</td><td className="px-3 py-2">jperez@ueb.edu.ec</td></tr></tbody>
                                </table>
                            </div>
                        </div>
                        <div onClick={handleClickUploadArea} className="border-2 border-dashed border-green-300 bg-green-50/50 rounded-xl p-8 cursor-pointer hover:bg-green-50 transition-colors mb-6">
                            <input type="file" ref={fileInputRef} accept=".csv, .xlsx" onChange={handleFileSelect} className="hidden" />
                            {fileName ? <div className="text-green-800 font-bold">{fileName}</div> : <div className="text-green-700 font-bold">Clic aquí para subir archivo</div>}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowImportModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl">Cancelar</button>
                            <button onClick={handleImportar} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold">Subir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionUsuarios;