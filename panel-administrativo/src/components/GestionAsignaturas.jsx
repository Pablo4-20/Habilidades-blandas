import { useState, useEffect, useRef } from 'react';
import api, { getCarreras, getCiclos, getUnidades } from '../services/api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { 
    MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, TrashIcon,
    BookOpenIcon, CloudArrowUpIcon, XMarkIcon, AcademicCapIcon,
    ClockIcon, Square3Stack3DIcon, ArrowDownTrayIcon, DocumentTextIcon,
    ChevronLeftIcon, ChevronRightIcon
} from '@heroicons/react/24/outline';

const GestionAsignaturas = () => {
    // --- ESTADOS ---
    const [asignaturas, setAsignaturas] = useState([]);
    const [carreras, setCarreras] = useState([]);
    const [ciclos, setCiclos] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // PAGINACIÓN (AJUSTADO A 8)
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    
    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroUnidad, setFiltroUnidad] = useState(''); 
    const [filtroCarrera, setFiltroCarrera] = useState('');

    // Formulario
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ 
        id: null, nombre: '', carrera_id: '', ciclo_id: '', unidad_curricular_id: '' 
    });
    
    // Archivos
    const [fileToUpload, setFileToUpload] = useState(null);
    const [fileName, setFileName] = useState(''); 
    const fileInputRef = useRef(null); 

    useEffect(() => { 
        fetchAsignaturas(); 
        cargarCatalogos();
    }, []);

    const fetchAsignaturas = async () => {
        setLoading(true);
        try {
            const res = await api.get('/asignaturas');
            setAsignaturas(Array.isArray(res.data) ? res.data : []);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const cargarCatalogos = async () => {
        try {
            const [resCar, resCic, resUni] = await Promise.all([
                getCarreras(), getCiclos(), getUnidades()
            ]);
            setCarreras(resCar.data);
            setCiclos(resCic.data);
            setUnidades(resUni.data);
        } catch (error) { console.error("Error catálogos", error); }
    };

    // --- LÓGICA DE FILTRADO, ORDENAMIENTO Y PAGINACIÓN ---
    const getFilteredAndSortedData = () => {
        // 1. Filtrar
        let filtered = asignaturas.filter(item => {
            const matchesText = item.nombre.toLowerCase().includes(busqueda.toLowerCase());
            const matchesUnidad = filtroUnidad ? String(item.unidad_curricular_id) === String(filtroUnidad) : true;
            const matchesCarrera = filtroCarrera ? String(item.carrera_id) === String(filtroCarrera) : true;
            return matchesText && matchesUnidad && matchesCarrera;
        });

        // 2. Ordenar Alfabéticamente (A-Z)
        filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));

        return filtered;
    };

    const processedData = getFilteredAndSortedData();
    const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = processedData.slice(indexOfFirstItem, indexOfLastItem);

    // --- ACCIONES ---
    const openModal = (item = null) => {
        if (item) {
            setIsEditing(true);
            setForm({
                id: item.id,
                nombre: item.nombre,
                carrera_id: item.carrera_id,
                ciclo_id: item.ciclo_id,
                unidad_curricular_id: item.unidad_curricular_id
            });
        } else {
            setIsEditing(false);
            setForm({ id: null, nombre: '', carrera_id: '', ciclo_id: '', unidad_curricular_id: '' });
        }
        setShowModal(true);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/asignaturas/${form.id}`, form);
                Swal.fire({ title: 'Actualizado', icon: 'success', timer: 1500, showConfirmButton: false });
            } else {
                await api.post('/asignaturas', form);
                Swal.fire({ title: 'Registrado', icon: 'success', timer: 1500, showConfirmButton: false });
            }
            setShowModal(false);
            fetchAsignaturas();
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al guardar.';
            Swal.fire('Atención', msg, 'warning');
        }
    }

    const handleEliminar = (id) => {
        Swal.fire({
            title: '¿Eliminar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Sí'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/asignaturas/${id}`);
                    fetchAsignaturas();
                    Swal.fire('Eliminado', '', 'success');
                } catch (error) { Swal.fire('Error', 'No se pudo eliminar.', 'error'); }
            }
        });
    };

    // --- LÓGICA IMPORTACIÓN ---
    const downloadTemplate = () => {
        const data = [
            { Nombre: "Programación I", Carrera: "Software", Ciclo: "I", Unidad: "Unidad Básica" },
            { Nombre: "Cálculo Diferencial", Carrera: "TI", Ciclo: "2", Unidad: "Unidad Básica" }
        ];
        const worksheet = XLSX.utils.json_to_sheet(data);
        const wscols = [{wch: 30}, {wch: 20}, {wch: 10}, {wch: 25}];
        worksheet['!cols'] = wscols;
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla Materias");
        XLSX.writeFile(workbook, "Plantilla_Asignaturas.xlsx");
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFileToUpload(file);
            setFileName(file.name);
        }
    };

    const handleClickUploadArea = () => {
        fileInputRef.current.click();
    };

    const handleImportar = async () => {
        if (!fileToUpload) return Swal.fire('Atención', 'Seleccione un archivo.', 'warning');
        Swal.showLoading();
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
            } else {
                await enviarArchivoAlBackend(fileToUpload);
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo procesar el archivo.', 'error');
        }
    };

    const enviarArchivoAlBackend = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/asignaturas/import', formData, { 
                headers: { 'Content-Type': 'multipart/form-data' } 
            });
            const { creados, actualizados, errores } = res.data;
            let htmlContent = `
                <div class="text-left">
                    <p class="text-green-600 font-bold">✅ Nuevas creadas: ${creados}</p>
                    <p class="text-blue-600 font-bold">🔄 Actualizadas: ${actualizados}</p>
                </div>
            `;
            if (errores.length > 0) {
                htmlContent += `
                    <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded text-left text-sm max-h-40 overflow-y-auto">
                        <p class="font-bold text-red-600 mb-2">❌ Errores detectados:</p>
                        <ul class="list-disc pl-4 text-red-500">
                            ${errores.map(err => `<li>${err}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            Swal.fire({
                title: 'Resumen de Carga',
                html: htmlContent,
                icon: errores.length > 0 ? 'warning' : 'success',
                confirmButtonText: 'Entendido'
            });
            setShowImportModal(false);
            setFileToUpload(null);
            setFileName('');
            fetchAsignaturas();
        } catch (error) {
            console.error(error);
            Swal.fire('Error Crítico', 'El archivo no tiene el formato correcto.', 'error');
        }
    };

    const getUnidadColor = (nombreUnidad) => {
        if (!nombreUnidad) return 'bg-gray-100 text-gray-700 border-gray-200';
        if (nombreUnidad.includes('Básica')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (nombreUnidad.includes('Profesional')) return 'bg-purple-100 text-purple-700 border-purple-200';
        return 'bg-orange-100 text-orange-700 border-orange-200';
    };

    return (
        <div className="space-y-6 animate-fade-in flex flex-col h-full">
            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Gestión de Materias</h2>
                    <p className="text-gray-500 text-sm mt-1">Administración del plan de estudios</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition text-sm">
                        <CloudArrowUpIcon className="h-5 w-5" /> Carga Masiva
                    </button>
                    <button onClick={() => openModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition text-sm">
                        <PlusIcon className="h-5 w-5" /> Nueva Materia
                    </button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="flex flex-col md:flex-row gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input 
                        type="text" 
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Buscar materia..." 
                        value={busqueda} 
                        onChange={(e) => { setBusqueda(e.target.value); setCurrentPage(1); }} 
                    />
                </div>
                <div className="w-full md:w-64">
                    <select 
                        value={filtroUnidad} 
                        onChange={(e) => { setFiltroUnidad(e.target.value); setCurrentPage(1); }} 
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white outline-none text-sm text-gray-600"
                    >
                        <option value="">Todas las Unidades</option>
                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                </div>
                <div className="w-full md:w-48">
                    <select 
                        value={filtroCarrera} 
                        onChange={(e) => { setFiltroCarrera(e.target.value); setCurrentPage(1); }} 
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white outline-none text-sm text-gray-600"
                    >
                        <option value="">Todas las Carreras</option>
                        {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
                {(busqueda || filtroUnidad || filtroCarrera) && (
                    <button onClick={() => { setBusqueda(''); setFiltroUnidad(''); setFiltroCarrera(''); setCurrentPage(1); }} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Limpiar</button>
                )}
            </div>

            {/* TABLA DE RESULTADOS CON PAGINACIÓN */}
            <div className="flex flex-col flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Asignatura</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Carrera / Ciclo</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Org. Curricular</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {loading ? <tr><td colSpan="4" className="text-center py-10 text-gray-400">Cargando...</td></tr> : 
                             currentItems.length === 0 ? <tr><td colSpan="4" className="text-center py-12 text-gray-400">Sin resultados.</td></tr> :
                             currentItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center border border-indigo-200 flex-shrink-0">
                                                <BookOpenIcon className="h-4 w-4" />
                                            </div>
                                            <span className="font-semibold text-gray-900 text-sm">{item.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{item.carrera?.nombre || 'N/A'}</div>
                                        <div className="text-xs text-gray-500">Ciclo {item.ciclo?.nombre || '?'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-bold uppercase rounded-full border ${getUnidadColor(item.unidad_curricular?.nombre)}`}>
                                            {item.unidad_curricular?.nombre || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => openModal(item)} className="text-blue-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full"><PencilSquareIcon className="h-5 w-5" /></button>
                                        <button onClick={() => handleEliminar(item.id)} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full"><TrashIcon className="h-5 w-5" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- PAGINACIÓN --- */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
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

            {/* MODAL CREAR/EDITAR */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                        <div className="px-8 py-6 bg-gradient-to-r from-blue-700 to-indigo-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-wide">{isEditing ? 'Editar Asignatura' : 'Nueva Asignatura'}</h3>
                                <p className="text-blue-100 text-sm mt-1">Complete la información académica</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleGuardar} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><BookOpenIcon className="h-4 w-4 text-blue-600" /> Nombre de la Asignatura</label>
                                <input type="text" required placeholder="Ej: Desarrollo de Software I" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                    value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><AcademicCapIcon className="h-4 w-4 text-blue-600" /> Carrera</label>
                                    <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 appearance-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                        value={form.carrera_id} onChange={e => setForm({...form, carrera_id: e.target.value})} required>
                                        <option value="">Seleccionar...</option>
                                        {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><ClockIcon className="h-4 w-4 text-blue-600" /> Ciclo</label>
                                    <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                        value={form.ciclo_id} onChange={e => setForm({...form, ciclo_id: e.target.value})} required>
                                        <option value="">Seleccionar...</option>
                                        {ciclos.map(cic => <option key={cic.id} value={cic.id}>{cic.nombre}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Square3Stack3DIcon className="h-4 w-4 text-blue-600" /> Unidad de Organización Curricular</label>
                                <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                    value={form.unidad_curricular_id} onChange={e => setForm({...form, unidad_curricular_id: e.target.value})} required>
                                    <option value="">Seleccionar...</option>
                                    {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                                </select>
                            </div>
                            <div className="pt-6 flex gap-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all">
                                    {isEditing ? 'Guardar Cambios' : 'Registrar Materia'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL IMPORTAR MASIVO */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 text-center relative overflow-hidden">
                        
                        <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 border border-green-100">
                            <CloudArrowUpIcon className="h-10 w-10 text-green-600" />
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Carga Masiva</h3>
                        
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 mt-4 text-left">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Estructura del Excel/CSV:</h4>
                                <button onClick={downloadTemplate} className="text-xs flex items-center gap-1 text-green-700 hover:text-green-800 font-semibold bg-white px-3 py-1.5 rounded-lg border border-green-200 shadow-sm transition hover:shadow-md">
                                    <ArrowDownTrayIcon className="h-3 w-3" /> Descargar Plantilla
                                </button>
                            </div>

                            <div className="overflow-hidden rounded-lg border border-slate-300 shadow-sm">
                                <table className="min-w-full text-xs text-left">
                                    <thead className="bg-slate-200 text-slate-700 font-bold">
                                        <tr>
                                            <th className="px-3 py-2 border-r border-slate-300">Nombre</th>
                                            <th className="px-3 py-2 border-r border-slate-300">Carrera</th>
                                            <th className="px-3 py-2 border-r border-slate-300">Ciclo</th>
                                            <th className="px-3 py-2">Unidad</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white text-slate-600 divide-y divide-slate-100">
                                        <tr>
                                            <td className="px-3 py-2 border-r border-slate-200 font-mono text-blue-600">Programación</td>
                                            <td className="px-3 py-2 border-r border-slate-200">Software</td>
                                            <td className="px-3 py-2 border-r border-slate-200">I</td>
                                            <td className="px-3 py-2">Unidad Básica</td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-2 border-r border-slate-200 font-mono text-blue-600">Calculo</td>
                                            <td className="px-3 py-2 border-r border-slate-200">TI</td>
                                            <td className="px-3 py-2 border-r border-slate-200">2</td>
                                            <td className="px-3 py-2">Unidad Prof.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                El sistema corrige mayúsculas y números romanos automáticamente.
                            </p>
                        </div>

                        <div onClick={handleClickUploadArea} className="border-2 border-dashed border-green-300 bg-green-50/50 rounded-xl p-8 cursor-pointer hover:bg-green-50 transition-colors group mb-6 relative">
                            <input type="file" ref={fileInputRef} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileSelect} className="hidden" />
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
                            <button onClick={() => {setShowImportModal(false); setFileToUpload(null); setFileName('');}} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleImportar} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 transition-all ${fileToUpload ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-green-500/40 hover:-translate-y-0.5' : 'bg-gray-300 cursor-not-allowed'}`} disabled={!fileToUpload}>Subir Archivo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionAsignaturas;