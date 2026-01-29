import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { 
    AcademicCapIcon, 
    CloudArrowUpIcon, 
    MagnifyingGlassIcon, 
    ArrowDownTrayIcon,
    CalendarDaysIcon,
    FolderIcon,
    FolderOpenIcon,
    DocumentTextIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    ComputerDesktopIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const Matriculacion = () => {
    // --- ESTADOS ---
    const [periodoActivo, setPeriodoActivo] = useState(null);
    const [matriculados, setMatriculados] = useState([]);
    
    // Catalogos
    const [listaCiclos, setListaCiclos] = useState([]);
    const [listaCarreras, setListaCarreras] = useState([]); 

    // Selecciones del Usuario
    const [carreraSeleccionada, setCarreraSeleccionada] = useState(null); 
    const [cicloSeleccionado, setCicloSeleccionado] = useState(null);
    
    const [loading, setLoading] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [showModalCarga, setShowModalCarga] = useState(false);

    // PAGINACIÓN (AJUSTADO A 6)
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6; 

    // Carga Masiva
    const fileInputRef = useRef(null);
    const [fileToUpload, setFileToUpload] = useState(null);

    // 1. INICIALIZACIÓN
    useEffect(() => {
        const init = async () => {
            try {
                const [resPer, resCic, resCar] = await Promise.all([
                    api.get('/periodos'),
                    api.get('/ciclos'),
                    api.get('/carreras') 
                ]);

                // A. Periodo Activo
                const activo = resPer.data.find(p => p.activo === 1 || p.activo === true);
                if (activo) {
                    setPeriodoActivo(activo);
                } 

                // B. Ciclos
                setListaCiclos(resCic.data);

                // C. Carreras
                setListaCarreras(resCar.data);
                if(resCar.data.length > 0) setCarreraSeleccionada(resCar.data[0]);

            } catch (e) { 
                console.error(e); 
            }
        };
        init();
    }, []);

    // 2. CARGAR MATRICULADOS
    useEffect(() => {
        if (periodoActivo) {
            fetchMatriculados();
        }
    }, [periodoActivo]);

    const fetchMatriculados = async () => {
        if(!periodoActivo) return;
        setLoading(true);
        try {
            const res = await api.get(`/matriculas/periodo/${periodoActivo.id}`);
            setMatriculados(res.data);
        } catch (error) {
            console.error(error);
        } finally { setLoading(false); }
    };

    // --- FILTRADO Y PAGINACIÓN ---
    const getFilteredAndSortedData = () => {
        if (!carreraSeleccionada || !cicloSeleccionado) return [];
        
        let filtered = matriculados.filter(m => {
            return (
                m.carrera === carreraSeleccionada.nombre &&
                m.ciclo === cicloSeleccionado.nombre &&
                (m.nombres.toLowerCase().includes(busqueda.toLowerCase()) || m.cedula.includes(busqueda))
            );
        });

        // Ordenar Alfabéticamente por Nombres
        filtered.sort((a, b) => a.nombres.localeCompare(b.nombres));
        return filtered;
    };

    const processedData = getFilteredAndSortedData();
    const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = processedData.slice(indexOfFirstItem, indexOfLastItem);

    // Resetear paginación al cambiar filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [carreraSeleccionada, cicloSeleccionado, busqueda]);

    // --- IMPORTACIÓN ---
    const downloadTemplate = () => {
        const data = [{ 
            Cedula: "1234567890", 
            Carrera: carreraSeleccionada.nombre, 
            Ciclo: cicloSeleccionado.nombre 
        }];
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{wch: 15}, {wch: 25}, {wch: 10}];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, `Plantilla_Matricula_${carreraSeleccionada.nombre}_${cicloSeleccionado.nombre}.xlsx`);
    };

    const handleFileSelect = (e) => { const file = e.target.files[0]; if (file) setFileToUpload(file); };

    const handleImportar = async () => {
        if (!fileToUpload) return Swal.fire('Error', 'Selecciona un archivo', 'warning');
        if (!periodoActivo) return Swal.fire('Error', 'No hay periodo activo', 'error'); 
        
        Swal.fire({ title: 'Procesando...', text: 'Matriculando...', didOpen: () => Swal.showLoading() });
        
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

            const res = await api.post('/matriculas/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            Swal.fire('Éxito', res.data.message, 'success');
            setFileToUpload(null);
            setShowModalCarga(false);
            fetchMatriculados();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Falló la importación', 'error');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in p-6 bg-gray-50 min-h-screen flex flex-col">
            
            {/* 1. ENCABEZADO + PERIODO */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <AcademicCapIcon className="h-8 w-8 text-blue-600"/> Gestión de Matrículas
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Asignación de estudiantes por ciclo y carrera.
                    </p>
                </div>
                
                <div className={`bg-white border px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-3 transition-colors duration-300
                    ${periodoActivo ? 'border-blue-100' : 'border-red-200 bg-red-50'}
                `}>
                    <div className={`p-2 rounded-lg ${periodoActivo ? 'bg-blue-100 text-blue-600' : 'bg-white text-red-500 shadow-sm'}`}>
                        {periodoActivo ? <CalendarDaysIcon className="h-5 w-5"/> : <ExclamationCircleIcon className="h-5 w-5"/>}
                    </div>
                    <div>
                        <p className={`text-[10px] uppercase font-bold tracking-wider ${periodoActivo ? 'text-gray-400' : 'text-red-400'}`}>
                            Periodo Activo
                        </p>
                        <p className={`text-sm font-bold leading-none ${periodoActivo ? 'text-gray-800' : 'text-red-700'}`}>
                            {periodoActivo ? periodoActivo.nombre : 'Sin Asignar'}
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. SELECCIÓN DE CARRERA */}
            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex gap-2 w-fit">
                {listaCarreras.map(carrera => (
                    <button
                        key={carrera.id}
                        onClick={() => { setCarreraSeleccionada(carrera); setCicloSeleccionado(null); }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200
                            ${carreraSeleccionada?.id === carrera.id 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }
                        `}
                    >
                        <ComputerDesktopIcon className="h-5 w-5"/>
                        {carrera.nombre}
                    </button>
                ))}
            </div>

            {/* 3. CUERPO PRINCIPAL */}
            <div className="flex-1 flex gap-6 min-h-0 bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                
                {/* SIDEBAR CICLOS */}
                <aside className="w-64 bg-gray-50 border-r border-gray-100 flex flex-col">
                    <div className="p-5 border-b border-gray-100">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Ciclos - {carreraSeleccionada?.nombre}
                        </h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        {listaCiclos.map(ciclo => (
                            <button
                                key={ciclo.id}
                                onClick={() => setCicloSeleccionado(ciclo)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                                    ${cicloSeleccionado?.id === ciclo.id 
                                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-100' 
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    {cicloSeleccionado?.id === ciclo.id 
                                        ? <FolderOpenIcon className="h-5 w-5 text-blue-500"/> 
                                        : <FolderIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-500"/>
                                    }
                                    <span>Ciclo {ciclo.nombre}</span>
                                </div>
                                {cicloSeleccionado?.id === ciclo.id && <ChevronRightIcon className="h-4 w-4 text-blue-500"/>}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* CONTENIDO DERECHO */}
                <main className="flex-1 flex flex-col relative">
                    {cicloSeleccionado ? (
                        <>
                            {/* TOOLBAR CONTEXTUAL */}
                            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <span className="text-blue-600">{carreraSeleccionada.nombre}</span>
                                        <span className="text-gray-300">/</span>
                                        <span>Ciclo {cicloSeleccionado.nombre}</span>
                                    </h1>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {processedData.length} estudiantes matriculados
                                    </p>
                                </div>
                                
                                <div className="flex gap-3">
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
                                        <input 
                                            type="text" 
                                            placeholder="Buscar estudiante..." 
                                            className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 text-sm w-64 transition"
                                            value={busqueda}
                                            onChange={(e) => setBusqueda(e.target.value)}
                                        />
                                    </div>

                                    <button 
                                        onClick={() => { 
                                            if(!periodoActivo) return Swal.fire('Alto', 'No hay periodo activo para cargar datos.', 'error');
                                            setFileToUpload(null); 
                                            setShowModalCarga(true); 
                                        }}
                                        className={`flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition text-sm active:scale-95
                                            ${periodoActivo 
                                                ? 'bg-green-600 hover:bg-green-700 shadow-green-100' 
                                                : 'bg-gray-300 cursor-not-allowed shadow-none'
                                            }
                                        `}
                                    >
                                        <CloudArrowUpIcon className="h-5 w-5"/> 
                                        Cargar Nómina
                                    </button>
                                </div>
                            </div>

                            {/* TABLA DE ESTUDIANTES */}
                            <div className="flex-1 overflow-auto p-6">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            <th className="px-4 py-3 pb-4">Identificación</th>
                                            <th className="px-4 py-3 pb-4">Estudiante / Email</th>
                                            <th className="px-4 py-3 pb-4 text-center">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {currentItems.length === 0 ? (
                                            <tr><td colSpan="3" className="p-12 text-center text-gray-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <DocumentTextIcon className="h-12 w-12 text-gray-200"/>
                                                    <span>No hay resultados.</span>
                                                </div>
                                            </td></tr>
                                        ) : (
                                            currentItems.map(m => (
                                                <tr key={m.id} className="hover:bg-blue-50/30 transition group">
                                                    <td className="px-4 py-4 text-sm font-mono text-gray-600">
                                                        {m.cedula}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="font-bold text-gray-900">{m.nombres}</div>
                                                        <div className="text-xs text-gray-500">{m.email}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${m.estado === 'Activo' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                            {m.estado}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                             {/* --- PAGINACIÓN --- */}
                             <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                                <span className="text-sm text-gray-500">
                                    Mostrando del <span className="font-bold text-gray-800">{currentItems.length > 0 ? indexOfFirstItem + 1 : 0}</span> al <span className="font-bold text-gray-800">{Math.min(indexOfLastItem, processedData.length)}</span> de <span className="font-bold text-gray-800">{processedData.length}</span> estudiantes
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

                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                            <FolderIcon className="h-20 w-20 mb-4 opacity-20"/>
                            <p className="text-lg font-medium text-gray-400">Selecciona un ciclo para ver el listado</p>
                        </div>
                    )}
                </main>
            </div>

            {/* MODAL CARGA MASIVA */}
            {showModalCarga && cicloSeleccionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gray-900 px-6 py-5 flex justify-between items-center">
                            <div className="text-white">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <CloudArrowUpIcon className="h-5 w-5 text-green-400"/> 
                                    Subir Nómina
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {carreraSeleccionada.nombre} • Ciclo {cicloSeleccionado.nombre}
                                </p>
                            </div>
                            <button onClick={() => setShowModalCarga(false)} className="text-white/60 hover:text-white transition rounded-full p-1 hover:bg-white/10">✕</button>
                        </div>

                        <div className="p-6 space-y-5">
                            <button 
                                onClick={downloadTemplate}
                                className="w-full py-3 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition"
                            >
                                <ArrowDownTrayIcon className="h-5 w-5 text-green-600"/>
                                Descargar Plantilla
                            </button>

                            <div 
                                onClick={() => fileInputRef.current.click()}
                                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition group
                                    ${fileToUpload ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}
                                `}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".xlsx,.csv" />
                                {fileToUpload ? (
                                    <>
                                        <DocumentTextIcon className="h-10 w-10 text-green-600 mb-2"/>
                                        <span className="font-bold text-green-700 text-center text-sm break-all">{fileToUpload.name}</span>
                                        <span className="text-xs text-green-600 mt-1">Listo para procesar</span>
                                    </>
                                ) : (
                                    <>
                                        <CloudArrowUpIcon className="h-10 w-10 text-gray-400 mb-2 group-hover:text-blue-500 transition"/>
                                        <span className="text-sm text-gray-500 font-medium group-hover:text-blue-600">Clic para seleccionar Excel</span>
                                    </>
                                )}
                            </div>

                            <button 
                                onClick={handleImportar}
                                disabled={!fileToUpload}
                                className={`w-full py-3 rounded-xl font-bold text-white transition shadow-lg
                                    ${!fileToUpload ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700 shadow-green-200 active:scale-95'}
                                `}
                            >
                                Procesar Matriculación
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Matriculacion;