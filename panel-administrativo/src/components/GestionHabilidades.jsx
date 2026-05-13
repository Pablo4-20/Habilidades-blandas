import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx'; 
import { 
    MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, TrashIcon,
    SparklesIcon, CloudArrowUpIcon, XMarkIcon, DocumentTextIcon,
    LightBulbIcon, ArrowDownTrayIcon, ListBulletIcon,
    ChevronLeftIcon, ChevronRightIcon, ClipboardDocumentListIcon,
    BriefcaseIcon, DocumentCheckIcon
} from '@heroicons/react/24/outline';

const GestionHabilidades = () => {
    // --- ESTADOS PRINCIPALES ---
    const [habilidades, setHabilidades] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    
    // PAGINACIÓN
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 7; 

    // MODALES Y FORMULARIOS DE HABILIDADES
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ id: null, nombre: '', descripcion: '' });

    // --- ESTADOS DE GUÍAS DE EVALUACIÓN (RÚBRICAS) ---
    const [showGuiasModal, setShowGuiasModal] = useState(false);
    const [showRubricaModal, setShowRubricaModal] = useState(false);
    const [showImportRubricasModal, setShowImportRubricasModal] = useState(false);
    const [rubricaForm, setRubricaForm] = useState({ 
        id: null, nombre: '', nivel_1: '', nivel_2: '', nivel_3: '', nivel_4: '', nivel_5: '' 
    });
    const [fileRubricasToUpload, setFileRubricasToUpload] = useState(null);
    const [fileNameRubricas, setFileNameRubricas] = useState('');
    const fileInputRubricasRef = useRef(null);

    // --- ESTADOS PARA ACTIVIDADES GLOBALES ---
    const [showActividadesModal, setShowActividadesModal] = useState(false);
    const [actividadesGlobales, setActividadesGlobales] = useState(['']);
    const [showImportActividadesModal, setShowImportActividadesModal] = useState(false);
    const [fileActividadesToUpload, setFileActividadesToUpload] = useState(null);
    const [fileNameActividades, setFileNameActividades] = useState('');
    const fileInputActividadesRef = useRef(null);

    // --- ESTADOS PARA METODOLOGÍAS GLOBALES ---
    const [showMetodologiasModal, setShowMetodologiasModal] = useState(false);
    const [metodologiasGlobales, setMetodologiasGlobales] = useState(['']);
    const [showImportMetodologiasModal, setShowImportMetodologiasModal] = useState(false);
    const [fileMetodologiasToUpload, setFileMetodologiasToUpload] = useState(null);
    const [fileNameMetodologias, setFileNameMetodologias] = useState('');
    const fileInputMetodologiasRef = useRef(null);

    // Archivos Habilidades
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

    const getFilteredAndSortedData = () => {
        let filtered = habilidades.filter(item => 
            item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            (item.descripcion && item.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
        );
        filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
        return filtered;
    };

    const processedData = getFilteredAndSortedData();
    const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = processedData.slice(indexOfFirstItem, indexOfLastItem);

    // --- ACCIONES DE HABILIDADES ---
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
                Swal.fire({ title: 'Creado', text: 'Habilidad agregada', icon: 'success', timer: 1500, showConfirmButton: false });
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
            title: '¿Eliminar habilidad?',
            text: "Se eliminará permanentemente.",
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

    // --- ACCIONES DE GUÍAS DE EVALUACIÓN (RÚBRICAS) ---
    const openRubricaModal = (item) => {
        setRubricaForm({
            id: item.id,
            nombre: item.nombre,
            nivel_1: item.nivel_1 || '',
            nivel_2: item.nivel_2 || '',
            nivel_3: item.nivel_3 || '',
            nivel_4: item.nivel_4 || '',
            nivel_5: item.nivel_5 || ''
        });
        setShowRubricaModal(true);
    };

    const handleGuardarRubrica = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/habilidades-blandas/${rubricaForm.id}`, rubricaForm);
            Swal.fire({ title: 'Rúbrica Actualizada', icon: 'success', timer: 1500, showConfirmButton: false });
            setShowRubricaModal(false);
            fetchData();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo guardar la rúbrica.', 'error');
        }
    };

    const downloadRubricasTemplate = () => {
        const data = [{
            "Nombre Habilidad": "Liderazgo",
            "Nivel 1": "No asume responsabilidades...",
            "Nivel 2": "Asume responsabilidades mínimas...",
            "Nivel 3": "Dirige tareas básicas...",
            "Nivel 4": "Organiza y motiva al equipo...",
            "Nivel 5": "Inspira al grupo, toma decisiones efectivas..."
        }];
        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [{wch: 25}, {wch: 40}, {wch: 40}, {wch: 40}, {wch: 40}, {wch: 40}];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Guias_Evaluacion");
        XLSX.writeFile(workbook, "Plantilla_Carga_Masiva_Rubricas.xlsx");
    };

    const handleFileSelectRubricas = (e) => { 
        const file = e.target.files[0]; 
        if (file) { setFileRubricasToUpload(file); setFileNameRubricas(file.name); } 
    };

    const handleExtraerRubricas = async () => {
        if (!fileRubricasToUpload) return Swal.fire('Atención', 'Seleccione un archivo.', 'warning');
        
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            
            let actualizadas = 0;
            let noEncontradas = 0;
            const promesas = [];

            Swal.fire({ title: 'Procesando...', text: 'Actualizando guías de evaluación, por favor espere.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            for (const row of data) {
                const nombreHab = row["Nombre Habilidad"] || row["Nombre"] || row["Habilidad"];
                if (!nombreHab) continue;

                const habExistente = habilidades.find(h => h.nombre.trim().toLowerCase() === String(nombreHab).trim().toLowerCase());

                if (habExistente) {
                    // Armamos un payload limpio sin mandar los arreglos relacionales (EVITA ERROR 500)
                    const payload = {
                        nombre: habExistente.nombre,
                        descripcion: habExistente.descripcion,
                        nivel_1: row["Nivel 1"] || habExistente.nivel_1,
                        nivel_2: row["Nivel 2"] || habExistente.nivel_2,
                        nivel_3: row["Nivel 3"] || habExistente.nivel_3,
                        nivel_4: row["Nivel 4"] || habExistente.nivel_4,
                        nivel_5: row["Nivel 5"] || habExistente.nivel_5,
                    };
                    promesas.push(
                        api.put(`/habilidades-blandas/${habExistente.id}`, payload).then(() => actualizadas++)
                    );
                } else {
                    noEncontradas++;
                }
            }

            try {
                await Promise.all(promesas);
                fetchData();
                setShowImportRubricasModal(false);
                setFileRubricasToUpload(null);
                setFileNameRubricas('');
                
                Swal.fire(
                    '¡Carga Completada!', 
                    `Se actualizaron ${actualizadas} habilidades. ${noEncontradas > 0 ? `No se encontraron ${noEncontradas} habilidades por tener un nombre diferente.` : ''}`, 
                    'success'
                );
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'Hubo un problema al guardar algunas rúbricas.', 'error');
            }
        };
        reader.readAsBinaryString(fileRubricasToUpload);
    };

    // --- LÓGICA DE ACTIVIDADES GLOBALES ---
    const openGlobalActivitiesModal = async () => {
        try {
            const res = await api.get('/actividades-globales');
            setActividadesGlobales(res.data?.length ? res.data : ['']);
            setShowActividadesModal(true);
        } catch (error) { 
            setActividadesGlobales(['']); 
            setShowActividadesModal(true); 
        }
    };

    const handleActividadGlobalChange = (index, value) => { const nuevas = [...actividadesGlobales]; nuevas[index] = value; setActividadesGlobales(nuevas); };
    const agregarCampoActividadGlobal = () => setActividadesGlobales(['', ...actividadesGlobales]);
    const eliminarCampoActividadGlobal = (index) => { const nuevas = actividadesGlobales.filter((_, i) => i !== index); setActividadesGlobales(nuevas.length ? nuevas : ['']); };

    const handleGuardarActividadesGlobales = async (e) => {
        e.preventDefault();
        const limpias = actividadesGlobales.map(a => a.trim()).filter(a => a !== '');
        
        const unicas = new Set();
        const duplicadas = [];
        for (const act of limpias) {
            const actLower = act.toLowerCase();
            if (unicas.has(actLower)) {
                duplicadas.push(act);
            } else {
                unicas.add(actLower);
            }
        }

        if (duplicadas.length > 0) {
            return Swal.fire({
                icon: 'warning',
                title: 'Actividad Duplicada',
                text: `La actividad "${duplicadas[0]}" ya existe en tu lista. Por favor, elimina el duplicado antes de guardar.`,
                confirmButtonColor: '#a855f7' 
            });
        }

        try {
            const res = await api.post('/habilidades-blandas/actividades-globales', { actividades: limpias });
            Swal.fire({ title: '¡Éxito!', text: res.data?.message || 'Actividades aplicadas a todas las habilidades.', icon: 'success', timer: 2500, showConfirmButton: false });
            setShowActividadesModal(false); 
            fetchData();
        } catch (error) { 
            Swal.fire('Error', 'No se pudo guardar.', 'error'); 
        }
    };

    // --- LÓGICA DE METODOLOGÍAS GLOBALES ---
    const openGlobalMetodologiasModal = async () => {
        try {
            const res = await api.get('/metodologias-globales');
            setMetodologiasGlobales(res.data?.length ? res.data : ['']);
            setShowMetodologiasModal(true);
        } catch (error) { 
            setMetodologiasGlobales(['']); 
            setShowMetodologiasModal(true); 
        }
    };

    const handleMetodologiaGlobalChange = (index, value) => { const nuevas = [...metodologiasGlobales]; nuevas[index] = value; setMetodologiasGlobales(nuevas); };
    const agregarCampoMetodologiaGlobal = () => setMetodologiasGlobales(['', ...metodologiasGlobales]);
    const eliminarCampoMetodologiaGlobal = (index) => { const nuevas = metodologiasGlobales.filter((_, i) => i !== index); setMetodologiasGlobales(nuevas.length ? nuevas : ['']); };

    const handleGuardarMetodologiasGlobales = async (e) => {
        e.preventDefault();
        const limpias = metodologiasGlobales.map(m => m.trim()).filter(m => m !== '');
        
        const unicas = new Set();
        const duplicadas = [];
        for (const met of limpias) {
            const metLower = met.toLowerCase();
            if (unicas.has(metLower)) {
                duplicadas.push(met);
            } else {
                unicas.add(metLower);
            }
        }

        if (duplicadas.length > 0) {
            return Swal.fire({
                icon: 'warning',
                title: 'Metodología Duplicada',
                text: `La metodología "${duplicadas[0]}" ya existe en tu lista. Por favor, elimina el duplicado antes de guardar.`,
                confirmButtonColor: '#ea580c' 
            });
        }

        try {
            const res = await api.post('/habilidades-blandas/metodologias-globales', { metodologias: limpias });
            Swal.fire({ title: '¡Éxito!', text: res.data?.message || 'Metodologías aplicadas a todas las habilidades.', icon: 'success', timer: 2500, showConfirmButton: false });
            setShowMetodologiasModal(false); 
            fetchData();
        } catch (error) { 
            Swal.fire('Error', 'No se pudo guardar.', 'error'); 
        }
    };

    // --- MANEJO DE ARCHIVOS DE ACTIVIDADES Y METODOLOGÍAS ---
    const downloadActividadesTemplate = () => {
        const data = [{ Actividad: "Debate grupal sobre el tema" }, { Actividad: "Resolución de casos prácticos" }];
        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [{wch: 50}];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Actividades");
        XLSX.writeFile(workbook, "Plantilla_Actividades.xlsx");
    };

    const handleFileSelectActividades = (e) => { const file = e.target.files[0]; if (file) { setFileActividadesToUpload(file); setFileNameActividades(file.name); } };
    
    const handleExtraerActividades = () => {
        if (!fileActividadesToUpload) return Swal.fire('Atención', 'Seleccione un archivo.', 'warning');

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
            
            const currentActsLower = actividadesGlobales.map(a => a.trim().toLowerCase()).filter(a => a !== '');
            const finalActs = actividadesGlobales.filter(a => a.trim() !== '');
            
            let agregadas = 0;
            let duplicadas = 0;

            data.forEach((row, index) => {
                if (row[0] && typeof row[0] === 'string' && row[0].trim() !== '') {
                    if (index === 0 && row[0].toLowerCase().includes('actividad')) return;
                    
                    const actTrimmed = row[0].trim();
                    const actLower = actTrimmed.toLowerCase();
                    
                    if (!currentActsLower.includes(actLower)) {
                        finalActs.push(actTrimmed);
                        currentActsLower.push(actLower); 
                        agregadas++;
                    } else {
                        duplicadas++;
                    }
                }
            });

            if (agregadas > 0 || duplicadas > 0) {
                 setActividadesGlobales(finalActs.length ? finalActs : ['']); 
                 Swal.fire({
                     title: agregadas > 0 ? 'Extracción Exitosa' : 'Sin actividades nuevas',
                     text: `Se añadieron ${agregadas} actividades. ${duplicadas > 0 ? `Se omitieron ${duplicadas} por estar duplicadas.` : ''}`,
                     icon: agregadas > 0 ? 'success' : 'info',
                     confirmButtonColor: '#a855f7'
                 });
                 setShowImportActividadesModal(false);
                 setFileActividadesToUpload(null);
                 setFileNameActividades('');
            } else {
                 Swal.fire('Atención', 'No se encontraron actividades válidas en la primera columna.', 'warning');
            }
        };
        reader.readAsBinaryString(fileActividadesToUpload);
    };

    const downloadMetodologiasTemplate = () => {
        const data = [{ Metodologia: "Aprendizaje Basado en Proyectos" }, { Metodologia: "Flipped Classroom" }];
        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [{wch: 50}];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Metodologias");
        XLSX.writeFile(workbook, "Plantilla_Metodologias.xlsx");
    };

    const handleFileSelectMetodologias = (e) => { const file = e.target.files[0]; if (file) { setFileMetodologiasToUpload(file); setFileNameMetodologias(file.name); } };

    const handleExtraerMetodologias = () => {
        if (!fileMetodologiasToUpload) return Swal.fire('Atención', 'Seleccione un archivo.', 'warning');

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
            
            const currentMetsLower = metodologiasGlobales.map(m => m.trim().toLowerCase()).filter(m => m !== '');
            const finalMets = metodologiasGlobales.filter(m => m.trim() !== '');
            
            let agregadas = 0;
            let duplicadas = 0;

            data.forEach((row, index) => {
                if (row[0] && typeof row[0] === 'string' && row[0].trim() !== '') {
                    if (index === 0 && row[0].toLowerCase().includes('metodologia')) return;
                    
                    const metTrimmed = row[0].trim();
                    const metLower = metTrimmed.toLowerCase();
                    
                    if (!currentMetsLower.includes(metLower)) {
                        finalMets.push(metTrimmed);
                        currentMetsLower.push(metLower); 
                        agregadas++;
                    } else {
                        duplicadas++;
                    }
                }
            });

            if (agregadas > 0 || duplicadas > 0) {
                 setMetodologiasGlobales(finalMets.length ? finalMets : ['']); 
                 Swal.fire({
                     title: agregadas > 0 ? 'Extracción Exitosa' : 'Sin metodologías nuevas',
                     text: `Se añadieron ${agregadas} metodologías. ${duplicadas > 0 ? `Se omitieron ${duplicadas} por estar duplicadas.` : ''}`,
                     icon: agregadas > 0 ? 'success' : 'info',
                     confirmButtonColor: '#ea580c'
                 });
                 setShowImportMetodologiasModal(false);
                 setFileMetodologiasToUpload(null);
                 setFileNameMetodologias('');
            } else {
                 Swal.fire('Atención', 'No se encontraron metodologías válidas en la primera columna.', 'warning');
            }
        };
        reader.readAsBinaryString(fileMetodologiasToUpload);
    };

    // --- LÓGICA IMPORTACIÓN MASIVA DE HABILIDADES ---
    const downloadTemplate = () => {
        const data = [
            { Nombre: "Liderazgo", Descripcion: "Capacidad de guiar un equipo hacia una meta." },
            { Nombre: "Pensamiento Crítico", Descripcion: "Análisis objetivo de la información." }
        ];
        const worksheet = XLSX.utils.json_to_sheet(data);
        const wscols = [{wch: 30}, {wch: 60}];
        worksheet['!cols'] = wscols;
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Catálogo Habilidades");
        XLSX.writeFile(workbook, "Plantilla_Habilidades.xlsx");
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
            Swal.fire('Importación Exitosa', res.data.message, 'success');
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
                    <p className="text-gray-500 text-sm mt-1">Gestión de habilidades blandas, actividades, metodologías y guías de evaluación.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={openGlobalMetodologiasModal} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition text-sm">
                        <BriefcaseIcon className="h-5 w-5" /> Metodologías Globales
                    </button>
                    <button onClick={openGlobalActivitiesModal} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition text-sm">
                        <ClipboardDocumentListIcon className="h-5 w-5" /> Actividades Globales
                    </button>
                    {/* BOTÓN: GUÍAS DE EVALUACIÓN AHORA EN ROJO */}
                    <button onClick={() => setShowGuiasModal(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition text-sm">
                        <DocumentCheckIcon className="h-5 w-5" /> Guías de Evaluación
                    </button>
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
                    <input type="text" className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-100" placeholder="Buscar habilidad..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setCurrentPage(1); }} />
                </div>
            </div>

            {/* TABLA PRINCIPAL DE HABILIDADES */}
            <div className="flex flex-col flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Nombre</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/2">Descripción</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-1/6">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="3" className="text-center py-10 text-gray-500">Cargando catálogo...</td></tr>
                            ) : currentItems.length === 0 ? (
                                <tr><td colSpan="3" className="text-center py-12 text-gray-400">No se encontraron habilidades.</td></tr>
                            ) : (
                                currentItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                                                    <SparklesIcon className="h-5 w-5" />
                                                </div>
                                                <span className="font-bold text-gray-800">{item.nombre}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <p className="text-sm text-gray-600 line-clamp-3">
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

                {/* PAGINACIÓN */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                    <span className="text-sm text-gray-500">
                        Mostrando del <span className="font-bold text-gray-800">{currentItems.length > 0 ? indexOfFirstItem + 1 : 0}</span> al <span className="font-bold text-gray-800">{Math.min(indexOfLastItem, processedData.length)}</span> de <span className="font-bold text-gray-800">{processedData.length}</span> registros
                    </span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2 border rounded-lg hover:bg-white transition"><ChevronLeftIcon className="h-4 w-4" /></button>
                        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages===0} className="p-2 border rounded-lg hover:bg-white transition"><ChevronRightIcon className="h-4 w-4" /></button>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* MODAL 1: LISTADO DE GUÍAS DE EVALUACIÓN */}
            {/* ========================================================================= */}
            {showGuiasModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-8 py-6 bg-gradient-to-r from-red-600 to-red-800 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-wide">Gestor de Guías de Evaluación</h3>
                                <p className="text-red-100 text-sm mt-1">Configura los 5 niveles de calificación para cada habilidad.</p>
                            </div>
                            <button onClick={() => setShowGuiasModal(false)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <h4 className="text-sm font-bold text-gray-700">Habilidades Existentes</h4>
                            <button 
                                onClick={() => setShowImportRubricasModal(true)} 
                                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold transition text-xs border border-red-200 shadow-sm"
                            >
                                <CloudArrowUpIcon className="h-4 w-4" /> Carga Masiva de Rúbricas
                            </button>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-1 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {habilidades.map((hab) => {
                                    const tieneRubrica = hab.nivel_1 && hab.nivel_5; 
                                    return (
                                        <div key={hab.id} className="p-4 rounded-xl border border-gray-200 bg-white hover:border-red-300 transition shadow-sm flex flex-col justify-between">
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <span className="font-bold text-gray-800 text-sm">{hab.nombre}</span>
                                                {tieneRubrica ? (
                                                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-green-200 whitespace-nowrap">Configurada</span>
                                                ) : (
                                                    <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-200 whitespace-nowrap">Pendiente</span>
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => openRubricaModal(hab)} 
                                                className="w-full py-2 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg text-xs font-bold text-red-600 transition flex items-center justify-center gap-2"
                                            >
                                                <PencilSquareIcon className="h-4 w-4"/> Editar 5 Niveles
                                            </button>
                                        </div>
                                    )
                                })}
                                {habilidades.length === 0 && (
                                    <div className="col-span-2 text-center text-gray-400 py-10 text-sm font-medium">
                                        No hay habilidades creadas aún.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 2: EDITAR LOS 5 NIVELES (RÚBRICA INDIVIDUAL) */}
            {/* ========================================================================= */}
            {showRubricaModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-red-100">
                        <div className="px-8 py-6 bg-red-50 flex justify-between items-center shrink-0 border-b border-red-100">
                            <div>
                                <h3 className="text-xl font-bold text-red-900">Editar Rúbrica</h3>
                                <p className="text-red-600 text-sm font-medium">Habilidad: <span className="font-bold">{rubricaForm.nombre}</span></p>
                            </div>
                            <button onClick={() => setShowRubricaModal(false)} className="p-2 bg-red-100 rounded-full text-red-600 hover:bg-red-200 transition-colors">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <form id="rubricaForm" onSubmit={handleGuardarRubrica} className="space-y-5">
                                {[1, 2, 3, 4, 5].map(nivel => (
                                    <div key={nivel} className="space-y-1">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-xs shadow-sm ${nivel === 1 ? 'bg-red-600' : nivel === 2 ? 'bg-orange-500' : nivel === 3 ? 'bg-yellow-500' : nivel === 4 ? 'bg-lime-500' : 'bg-green-700'}`}>
                                                {nivel}
                                            </span>
                                            Criterio Nivel {nivel}
                                        </label>
                                        <textarea 
                                            required 
                                            placeholder={`Describe qué debe cumplir el estudiante para obtener el nivel ${nivel}...`} 
                                            rows="2" 
                                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-700 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none resize-none shadow-sm"
                                            value={rubricaForm[`nivel_${nivel}`]} 
                                            onChange={e => setRubricaForm({...rubricaForm, [`nivel_${nivel}`]: e.target.value})} 
                                        />
                                    </div>
                                ))}
                            </form>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50 shrink-0">
                            <button type="button" onClick={() => setShowRubricaModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-200 transition-all">Regresar</button>
                            <button type="submit" form="rubricaForm" className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold shadow-lg shadow-red-500/30 hover:bg-red-700 transition-all">
                                Guardar Niveles
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 3: CARGA MASIVA DE RÚBRICAS DESDE EXCEL */}
            {/* ========================================================================= */}
            {showImportRubricasModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-8 relative overflow-hidden flex flex-col max-h-[90vh]">
                        
                        <div className="text-center mb-6 shrink-0">
                            <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100">
                                <DocumentCheckIcon className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Importar Rúbricas (5 Niveles)</h3>
                            <p className="text-sm text-gray-500 mt-1">Sube un Excel para actualizar las guías de evaluación masivamente.</p>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-1 mb-6 pr-2">
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                                        <DocumentTextIcon className="h-5 w-5 text-slate-500"/>
                                        Formato Requerido
                                    </h4>
                                    <button onClick={downloadRubricasTemplate} className="text-xs flex items-center gap-1 text-red-700 hover:text-red-800 font-semibold bg-white px-3 py-1.5 rounded-lg border border-red-200 shadow-sm transition-all hover:shadow-md">
                                        <ArrowDownTrayIcon className="h-4 w-4" /> Descargar Plantilla
                                    </button>
                                </div>
                                <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm bg-white">
                                    <table className="min-w-full text-xs text-left whitespace-nowrap">
                                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                                            <tr>
                                                <th className="px-3 py-2.5 border-r">Nombre Habilidad</th>
                                                <th className="px-3 py-2.5 border-r">Nivel 1</th>
                                                <th className="px-3 py-2.5 border-r">Nivel 2...</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-slate-600">
                                            <tr className="border-b border-slate-100">
                                                <td className="px-3 py-2.5 border-r font-medium">Liderazgo</td>
                                                <td className="px-3 py-2.5 border-r italic text-gray-400">Texto nivel 1</td>
                                                <td className="px-3 py-2.5 border-r italic text-gray-400">Texto nivel 2...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-3">
                                    <span className="text-red-500 font-bold">* Importante:</span> El <span className="font-bold">Nombre Habilidad</span> debe coincidir exactamente con una habilidad ya creada en el sistema. Los niveles se asignarán a esa habilidad, sin importar en cuántas materias se use.
                                </p>
                            </div>

                            <div onClick={() => fileInputRubricasRef.current.click()} className="border-2 border-dashed border-red-300 bg-red-50/50 rounded-xl p-8 cursor-pointer hover:bg-red-50 transition-colors group text-center">
                                <input type="file" ref={fileInputRubricasRef} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileSelectRubricas} className="hidden" />
                                {fileNameRubricas ? (
                                    <div className="flex flex-col items-center">
                                        <DocumentCheckIcon className="h-10 w-10 text-red-600 mb-2" />
                                        <span className="text-red-800 font-semibold break-all">{fileNameRubricas}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <p className="text-red-700 font-bold text-lg">Clic aquí para seleccionar archivo Excel</p>
                                        <p className="text-sm text-red-600/70 mt-1">Buscaremos coincidencias por nombre</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 shrink-0 border-t border-gray-100 pt-4">
                            <button onClick={() => {setShowImportRubricasModal(false); setFileRubricasToUpload(null); setFileNameRubricas('');}} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleExtraerRubricas} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all ${fileRubricasToUpload ? 'bg-red-600 hover:bg-red-700 shadow-red-500/40 hover:-translate-y-0.5' : 'bg-gray-300 cursor-not-allowed'}`} disabled={!fileRubricasToUpload}>
                                Procesar Rúbricas
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL CREAR/EDITAR HABILIDAD --- */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="px-8 py-6 bg-gradient-to-r from-blue-700 to-indigo-800 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-wide">{isEditing ? 'Editar Habilidad' : 'Nueva Habilidad'}</h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-8">
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
                            </form>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50 shrink-0">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-200 transition-all">Cancelar</button>
                            <button type="submit" form="skillForm" className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 transition-all">
                                {isEditing ? 'Guardar Cambios' : 'Crear Habilidad'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL PRINCIPAL: ACTIVIDADES GLOBALES --- */}
            {showActividadesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-8 py-6 bg-gradient-to-r from-purple-700 to-fuchsia-800 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-wide">Actividades Globales</h3>
                            </div>
                            <button onClick={() => setShowActividadesModal(false)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <form id="globalActivitiesForm" onSubmit={handleGuardarActividadesGlobales} className="space-y-6">
                                <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-3">
                                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                        <ListBulletIcon className="h-5 w-5 text-purple-600"/> Lista de Actividades
                                    </label>
                                    
                                    <div className="flex items-center gap-2">
                                        <button 
                                            type="button" 
                                            onClick={() => setShowImportActividadesModal(true)} 
                                            className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-100 border border-purple-200 transition font-bold flex items-center gap-1 shadow-sm"
                                        >
                                            <CloudArrowUpIcon className="h-4 w-4" /> Carga Masiva
                                        </button>

                                        <button 
                                            type="button" 
                                            onClick={agregarCampoActividadGlobal} 
                                            className="text-xs bg-fuchsia-50 text-fuchsia-700 px-3 py-1.5 rounded-lg hover:bg-fuchsia-100 transition font-bold shadow-sm"
                                        >
                                            + Añadir Opción
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    {actividadesGlobales.map((act, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <span className="text-gray-400 font-bold text-sm w-4">{actividadesGlobales.length - idx}.</span>
                                            <input 
                                                type="text" 
                                                className="flex-1 border border-gray-300 rounded-lg p-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                                                placeholder={`Ej: Debate grupal...`}
                                                value={act}
                                                onChange={(e) => handleActividadGlobalChange(idx, e.target.value)}
                                            />
                                            <button type="button" onClick={() => eliminarCampoActividadGlobal(idx)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                                                <TrashIcon className="h-5 w-5"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50 shrink-0">
                            <button type="button" onClick={() => setShowActividadesModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-200 transition-all">Cancelar</button>
                            <button type="submit" form="globalActivitiesForm" className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold shadow-lg shadow-purple-500/30 hover:-translate-y-0.5 transition-all">
                                Guardar para Todas
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL PRINCIPAL: METODOLOGÍAS GLOBALES --- */}
            {showMetodologiasModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-8 py-6 bg-gradient-to-r from-orange-600 to-amber-700 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-wide">Metodologías Globales</h3>
                            </div>
                            <button onClick={() => setShowMetodologiasModal(false)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <form id="globalMetodologiasForm" onSubmit={handleGuardarMetodologiasGlobales} className="space-y-6">
                                <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-3">
                                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                        <BriefcaseIcon className="h-5 w-5 text-orange-600"/> Lista de Metodologías
                                    </label>
                                    
                                    <div className="flex items-center gap-2">
                                        <button 
                                            type="button" 
                                            onClick={() => setShowImportMetodologiasModal(true)} 
                                            className="text-xs bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 border border-orange-200 transition font-bold flex items-center gap-1 shadow-sm"
                                        >
                                            <CloudArrowUpIcon className="h-4 w-4" /> Carga Masiva
                                        </button>

                                        <button 
                                            type="button" 
                                            onClick={agregarCampoMetodologiaGlobal} 
                                            className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition font-bold shadow-sm"
                                        >
                                            + Añadir Opción
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    {metodologiasGlobales.map((met, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <span className="text-gray-400 font-bold text-sm w-4">{metodologiasGlobales.length - idx}.</span>
                                            <input 
                                                type="text" 
                                                className="flex-1 border border-gray-300 rounded-lg p-3 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                                                placeholder={`Ej: Aprendizaje Basado en Proyectos...`}
                                                value={met}
                                                onChange={(e) => handleMetodologiaGlobalChange(idx, e.target.value)}
                                            />
                                            <button type="button" onClick={() => eliminarCampoMetodologiaGlobal(idx)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                                                <TrashIcon className="h-5 w-5"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50 shrink-0">
                            <button type="button" onClick={() => setShowMetodologiasModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-200 transition-all">Cancelar</button>
                            <button type="submit" form="globalMetodologiasForm" className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 transition-all">
                                Guardar para Todas
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SUB-MODAL: IMPORTACIÓN MASIVA DE ACTIVIDADES --- */}
            {showImportActividadesModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 relative overflow-hidden flex flex-col max-h-[90vh]">
                        
                        <div className="text-center mb-6 shrink-0">
                            <div className="mx-auto w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4 border border-purple-100">
                                <CloudArrowUpIcon className="h-8 w-8 text-purple-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Carga Masiva de Actividades</h3>
                            <p className="text-sm text-gray-500 mt-1">Sube un archivo para rellenar la lista de actividades.</p>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-1 mb-6 pr-2">
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                                        <DocumentTextIcon className="h-5 w-5 text-slate-500"/>
                                        Estructura del Archivo
                                    </h4>
                                    <button onClick={downloadActividadesTemplate} className="text-xs flex items-center gap-1 text-purple-700 hover:text-purple-800 font-semibold bg-white px-3 py-1.5 rounded-lg border border-purple-200 shadow-sm transition-all hover:shadow-md">
                                        <ArrowDownTrayIcon className="h-4 w-4" /> Plantilla
                                    </button>
                                </div>
                                <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm bg-white">
                                    <table className="min-w-full text-xs text-left whitespace-nowrap">
                                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                                            <tr>
                                                <th className="px-3 py-2.5">Actividad <span className="text-red-500">*</span></th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-slate-600">
                                            <tr className="border-b border-slate-100">
                                                <td className="px-3 py-2.5 font-medium">Debate grupal sobre el tema...</td>
                                            </tr>
                                            <tr>
                                                <td className="px-3 py-2.5 font-medium">Resolución de casos prácticos...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-3 flex items-center gap-1">
                                    <span className="text-red-500 font-bold">*</span> Solo se extraerá la primera columna de tu archivo.
                                </p>
                            </div>

                            <div onClick={() => fileInputActividadesRef.current.click()} className="border-2 border-dashed border-purple-300 bg-purple-50/50 rounded-xl p-8 cursor-pointer hover:bg-purple-50 transition-colors group text-center">
                                <input type="file" ref={fileInputActividadesRef} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileSelectActividades} className="hidden" />
                                {fileNameActividades ? (
                                    <div className="flex flex-col items-center">
                                        <DocumentTextIcon className="h-10 w-10 text-purple-600 mb-2" />
                                        <span className="text-purple-800 font-semibold break-all">{fileNameActividades}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <p className="text-purple-700 font-bold text-lg">Clic aquí para seleccionar archivo</p>
                                        <p className="text-sm text-purple-600/70 mt-1">Soporta Excel (.xlsx) y CSV</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 shrink-0 border-t border-gray-100 pt-4">
                            <button onClick={() => {setShowImportActividadesModal(false); setFileActividadesToUpload(null); setFileNameActividades('');}} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleExtraerActividades} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all ${fileActividadesToUpload ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:shadow-purple-500/40 hover:-translate-y-0.5' : 'bg-gray-300 cursor-not-allowed'}`} disabled={!fileActividadesToUpload}>
                                Extraer Actividades
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SUB-MODAL: IMPORTACIÓN MASIVA DE METODOLOGÍAS --- */}
            {showImportMetodologiasModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 relative overflow-hidden flex flex-col max-h-[90vh]">
                        
                        <div className="text-center mb-6 shrink-0">
                            <div className="mx-auto w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4 border border-orange-100">
                                <CloudArrowUpIcon className="h-8 w-8 text-orange-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Carga Masiva de Metodologías</h3>
                            <p className="text-sm text-gray-500 mt-1">Sube un archivo para rellenar la lista de metodologías.</p>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-1 mb-6 pr-2">
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                                        <DocumentTextIcon className="h-5 w-5 text-slate-500"/>
                                        Estructura del Archivo
                                    </h4>
                                    <button onClick={downloadMetodologiasTemplate} className="text-xs flex items-center gap-1 text-orange-700 hover:text-orange-800 font-semibold bg-white px-3 py-1.5 rounded-lg border border-orange-200 shadow-sm transition-all hover:shadow-md">
                                        <ArrowDownTrayIcon className="h-4 w-4" /> Plantilla
                                    </button>
                                </div>
                                <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm bg-white">
                                    <table className="min-w-full text-xs text-left whitespace-nowrap">
                                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                                            <tr>
                                                <th className="px-3 py-2.5">Metodología <span className="text-red-500">*</span></th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-slate-600">
                                            <tr className="border-b border-slate-100">
                                                <td className="px-3 py-2.5 font-medium">Aprendizaje Basado en Proyectos...</td>
                                            </tr>
                                            <tr>
                                                <td className="px-3 py-2.5 font-medium">Flipped Classroom...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-3 flex items-center gap-1">
                                    <span className="text-red-500 font-bold">*</span> Solo se extraerá la primera columna de tu archivo.
                                </p>
                            </div>

                            <div onClick={() => fileInputMetodologiasRef.current.click()} className="border-2 border-dashed border-orange-300 bg-orange-50/50 rounded-xl p-8 cursor-pointer hover:bg-orange-50 transition-colors group text-center">
                                <input type="file" ref={fileInputMetodologiasRef} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileSelectMetodologias} className="hidden" />
                                {fileNameMetodologias ? (
                                    <div className="flex flex-col items-center">
                                        <DocumentTextIcon className="h-10 w-10 text-orange-600 mb-2" />
                                        <span className="text-orange-800 font-semibold break-all">{fileNameMetodologias}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <p className="text-orange-700 font-bold text-lg">Clic aquí para seleccionar archivo</p>
                                        <p className="text-sm text-orange-600/70 mt-1">Soporta Excel (.xlsx) y CSV</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 shrink-0 border-t border-gray-100 pt-4">
                            <button onClick={() => {setShowImportMetodologiasModal(false); setFileMetodologiasToUpload(null); setFileNameMetodologias('');}} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleExtraerMetodologias} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all ${fileMetodologiasToUpload ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:shadow-orange-500/40 hover:-translate-y-0.5' : 'bg-gray-300 cursor-not-allowed'}`} disabled={!fileMetodologiasToUpload}>
                                Extraer Metodologías
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL IMPORTAR MASIVO DE HABILIDADES --- */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 relative overflow-hidden flex flex-col max-h-[90vh]">
                        
                        <div className="text-center mb-6 shrink-0">
                            <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 border border-green-100">
                                <CloudArrowUpIcon className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Carga Masiva de Habilidades</h3>
                            <p className="text-sm text-gray-500 mt-1">Sube un archivo para crear múltiples habilidades rápidamente.</p>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-1 mb-6 pr-2">
                            
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                                        <DocumentTextIcon className="h-5 w-5 text-slate-500"/>
                                        Estructura del Archivo
                                    </h4>
                                    <button onClick={downloadTemplate} className="text-xs flex items-center gap-1 text-green-700 hover:text-green-800 font-semibold bg-white px-3 py-1.5 rounded-lg border border-green-200 shadow-sm transition-all hover:shadow-md">
                                        <ArrowDownTrayIcon className="h-4 w-4" /> Plantilla
                                    </button>
                                </div>
                                
                                <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm bg-white">
                                    <table className="min-w-full text-xs text-left whitespace-nowrap">
                                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                                            <tr>
                                                <th className="px-3 py-2.5 border-r border-slate-300">Nombre <span className="text-red-500">*</span></th>
                                                <th className="px-3 py-2.5">Descripción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-slate-600">
                                            <tr className="border-b border-slate-100">
                                                <td className="px-3 py-2.5 border-r border-slate-200 font-medium">Liderazgo</td>
                                                <td className="px-3 py-2.5 text-gray-500">Capacidad de guiar a un grupo...</td>
                                            </tr>
                                            <tr>
                                                <td className="px-3 py-2.5 border-r border-slate-200 font-medium">Creatividad</td>
                                                <td className="px-3 py-2.5 text-gray-500">Generar ideas innovadoras...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-3 flex items-center gap-1">
                                    <span className="text-red-500 font-bold">*</span> La primera columna es obligatoria. Las actividades se asignarán automáticamente según la configuración global.
                                </p>
                            </div>

                            <div onClick={handleClickUploadArea} className="border-2 border-dashed border-green-300 bg-green-50/50 rounded-xl p-8 cursor-pointer hover:bg-green-50 transition-colors group text-center">
                                <input type="file" ref={fileInputRef} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileSelect} className="hidden" />
                                {fileName ? (
                                    <div className="flex flex-col items-center">
                                        <DocumentTextIcon className="h-10 w-10 text-green-600 mb-2" />
                                        <span className="text-green-800 font-semibold break-all">{fileName}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <p className="text-green-700 font-bold text-lg">Clic aquí para seleccionar archivo</p>
                                        <p className="text-sm text-green-600/70 mt-1">Soporta Excel (.xlsx) y CSV</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 shrink-0 border-t border-gray-100 pt-4">
                            <button onClick={() => {setShowImportModal(false); setFileToUpload(null); setFileName('');}} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleImportar} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all ${fileToUpload ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-green-500/40 hover:-translate-y-0.5' : 'bg-gray-300 cursor-not-allowed'}`} disabled={!fileToUpload}>
                                Subir Archivo
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default GestionHabilidades;