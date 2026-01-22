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
    ExclamationTriangleIcon,
    FunnelIcon,
    QueueListIcon, // Icono para el listado
    DocumentTextIcon
} from '@heroicons/react/24/outline';

const Matriculacion = () => {
    // --- ESTADOS ---
    const [periodoActivo, setPeriodoActivo] = useState(null);
    const [matriculados, setMatriculados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('listado'); // 'listado' | 'masiva'
    
    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroCiclo, setFiltroCiclo] = useState('');
    const [listaCiclos, setListaCiclos] = useState([]);

    // Carga Masiva
    const fileInputRef = useRef(null);
    const [fileToUpload, setFileToUpload] = useState(null);

    // 1. INICIALIZACIÓN
    useEffect(() => {
        const init = async () => {
            try {
                // A. Periodo
                const resPer = await api.get('/periodos'); 
                const activo = resPer.data.find(p => p.activo === 1 || p.activo === true);
                
                // B. Ciclos
                const resCic = await api.get('/ciclos');
                setListaCiclos(resCic.data);

                if (activo) {
                    setPeriodoActivo(activo);
                } else {
                    Swal.fire({
                        title: 'Sin Periodo Activo',
                        text: 'El administrador no ha activado ningún periodo académico.',
                        icon: 'warning',
                        confirmButtonText: 'Entendido'
                    });
                }
            } catch (e) { 
                console.error(e); 
                Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
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

    // --- IMPORTACIÓN ---
    const downloadTemplate = () => {
        const data = [{ Cedula: "1234567890", Carrera: "Software", Ciclo: "III" }];
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{wch: 15}, {wch: 20}, {wch: 10}];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Matricula");
        XLSX.writeFile(wb, "Plantilla_Matricula.xlsx");
    };

    const handleFileSelect = (e) => { const file = e.target.files[0]; if (file) setFileToUpload(file); };
    const handleClickUploadArea = () => { fileInputRef.current.click(); };

    const handleImportar = async () => {
        if (!fileToUpload) return Swal.fire('Error', 'Selecciona un archivo', 'warning');
        if (!periodoActivo) return Swal.fire('Error', 'No hay periodo activo', 'error');
        
        Swal.fire({ title: 'Procesando...', text: 'Analizando archivo...', didOpen: () => Swal.showLoading() });
        
        try {
            // Conversión a CSV
            let fileToSend = fileToUpload;
            if (fileToUpload.name.endsWith('.xlsx') || fileToUpload.name.endsWith('.xls')) {
                const data = await fileToUpload.arrayBuffer();
                const workbook = XLSX.read(data);
                const wsname = workbook.SheetNames[0];
                const ws = workbook.Sheets[wsname];
                const csvData = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
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
            fetchMatriculados();
            setActiveTab('listado');
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Falló la importación', 'error');
        }
    };

    // --- FILTRADO VISUAL ---
    const dataFiltrada = matriculados.filter(m => {
        const matchTexto = m.nombres.toLowerCase().includes(busqueda.toLowerCase()) || m.cedula.includes(busqueda);
        const matchCiclo = filtroCiclo ? m.ciclo === filtroCiclo : true;
        return matchTexto && matchCiclo;
    });

    if (!periodoActivo && !loading) {
        return (
            <div className="p-10 flex flex-col items-center justify-center text-center h-screen bg-gray-50">
                <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">No hay Periodo Académico Activo</h2>
                <p className="text-gray-500 mt-2 max-w-md">Solicita al Administrador que active un periodo.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            
            {/* CABECERA (Estilo Gestión Usuarios) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Gestión de Matrículas</h2>
                    <p className="text-gray-500 text-sm mt-1">Asignación de estudiantes a ciclos y carreras</p>
                </div>
                
                {/* Badge del Periodo Activo */}
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl">
                    <CalendarDaysIcon className="h-5 w-5 text-blue-600"/>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Periodo Activo</span>
                        <span className="text-sm font-bold text-blue-800 leading-none">{periodoActivo?.nombre}</span>
                    </div>
                </div>
            </div>

            {/* TABS (Estilo Gestión Usuarios) */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button 
                        onClick={() => setActiveTab('listado')} 
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex gap-2 transition ${activeTab === 'listado' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <QueueListIcon className="h-5 w-5" /> Listado Matriculados
                    </button>
                    <button 
                        onClick={() => setActiveTab('masiva')} 
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex gap-2 transition ${activeTab === 'masiva' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <CloudArrowUpIcon className="h-5 w-5" /> Carga Masiva
                    </button>
                </nav>
            </div>

            {/* VISTA 1: LISTADO (Con Filtros Estilo Gestión Usuarios) */}
            {activeTab === 'listado' && (
                <>
                    {/* FILTROS */}
                    <div className="flex flex-col md:flex-row gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        {/* Buscador */}
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input 
                                type="text" 
                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100" 
                                placeholder="Buscar por estudiante o cédula..." 
                                value={busqueda} 
                                onChange={(e) => setBusqueda(e.target.value)} 
                            />
                        </div>
                        
                        {/* Filtro Ciclo */}
                        <div className="w-full md:w-64 relative">
                            <FunnelIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <select 
                                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white outline-none text-sm text-gray-600 cursor-pointer"
                                value={filtroCiclo}
                                onChange={(e) => setFiltroCiclo(e.target.value)}
                            >
                                <option value="">Todos los Ciclos</option>
                                {listaCiclos.map(c => (
                                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {(busqueda || filtroCiclo) && (
                            <button onClick={() => { setBusqueda(''); setFiltroCiclo(''); }} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Limpiar</button>
                        )}
                    </div>

                    {/* TABLA */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Cédula</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Estudiante</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Carrera</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Ciclo</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-10 text-gray-500">Cargando matriculados...</td></tr>
                                ) : dataFiltrada.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-12 text-gray-400">No se encontraron registros.</td></tr>
                                ) : (
                                    dataFiltrada.map(m => (
                                        <tr key={m.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 text-sm text-gray-600 font-mono">{m.cedula}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{m.nombres}</div>
                                                <div className="text-xs text-gray-500">{m.email}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{m.carrera}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                                                    {m.ciclo}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-flex items-center gap-1 text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200">
                                                    {m.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        
                        {/* Footer Tabla */}
                        <div className="bg-gray-50 p-4 text-xs text-gray-500 border-t border-gray-100 flex justify-between">
                            <span>Mostrando {dataFiltrada.length} registros</span>
                            <span>Total periodo: {matriculados.length}</span>
                        </div>
                    </div>
                </>
            )}

            {/* VISTA 2: CARGA MASIVA (Estilo Tarjeta Limpia) */}
            {activeTab === 'masiva' && (
                <div className="max-w-2xl mx-auto mt-8">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="p-8 text-center border-b border-gray-100 bg-gray-50/50">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                                <DocumentTextIcon className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Importación Masiva de Matrículas</h3>
                            <p className="text-gray-500 text-sm mt-2">
                                Periodo Destino: <span className="font-bold text-blue-600">{periodoActivo.nombre}</span>
                            </p>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Botón Plantilla */}
                            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="text-sm text-blue-800">
                                    <strong>Paso 1:</strong> Descarga la estructura requerida.
                                </div>
                                <button onClick={downloadTemplate} className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline">
                                    <ArrowDownTrayIcon className="h-4 w-4"/> Plantilla.xlsx
                                </button>
                            </div>

                            {/* Área de Carga */}
                            <div 
                                onClick={handleClickUploadArea}
                                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition
                                    ${fileToUpload ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
                                `}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".xlsx,.csv" />
                                {fileToUpload ? (
                                    <>
                                        <CloudArrowUpIcon className="h-12 w-12 text-green-600 mb-3"/>
                                        <span className="font-bold text-green-700 text-lg">{fileToUpload.name}</span>
                                        <span className="text-xs text-green-600 mt-1">Listo para subir</span>
                                    </>
                                ) : (
                                    <>
                                        <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mb-3"/>
                                        <span className="text-gray-600 font-medium">Haga clic para seleccionar el archivo Excel</span>
                                        <span className="text-xs text-gray-400 mt-1">Columnas: Cédula, Carrera, Ciclo</span>
                                    </>
                                )}
                            </div>

                            <button 
                                onClick={handleImportar}
                                disabled={!fileToUpload}
                                className={`w-full py-3.5 rounded-xl font-bold text-white transition shadow-md
                                    ${!fileToUpload ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700 hover:shadow-lg'}
                                `}
                            >
                                Procesar Archivo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Matriculacion;