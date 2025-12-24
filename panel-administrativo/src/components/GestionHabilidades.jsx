import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx'; 
import { 
    MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, TrashIcon,
    SparklesIcon, CloudArrowUpIcon, XMarkIcon, DocumentTextIcon,
    LightBulbIcon, ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const GestionHabilidades = () => {
    // --- ESTADOS ---
    const [habilidades, setHabilidades] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busqueda, setBusqueda] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    
    // Formulario
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ id: null, nombre: '', descripcion: '' });

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

    // --- FILTRADO ---
    const filteredData = habilidades.filter(item => 
        item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
    );

    // --- ACCIONES DEL FORMULARIO ---
    const openModal = (item = null) => {
        if (item) {
            setIsEditing(true);
            setForm({ id: item.id, nombre: item.nombre, descripcion: item.descripcion || '' });
        } else {
            setIsEditing(false);
            setForm({ id: null, nombre: '', descripcion: '' });
        }
        setShowModal(true);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/habilidades-blandas/${form.id}`, form);
                Swal.fire({ title: 'Actualizado', icon: 'success', timer: 1500, showConfirmButton: false });
            } else {
                await api.post('/habilidades-blandas', form);
                Swal.fire({ title: 'Creado', text: 'Habilidad agregada al catálogo', icon: 'success', timer: 1500, showConfirmButton: false });
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
            text: "Esta habilidad dejará de estar disponible.",
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

    // --- LÓGICA IMPORTACIÓN (EXCEL/CSV) ---
    const downloadTemplate = () => {
        const data = [
            { Nombre: "Liderazgo", Descripcion: "Capacidad de guiar y motivar al equipo." },
            { Nombre: "Pensamiento Crítico", Descripcion: "Análisis objetivo para tomar decisiones." }
        ];
        const worksheet = XLSX.utils.json_to_sheet(data);
        const wscols = [{wch: 30}, {wch: 60}];
        worksheet['!cols'] = wscols;
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Catálogo Habilidades");
        XLSX.writeFile(workbook, "Plantilla_Habilidades.xlsx");
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
        <div className="space-y-6 animate-fade-in">
            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Catálogo de Habilidades</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Banco global de habilidades blandas disponibles para los docentes.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition text-sm">
                        <CloudArrowUpIcon className="h-5 w-5" /> Carga Masiva
                    </button>
                    {/* BOTÓN AZUL AHORA */}
                    <button onClick={() => openModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition text-sm">
                        <PlusIcon className="h-5 w-5" /> Nueva Habilidad
                    </button>
                </div>
            </div>

            {/* BARRA DE BÚSQUEDA */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input type="text" className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Buscar habilidad por nombre o descripción..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
            </div>

            {/* TABLA DE HABILIDADES (AHORA EN LUGAR DE CARDS) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Nombre</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/2">Descripción</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan="3" className="text-center py-10 text-gray-500">Cargando catálogo...</td></tr>
                        ) : filteredData.length === 0 ? (
                            <tr><td colSpan="3" className="text-center py-12 text-gray-400">No se encontraron habilidades.</td></tr>
                        ) : (
                            filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                <SparklesIcon className="h-5 w-5" />
                                            </div>
                                            <span className="font-bold text-gray-800">{item.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <p className="text-sm text-gray-600 line-clamp-2">
                                            {item.descripcion || 'Sin descripción definida.'}
                                        </p>
                                    </td>
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

            {/* MODAL CREAR/EDITAR (AZUL) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                        {/* Cabecera Azul */}
                        <div className="px-8 py-6 bg-gradient-to-r from-blue-700 to-indigo-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-wide">{isEditing ? 'Editar Habilidad' : 'Nueva Habilidad'}</h3>
                                <p className="text-blue-100 text-sm mt-1">Definición para el catálogo global</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleGuardar} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><LightBulbIcon className="h-4 w-4 text-blue-600" /> Nombre</label>
                                <input type="text" required placeholder="Ej: Trabajo en Equipo" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                    value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><DocumentTextIcon className="h-4 w-4 text-blue-600" /> Descripción</label>
                                <textarea required placeholder="Describe brevemente en qué consiste..." rows="4" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
                                    value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
                            </div>
                            <div className="pt-4 flex gap-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all">Cancelar</button>
                                {/* Botón Guardar Azul */}
                                <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all">
                                    {isEditing ? 'Guardar' : 'Agregar al Catálogo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL IMPORTAR (Drag & Drop) */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 text-center relative overflow-hidden">
                        
                        <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 border border-green-100">
                            <CloudArrowUpIcon className="h-10 w-10 text-green-600" />
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Carga Masiva de Habilidades</h3>
                        
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 mt-4 text-left">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase">Estructura Excel/CSV:</h4>
                                <button onClick={downloadTemplate} className="text-xs flex items-center gap-1 text-green-700 hover:text-green-800 font-semibold bg-white px-3 py-1.5 rounded-lg border border-green-200 shadow-sm">
                                    <ArrowDownTrayIcon className="h-3 w-3" /> Descargar Plantilla
                                </button>
                            </div>
                            <div className="overflow-hidden rounded-lg border border-slate-300 shadow-sm">
                                <table className="min-w-full text-xs text-left">
                                    <thead className="bg-slate-200 text-slate-700 font-bold">
                                        <tr><th className="px-3 py-2 border-r border-slate-300">Nombre</th><th className="px-3 py-2">Descripcion</th></tr>
                                    </thead>
                                    <tbody className="bg-white text-slate-600">
                                        <tr><td className="px-3 py-2 border-r">Liderazgo</td><td className="px-3 py-2">Capacidad de...</td></tr>
                                    </tbody>
                                </table>
                            </div>
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
                            <button onClick={() => {setShowImportModal(false); setFileToUpload(null); setFileName('');}} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200">Cancelar</button>
                            <button onClick={handleImportar} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg ${fileToUpload ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gray-300 cursor-not-allowed'}`} disabled={!fileToUpload}>Subir Archivo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionHabilidades;