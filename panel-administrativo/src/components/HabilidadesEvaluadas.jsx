import { useState, useEffect } from 'react';
import api from '../services/api';
import CustomSelect from './ui/CustomSelect';
import { 
    CheckCircleIcon, 
    XCircleIcon, 
    CalendarDaysIcon,
    ClipboardDocumentListIcon,
    ChevronDownIcon, // Importamos icono para indicar desplegable
    ChevronUpIcon
} from '@heroicons/react/24/outline';

const HabilidadesEvaluadas = () => {
    const [periodos, setPeriodos] = useState([]);
    const [filtroPeriodo, setFiltroPeriodo] = useState('');
    
    const [evaluadas, setEvaluadas] = useState([]);
    const [noEvaluadas, setNoEvaluadas] = useState([]);
    const [loading, setLoading] = useState(false);

    // Estado para controlar qué habilidad está expandida
    const [expandedId, setExpandedId] = useState(null);

    // 1. Cargar Periodos
    useEffect(() => {
        const fetchPeriodos = async () => {
            try {
                const res = await api.get('/periodos');
                const lista = Array.isArray(res.data) ? res.data : [];
                lista.sort((a, b) => b.id - a.id);
                setPeriodos(lista);
                
                const activo = lista.find(p => p.activo === 1);
                if (activo) setFiltroPeriodo(activo.nombre);
                else if (lista.length > 0) setFiltroPeriodo(lista[0].nombre);
            } catch (error) { console.error(error); }
        };
        fetchPeriodos();
    }, []);

    // 2. Cargar Habilidades cuando cambia el periodo
    useEffect(() => {
        if (filtroPeriodo) fetchHabilidadesStatus();
    }, [filtroPeriodo]);

    const fetchHabilidadesStatus = async () => {
        setLoading(true);
        setExpandedId(null); // Resetear expansión al cambiar datos
        try {
            const res = await api.post('/reportes/estado-habilidades', {
                periodo: filtroPeriodo
            });
            setEvaluadas(res.data.evaluadas || []);
            setNoEvaluadas(res.data.noEvaluadas || []);
        } catch (error) {
            console.error("Error cargando habilidades:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="space-y-6 p-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <ClipboardDocumentListIcon className="h-7 w-7 text-blue-700"/>
                    Estado de Habilidades
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Visualiza qué habilidades han sido cubiertas por los docentes y cuáles faltan por evaluar.
                </p>
            </div>

            {/* Filtro */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 max-w-md">
                <CustomSelect 
                    label="Seleccionar Periodo" 
                    icon={CalendarDaysIcon} 
                    options={periodos.map(p => ({value: p.nombre, label: p.nombre}))} 
                    value={filtroPeriodo} 
                    onChange={setFiltroPeriodo} 
                />
            </div>

            {/* Contenido dos columnas */}
            {loading ? (
                <div className="text-center py-10 text-blue-600">Cargando datos...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Columna 1: Evaluadas */}
                    <div className="bg-white rounded-xl shadow-md border border-green-100 overflow-hidden h-fit">
                        <div className="bg-green-50 px-4 py-3 border-b border-green-200 flex justify-between items-center">
                            <h3 className="font-bold text-green-800 flex items-center gap-2">
                                <CheckCircleIcon className="h-5 w-5"/>
                                Habilidades Evaluadas
                            </h3>
                            <span className="bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                                {evaluadas.length}
                            </span>
                        </div>
                        <div className="p-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {evaluadas.length > 0 ? (
                                <ul className="space-y-2">
                                    {evaluadas.map(h => (
                                        <li key={h.id} className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden transition-all duration-200">
                                            {/* Cabecera del item (Clickable) */}
                                            <div 
                                                onClick={() => toggleExpand(h.id)}
                                                className={`p-3 flex justify-between items-center cursor-pointer hover:bg-green-50 transition-colors ${expandedId === h.id ? 'bg-green-50' : ''}`}
                                            >
                                                <span className="text-gray-700 text-sm font-medium">{h.nombre}</span>
                                                {expandedId === h.id ? (
                                                    <ChevronUpIcon className="h-4 w-4 text-green-600"/>
                                                ) : (
                                                    <ChevronDownIcon className="h-4 w-4 text-gray-400"/>
                                                )}
                                            </div>

                                            {/* Detalle Desplegable */}
                                            {expandedId === h.id && (
                                                <div className="bg-white px-4 py-3 border-t border-gray-100 text-xs animate-fade-in">
                                                    <p className="text-gray-500 font-semibold mb-2 uppercase tracking-wider text-[10px]">
                                                        Impartida en:
                                                    </p>
                                                    {h.detalle_asignaturas && h.detalle_asignaturas.length > 0 ? (
                                                        <ul className="space-y-2">
                                                            {h.detalle_asignaturas.map((asig, idx) => (
                                                                <li key={idx} className="flex flex-col pb-2 border-b border-gray-50 last:border-0 last:pb-0">
                                                                    <span className="font-bold text-gray-700">
                                                                        {asig.materia}
                                                                    </span>
                                                                    <div className="flex justify-between mt-1 text-gray-500">
                                                                        <span>{asig.ciclo} - Paralelo {asig.paralelo}</span>
                                                                    </div>
                                                                    <span className="text-gray-400 italic mt-0.5">
                                                                        Doc: {asig.docente}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-gray-400 italic">Sin detalles disponibles.</p>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-400 text-center text-sm italic py-4">No hay habilidades evaluadas en este periodo.</p>
                            )}
                        </div>
                    </div>

                    {/* Columna 2: No Evaluadas (Sin cambios mayores, solo estilo para igualar altura) */}
                    <div className="bg-white rounded-xl shadow-md border border-red-100 overflow-hidden h-fit">
                        <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex justify-between items-center">
                            <h3 className="font-bold text-red-800 flex items-center gap-2">
                                <XCircleIcon className="h-5 w-5"/>
                                Habilidades No Evaluadas
                            </h3>
                            <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded-full">
                                {noEvaluadas.length}
                            </span>
                        </div>
                        <div className="p-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {noEvaluadas.length > 0 ? (
                                <ul className="space-y-2">
                                    {noEvaluadas.map(h => (
                                        <li key={h.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-gray-500 text-sm hover:bg-red-50 transition-colors opacity-75">
                                            {h.nombre}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-green-600 text-center text-sm italic py-4">¡Excelente! Todas las habilidades han sido evaluadas.</p>
                            )}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default HabilidadesEvaluadas;