import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx'; 
import { 
    MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, TrashIcon,
    SparklesIcon, CloudArrowUpIcon, XMarkIcon, DocumentTextIcon,
    LightBulbIcon, ArrowDownTrayIcon, ListBulletIcon,
    ChevronLeftIcon, ChevronRightIcon
} from '@heroicons/react/24/outline';

const GestionHabilidades = () => {
    // --- ESTADOS ---
    const [habilidades, setHabilidades] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    
    // PAGINACIÓN (AJUSTADO A 7)
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 7; 

    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    
    // Formulario Habilidad
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ id: null, nombre: '', descripcion: '' });
    const [actividadesForm, setActividadesForm] = useState(['']);

    // Archivos
    const [fileToUpload, setFileToUpload] = useState(null);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/habilidades-blandas');
            setHabilidades(Array.isArray(res.data) ? res.data : []);
        } catch (error) { 
            console.error(error);
            setHabilidades([]); 
        } finally { 
            setLoading(false); 
        }
    };

    // --- LÓGICA DE FILTRADO, ORDENAMIENTO Y PAGINACIÓN ---
    const getFilteredAndSortedData = () => {
        // 1. Filtrar
        let filtered = habilidades.filter(item => 
            item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            (item.descripcion && item.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
        );

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
            setForm({ id: item.id, nombre: item.nombre, descripcion: item.descripcion || '' });
            const acts = item.actividades?.map(a => a.descripcion) || [];
            setActividadesForm(acts.length > 0 ? acts : ['']);
        } else {
            setIsEditing(false);
            setForm({ id: null, nombre: '', descripcion: '' });
            setActividadesForm(['']);
        }
        setShowModal(true);
    };

    // MANEJADORES DE ACTIVIDADES
    const handleActividadChange = (index, value) => {
        const nuevas = [...actividadesForm];
        nuevas[index] = value;
        setActividadesForm(nuevas);
    };
    const agregarCampoActividad = () => setActividadesForm([...actividadesForm, '']);
    const eliminarCampoActividad = (index) => {
        const nuevas = actividadesForm.filter((_, i) => i !== index);
        setActividadesForm(nuevas);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        const actividadesLimpias = actividadesForm.filter(a => a.trim() !== '');
        const payload = { ...form, actividades: actividadesLimpias };

        try {
            if (isEditing) {
                await api.put(`/habilidades-blandas/${form.id}`, payload);
                Swal.fire({ title: 'Actualizado', icon: 'success', timer: 1500, showConfirmButton: false });
            } else {
                await api.post('/habilidades-blandas', payload);
                Swal.fire({ title: 'Creado', text: 'Habilidad y actividades agregadas', icon: 'success', timer: 1500, showConfirmButton: false });
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo guardar la habilidad.', 'error');
        }
    };

    const handleEliminar = (id) => {
        Swal.fire({
            title: '¿Eliminar del catálogo?',
            text: "Se eliminarán también todas las actividades asociadas.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            confirmButtonText: 'Sí, eliminar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/habilidades-blandas/${id}`);
                    fetchData();
                    Swal.fire('Eliminado', '', 'success');
                } catch (error) {
                    Swal.fire('Error', 'No se pudo eliminar.', 'error');
                }
            }
        });
    };

    // --- LÓGICA IMPORTACIÓN ---
    const downloadTemplate = () => {
        const data = [
            { Nombre: "Liderazgo", Descripcion: "Capacidad de guiar...", "Actividad 1": "Rubricas de evaluación", "Actividad 2": "Autoevaluación" },
            { Nombre: "Pensamiento Crítico", Descripcion: "Análisis objetivo...", "Actividad 1": "Debates", "Actividad 2": "" }
        ];
        const worksheet = XLSX.utils.json_to_sheet(data);
        const wscols = [{wch: 30}, {wch: 50}, {wch: 30}, {wch: 30}];
        worksheet['!cols'] = wscols;
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Catálogo Habilidades");
        XLSX.writeFile(workbook, "Plantilla_Habilidades_Actividades.xlsx");
    };

    const handleFileSelect = (e) => { const file = e.target.files[0]; if (file) { setFileToUpload(file); setFileName(file.name); } };
    const handleClickUploadArea = () => { fileInputRef.current.click(); };

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
            Swal.fire('Error', 'Error al procesar el archivo.', 'error');
        }
    };

    const enviarArchivoAlBackend = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/habilidades-blandas/import', formData, { 
                headers: { 'Content-Type': 'multipart/form-data' } 
            });
            const { message, errores } = res.data;
            let htmlContent = `<p class="text-green-600 font-bold mb-2">${message}</p>`;
            if (errores && errores.length > 0) {
                htmlContent += `
                    <div class="mt-2 p-3 bg-red-50 border border-red-200 rounded text-left text-sm max-h-40 overflow-y-auto">
                        <p class="font-bold text-red-600 mb-1">Errores:</p>
                        <ul class="list-disc pl-4 text-red-500">
                            ${errores.map(err => `<li>${err}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            Swal.fire({
                title: 'Resumen de Importación',
                html: htmlContent,
                icon: (errores && errores.length > 0) ? 'warning' : 'success'
            });
            setShowImportModal(false);
            setFileToUpload(null);
            setFileName('');
            fetchData();
        } catch (error) {
            Swal.fire('Error', 'Falló la conexión con el servidor.', 'error');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20 flex flex-col h-full">
            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Catálogo de Habilidades</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Banco global de habilidades blandas y sus actividades.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition text-sm">
                        <CloudArrowUpIcon className="h-5 w-5" /> Carga Masiva
                    </button>
                    <button onClick={() => openModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition text-sm">
                        <PlusIcon className="h-5 w-5" /> Nueva Habilidad
                    </button>
                </div>
            </div>

            {/* BARRA DE BÚSQUEDA */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input 
                        type="text" 
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Buscar habilidad por nombre o descripción..." 
                        value={busqueda} 
                        onChange={(e) => { setBusqueda(e.target.value); setCurrentPage(1); }} 
                    />
                </div>
            </div>

            {/* TABLA DE HABILIDADES CON PAGINACIÓN */}
            <div className="flex flex-col flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/5">Nombre</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Descripción</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Actividades</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-1/6">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="4" className="text-center py-10 text-gray-500">Cargando catálogo...</td></tr>
                            ) : currentItems.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-12 text-gray-400">No se encontraron habilidades.</td></tr>
                            ) : (
                                currentItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition">
                                        {/* COLUMNA 1: NOMBRE */}
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                                                    <SparklesIcon className="h-5 w-5" />
                                                </div>
                                                <span className="font-bold text-gray-800">{item.nombre}</span>
                                            </div>
                                        </td>
                                        
                                        {/* COLUMNA 2: DESCRIPCIÓN */}
                                        <td className="px-6 py-4 align-top">
                                            <p className="text-sm text-gray-600 line-clamp-3">
                                                {item.descripcion || 'Sin descripción definida.'}
                                            </p>
                                        </td>

                                        {/* COLUMNA 3: ACTIVIDADES */}
                                        <td className="px-6 py-4 align-top">
                                            {item.actividades && item.actividades.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {item.actividades.slice(0, 4).map((act, idx) => (
                                                        <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                                            {act.descripcion.length > 25 ? act.descripcion.substring(0,25)+'...' : act.descripcion}
                                                        </span>
                                                    ))}
                                                    {item.actividades.length > 4 && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                            +{item.actividades.length - 4} más
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic flex items-center gap-1">
                                                    <XMarkIcon className="h-3 w-3"/> Sin actividades
                                                </span>
                                            )}
                                        </td>

                                        {/* COLUMNA 4: ACCIONES */}
                                        <td className="px-6 py-4 align-top text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openModal(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition" title="Editar">
                                                    <PencilSquareIcon className="h-5 w-5"/>
                                                </button>
                                                <button onClick={() => handleEliminar(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition" title="Eliminar">
                                                    <TrashIcon className="h-5 w-5"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- PAGINACIÓN --- */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                    <span className="text-sm text-gray-500">
                        Mostrando del <span className="font-bold text-gray-800">{currentItems.length > 0 ? indexOfFirstItem + 1 : 0}</span> al <span className="font-bold text-gray-800">{Math.min(indexOfLastItem, processedData.length)}</span> de <span className="font-bold text-gray-800">{processedData.length}</span> registros
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

            {/* MODAL CREAR/EDITAR (Mantenido igual) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden transform transition-all scale-100 flex flex-col">
                        <div className="px-8 py-6 bg-gradient-to-r from-blue-700 to-indigo-800 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-wide">{isEditing ? 'Editar Habilidad' : 'Nueva Habilidad'}</h3>
                                <p className="text-blue-100 text-sm mt-1">Configuración del catálogo</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto">
                            <form id="skillForm" onSubmit={handleGuardar} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><LightBulbIcon className="h-4 w-4 text-blue-600" /> Nombre</label>
                                    <input type="text" required placeholder="Ej: Trabajo en Equipo" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                        value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><DocumentTextIcon className="h-4 w-4 text-blue-600" /> Descripción</label>
                                    <textarea required placeholder="Describe brevemente..." rows="3" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
                                        value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
                                </div>
                                <div className="border-t border-gray-100 pt-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2"><ListBulletIcon className="h-4 w-4 text-purple-600"/> Actividades Sugeridas</label>
                                        <button type="button" onClick={agregarCampoActividad} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition font-medium">
                                            + Añadir Actividad
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                        {actividadesForm.map((act, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:border-purple-500 outline-none"
                                                    placeholder={`Ej: Debate grupal...`}
                                                    value={act}
                                                    onChange={(e) => handleActividadChange(idx, e.target.value)}
                                                />
                                                {actividadesForm.length > 1 && (
                                                    <button type="button" onClick={() => eliminarCampoActividad(idx)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                                                        <TrashIcon className="h-5 w-5"/>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 italic">Estas actividades aparecerán como opciones para los docentes.</p>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50 shrink-0">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-200 transition-all">Cancelar</button>
                            <button type="submit" form="skillForm" className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all">
                                {isEditing ? 'Guardar Cambios' : 'Crear Habilidad'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL IMPORTAR MASIVO (Mantenido igual) */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 text-center relative overflow-hidden">
                        <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 border border-green-100">
                            <CloudArrowUpIcon className="h-10 w-10 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Carga Masiva</h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 mt-4 text-left">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase">Estructura del Archivo:</h4>
                                <button onClick={downloadTemplate} className="text-xs flex items-center gap-1 text-green-700 hover:text-green-800 font-semibold bg-white px-3 py-1.5 rounded-lg border border-green-200 shadow-sm transition-all hover:shadow-md">
                                    <ArrowDownTrayIcon className="h-3 w-3" /> Descargar Plantilla
                                </button>
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm">
                                <table className="min-w-full text-[10px] text-left whitespace-nowrap">
                                    <thead className="bg-slate-200 text-slate-700 font-bold">
                                        <tr>
                                            <th className="px-2 py-2 border-r border-slate-300">Nombre</th>
                                            <th className="px-2 py-2 border-r border-slate-300">Descripción</th>
                                            <th className="px-2 py-2 border-r border-slate-300 bg-green-100 text-green-800">Actividad 1</th>
                                            <th className="px-2 py-2 bg-green-100 text-green-800">Actividad 2 ...</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white text-slate-600">
                                        <tr className="border-b border-slate-100">
                                            <td className="px-2 py-2 border-r">Liderazgo</td>
                                            <td className="px-2 py-2 border-r">Capacidad de...</td>
                                            <td className="px-2 py-2 border-r bg-green-50/50">Rubricas...</td>
                                            <td className="px-2 py-2 bg-green-50/50">Autoevaluación</td>
                                        </tr>
                                        <tr>
                                            <td className="px-2 py-2 border-r">Creatividad</td>
                                            <td className="px-2 py-2 border-r">Generar ideas...</td>
                                            <td className="px-2 py-2 border-r bg-green-50/50">Lluvia ideas</td>
                                            <td className="px-2 py-2 bg-green-50/50"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 text-center italic">
                                * Las columnas de actividades son dinámicas, puedes agregar cuantas necesites hacia la derecha.
                            </p>
                        </div>
                        <div onClick={handleClickUploadArea} className="border-2 border-dashed border-green-300 bg-green-50/50 rounded-xl p-8 cursor-pointer hover:bg-green-50 transition-colors group mb-6">
                            <input type="file" ref={fileInputRef} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileSelect} className="hidden" />
                            {fileName ? (
                                <div className="flex flex-col items-center">
                                    <DocumentTextIcon className="h-10 w-10 text-green-600 mb-2" />
                                    <span className="text-green-800 font-semibold break-all">{fileName}</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <p className="text-green-700 font-bold text-lg">Clic aquí para buscar archivo</p>
                                    <p className="text-sm text-green-600/70 mt-1">Soporta Excel (.xlsx) y CSV</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => {setShowImportModal(false); setFileToUpload(null); setFileName('');}} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleImportar} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all ${fileToUpload ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-green-500/40' : 'bg-gray-300 cursor-not-allowed'}`} disabled={!fileToUpload}>Procesar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionHabilidades;