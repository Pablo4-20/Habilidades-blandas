import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx'; 
import { 
    MagnifyingGlassIcon, 
    PlusIcon, 
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
    ExclamationCircleIcon,
    DocumentTextIcon,
    ChevronLeftIcon,
    ChevronRightIcon
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
    const [listaCarreras, setListaCarreras] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null); 

    // Filtros y Paginación (AJUSTADO A 6)
    const [busqueda, setBusqueda] = useState('');
    const [filtroRol, setFiltroRol] = useState('');
    const [currentPage, setCurrentPage] = useState(1); 
    const ITEMS_PER_PAGE = 6; 
    
    // Modales y Archivos
    const [showModal, setShowModal] = useState(false);       
    const [showImportModal, setShowImportModal] = useState(false); 
    const [fileToUpload, setFileToUpload] = useState(null);  
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef(null);

    // Formularios
    const [formUser, setFormUser] = useState({ 
        cedula: '', nombres: '', apellidos: '', email: '', rol: 'docente', password: '', 
        carrera_id: '' 
    });
    
    const [formStudent, setFormStudent] = useState({ 
        cedula: '', nombres: '', apellidos: '', email: '', carrera: '' 
    });

    const [errors, setErrors] = useState({});

    // --- CARGA DE DATOS ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'administrativo' ? '/users' : '/estudiantes';
            
            const [resData, resCarreras] = await Promise.all([
                api.get(endpoint),
                activeTab === 'administrativo' ? api.get('/carreras').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
            ]);

            setDataList(Array.isArray(resData.data) ? resData.data : []);
            if (activeTab === 'administrativo') setListaCarreras(resCarreras.data);

        } catch (error) {
            console.error("Error cargando datos:", error);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        setBusqueda(''); setFiltroRol(''); 
        setFileToUpload(null); setFileName('');
        setErrors({});
        setCurrentPage(1); // Resetear página al cambiar tab
    }, [activeTab]);

    const handleTabChange = (tab) => {
        if (tab !== activeTab) {
            setActiveTab(tab);
            setEditingId(null);
            setErrors({});
        }
    };

    // --- MANEJO DE INPUTS (Sin cambios) ---
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

    // --- GUARDAR (Sin cambios mayores) ---
    const handleGuardar = async (e) => {
        e.preventDefault();
        
        if (Object.keys(errors).length > 0) return Swal.fire('Datos Incorrectos', 'Corrija los errores en rojo.', 'error');

        const baseEndpoint = activeTab === 'administrativo' ? '/users' : '/estudiantes';
        const payload = activeTab === 'administrativo' ? formUser : formStudent;

        if (activeTab === 'administrativo' && payload.rol === 'coordinador' && !payload.carrera_id) {
            return Swal.fire('Falta Información', 'Debe asignar una carrera al Coordinador.', 'warning');
        }

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

    // --- IMPORTACIÓN Y PLANTILLAS (Sin cambios) ---
    const downloadTemplate = () => {
        let data = [];
        let name = "";
        let wscols = [];
        
        if (activeTab === 'administrativo') {
            name = "Plantilla_Personal.xlsx";
            data = [{ Cedula: "0201234567", Nombres: "Juan", Apellidos: "Perez", Email: "jperez@ueb.edu.ec", Password: "clave", Rol: "docente", Carrera: "Software (Solo Coord)" }];
            wscols = [{wch: 15}, {wch: 15}, {wch: 15}, {wch: 25}, {wch: 15}, {wch: 15}, {wch: 20}];
        } else {
            name = "Plantilla_Estudiantes.xlsx";
            data = [{ Cedula: "0201234567", Nombres: "Carlos", Apellidos: "Ruiz", Email: "cruiz@mailes.ueb.edu.ec", Carrera: "Software" }];
            wscols = [{wch: 15}, {wch: 15}, {wch: 15}, {wch: 30}, {wch: 20}];
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
            let fileToSend = fileToUpload;
            if (fileToUpload.name.endsWith('.xlsx') || fileToUpload.name.endsWith('.xls')) {
                const data = await fileToUpload.arrayBuffer();
                const workbook = XLSX.read(data);
                const csvData = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]], { FS: ";" });
                const blob = new Blob([csvData], { type: 'text/csv' });
                fileToSend = new File([blob], "converted.csv", { type: "text/csv" });
            }
            
            const formData = new FormData(); 
            formData.append('file', fileToSend);
            
            const endpoint = activeTab === 'administrativo' ? '/users/import' : '/estudiantes/import';
            const res = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            
            const { creados, actualizados, errores } = res.data; 
            
            if (!creados && !errores) {
                 Swal.fire('¡Éxito!', res.data.message || 'Importación correcta', 'success');
            } else {
                let htmlContent = `
                    <div class="text-left">
                        <p class="text-green-600 font-bold">✅ Registrados: ${creados || 0}</p>
                        ${actualizados ? `<p class="text-blue-600 font-bold">🔄 Actualizados: ${actualizados}</p>` : ''}
                    </div>
                `;
                if (errores && errores.length > 0) {
                    htmlContent += `
                        <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded text-left text-sm max-h-40 overflow-y-auto">
                            <p class="font-bold text-red-600 mb-2">❌ Errores:</p>
                            <ul class="list-disc pl-4 text-red-500">
                                ${errores.map(err => `<li>${err}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }
                Swal.fire({
                    title: 'Resumen de Carga',
                    html: htmlContent,
                    icon: (errores && errores.length > 0) ? 'warning' : 'success',
                    confirmButtonText: 'Entendido'
                });
            }

            setShowImportModal(false); setFileToUpload(null); setFileName(''); fetchData();
        } catch (error) { Swal.fire('Error', error.response?.data?.message || 'Error al importar.', 'error'); }
    };

    const resetForms = () => {
        setFormUser({ cedula: '', nombres: '', apellidos: '', email: '', rol: 'docente', password: '', carrera_id: '' });
        setFormStudent({ cedula: '', nombres: '', apellidos: '', email: '', carrera: '' });
        setEditingId(null); setErrors({}); setShowModal(false);
    };

    const handleEditar = (item) => {
        setEditingId(item.id); 
        if (activeTab === 'administrativo') {
            setFormUser({ 
                ...item, 
                password: '', 
                carrera_id: item.carrera_id || '' 
            });
        }
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

    // --- LÓGICA DE FILTRADO Y PAGINACIÓN ---
    const getFilteredAndSortedData = () => {
        // 1. Filtrar
        let filtered = dataList.filter(item => {
            const term = busqueda.toLowerCase();
            const fullName = `${item.nombres} ${item.apellidos}`.toLowerCase();
            const matchesText = fullName.includes(term) || (item.email || '').toLowerCase().includes(term) || (item.cedula || '').includes(term);
            if (activeTab === 'administrativo') return matchesText && (filtroRol ? item.rol === filtroRol : true);
            else return matchesText;
        });

        // 2. Ordenar Alfabéticamente (A-Z por Apellidos)
        filtered.sort((a, b) => {
            const nameA = `${a.apellidos} ${a.nombres}`.toLowerCase();
            const nameB = `${b.apellidos} ${b.nombres}`.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        return filtered;
    };

    // Datos procesados
    const processedData = getFilteredAndSortedData();
    
    // Cálculos de Paginación
    const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = processedData.slice(indexOfFirstItem, indexOfLastItem);

    const getInitials = (n) => n ? n.charAt(0).toUpperCase() : '?';
    const getRoleStyle = (r) => {
        if(r === 'admin') return 'bg-purple-100 text-purple-700 border-purple-200';
        if(r === 'coordinador') return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-green-100 text-green-700 border-green-200';
    };

    const getCarreraDisplay = (item) => {
        if (!item.carrera) return 'Sin Asignar';
        if (typeof item.carrera === 'object') {
            return item.carrera.nombre || 'Desconocida';
        }
        return item.carrera;
    };

    return (
        <div className="space-y-6 animate-fade-in flex flex-col h-full">
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
                    <input 
                        type="text" 
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100" 
                        placeholder="Buscar..." 
                        value={busqueda} 
                        onChange={(e) => { setBusqueda(e.target.value); setCurrentPage(1); }} // Reset página al buscar
                    />
                </div>
                {activeTab === 'administrativo' && (
                    <div className="w-full md:w-48">
                        <select 
                            value={filtroRol} 
                            onChange={(e) => { setFiltroRol(e.target.value); setCurrentPage(1); }} 
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white outline-none text-sm text-gray-600"
                        >
                            <option value="">Todos los Roles</option>
                            <option value="docente">Docentes</option>
                            <option value="coordinador">Coordinadores</option>
                            <option value="admin">Administradores</option>
                        </select>
                    </div>
                )}
                {(busqueda || filtroRol) && <button onClick={() => { setBusqueda(''); setFiltroRol(''); setCurrentPage(1); }} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Limpiar</button>}
            </div>

            {/* TABLA PRINCIPAL CON PAGINACIÓN */}
            <div className="flex flex-col flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Cédula</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Nombres y Apellidos</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Correo</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">
                                    {activeTab === 'administrativo' ? 'Rol' : 'Carrera'}
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {loading ? <tr><td colSpan={5} className="text-center py-10 text-gray-500">Cargando...</td></tr> : currentItems.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Sin resultados.</td></tr>
                            ) : currentItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{item.cedula}</td>
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">{getInitials(item.nombres)}</div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="text-sm font-semibold text-gray-900 truncate">{item.apellidos} {item.nombres}</div>
                                            {item.rol === 'coordinador' && item.carrera && (
                                                <span className="text-xs text-blue-600 font-medium truncate">
                                                    Coord. {typeof item.carrera === 'object' ? item.carrera.nombre : item.carrera}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 text-sm text-gray-500"><EnvelopeIcon className="h-4 w-4 text-gray-400"/>{item.email}</div>
                                            {activeTab === 'administrativo' && (
                                                <div className="mt-1">
                                                    {item.email_verified_at ? <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200"><CheckCircleIcon className="h-3 w-3" /> Verificado</span> : <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200"><ClockIcon className="h-3 w-3" /> Pendiente</span>}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {activeTab === 'administrativo' ? (
                                            <span className={`px-2 py-1 text-xs font-bold uppercase rounded-full border ${getRoleStyle(item.rol)}`}>
                                                {item.rol}
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <AcademicCapIcon className="h-4 w-4 text-gray-400" />
                                                <span className="text-gray-700 font-medium truncate max-w-[150px]">
                                                    {getCarreraDisplay(item)}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => handleEditar(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"><PencilSquareIcon className="h-5 w-5" /></button>
                                        {(activeTab === 'estudiantil' || item.id !== currentUser.id) && (
                                            <button onClick={() => handleEliminar(item.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-full"><TrashIcon className="h-5 w-5" /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- CONTROLES DE PAGINACIÓN --- */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        Mostrando <span className="font-bold text-gray-800">{currentItems.length > 0 ? indexOfFirstItem + 1 : 0}</span> a <span className="font-bold text-gray-800">{Math.min(indexOfLastItem, processedData.length)}</span> de <span className="font-bold text-gray-800">{processedData.length}</span> registros
                    </span>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-lg border transition ${currentPage === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-white hover:shadow-sm'}`}
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </button>
                        
                        <span className="text-sm font-medium text-gray-600 px-2">
                            Página {currentPage} de {totalPages || 1}
                        </span>

                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className={`p-2 rounded-lg border transition ${currentPage === totalPages || totalPages === 0 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-white hover:shadow-sm'}`}
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL CREAR/EDITAR (Sin cambios funcionales, solo estilo) */}
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
                                    
                                    <div>
                                        <input required type="email" placeholder="Correo Electrónico (@ueb.edu.ec)" 
                                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none focus:bg-white transition-all ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
                                            value={formUser.email} onChange={e => handleInputEmail(e, true)} />
                                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none" value={formUser.rol} onChange={e => setFormUser({...formUser, rol: e.target.value})}>
                                            <option value="docente">Docente</option><option value="coordinador">Coordinador</option><option value="admin">Administrador</option>
                                        </select>
                                        <input type="password" placeholder={editingId ? "Clave " : "Contraseña"} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none" value={formUser.password} onChange={e => setFormUser({...formUser, password: e.target.value})} />
                                    </div>

                                    {formUser.rol === 'coordinador' && (
                                        <div className="animate-fade-in">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Asignar Carrera</label>
                                            <select 
                                                className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none text-blue-800 font-medium"
                                                value={formUser.carrera_id} 
                                                onChange={e => setFormUser({...formUser, carrera_id: e.target.value})}
                                                required
                                            >
                                                <option value="">-- Seleccione Carrera --</option>
                                                {listaCarreras.map(c => (
                                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input required placeholder="Nombres" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none" value={formStudent.nombres} onChange={e => handleGenericInput(e, 'nombres', false)} />
                                        <input required placeholder="Apellidos" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none" value={formStudent.apellidos} onChange={e => handleGenericInput(e, 'apellidos', false)} />
                                    </div>
                                    
                                    <div>
                                        <input required type="email" placeholder="Correo Institucional (@ueb.edu.ec)" 
                                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none focus:bg-white transition-all ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
                                            value={formStudent.email} onChange={e => handleInputEmail(e, false)} />
                                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Carrera</label>
                                        <select
                                            required 
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white outline-none cursor-pointer"
                                            value={formStudent.carrera} 
                                            onChange={e => setFormStudent({...formStudent, carrera: e.target.value})} 
                                        >
                                            <option value="">-- Seleccione una Carrera --</option>
                                            <option value="Software">Software</option>
                                            <option value="Tecnologías de la Información">Tecnologías de la Información</option>
                                        </select>
                                    </div>
                                </>
                            )}
                            
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={resetForms} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition">Cancelar</button>
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

            {/* MODAL IMPORTAR MASIVO (Sin cambios, solo diseño mantenido) */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 text-center relative overflow-hidden">
                        
                        <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 border border-green-100">
                            <CloudArrowUpIcon className="h-10 w-10 text-green-600" />
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            Importar {activeTab === 'administrativo' ? 'Personal' : 'Estudiantes'}
                        </h3>
                        
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 mt-4 text-left">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Estructura del Excel/CSV:</h4>
                                <button 
                                    onClick={downloadTemplate} 
                                    className="text-xs flex items-center gap-1 text-green-700 hover:text-green-800 font-semibold bg-white px-3 py-1.5 rounded-lg border border-green-200 shadow-sm transition hover:shadow-md"
                                >
                                    <ArrowDownTrayIcon className="h-3 w-3" /> Descargar Plantilla
                                </button>
                            </div>

                            <div className="overflow-hidden rounded-lg border border-slate-300 shadow-sm">
                                <table className="min-w-full text-xs text-left">
                                    <thead className="bg-slate-200 text-slate-700 font-bold">
                                        <tr>
                                            <th className="px-3 py-2 border-r border-slate-300">Cédula</th>
                                            <th className="px-3 py-2 border-r border-slate-300">Nombres</th>
                                            <th className="px-3 py-2 border-r border-slate-300">Apellidos</th>
                                            <th className="px-3 py-2">
                                                {activeTab === 'administrativo' ? 'Rol/Carrera' : 'Carrera'}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white text-slate-600 divide-y divide-slate-100">
                                        <tr>
                                            <td className="px-3 py-2 border-r border-slate-200 font-mono text-blue-600">020123...</td>
                                            <td className="px-3 py-2 border-r border-slate-200">Juan</td>
                                            <td className="px-3 py-2 border-r border-slate-200">Perez</td>
                                            <td className="px-3 py-2">
                                                {activeTab === 'administrativo' ? 'Docente' : 'Software'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div 
                            onClick={handleClickUploadArea}
                            className="border-2 border-dashed border-green-300 bg-green-50/50 rounded-xl p-8 cursor-pointer hover:bg-green-50 transition-colors group mb-6 relative"
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                                onChange={handleFileSelect} 
                                className="hidden" 
                            />
                            
                            {fileName ? (
                                <div className="flex flex-col items-center animate-fade-in">
                                    <DocumentTextIcon className="h-10 w-10 text-green-600 mb-2" />
                                    <span className="text-green-800 font-semibold break-all">{fileName}</span>
                                    <span className="text-xs text-green-600 mt-1">Clic para cambiar archivo</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <p className="text-green-700 font-bold text-lg group-hover:scale-105 transition-transform">
                                        Clic aquí para buscar archivo
                                    </p>
                                    <p className="text-sm text-green-600/70 mt-1">
                                        Soporta Excel (.xlsx) y CSV
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => {setShowImportModal(false); setFileToUpload(null); setFileName('');}} 
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleImportar} 
                                className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 transition-all ${
                                    fileToUpload 
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-green-500/40 hover:-translate-y-0.5' 
                                    : 'bg-gray-300 cursor-not-allowed'
                                }`}
                                disabled={!fileToUpload}
                            >
                                Subir Archivo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionUsuarios;