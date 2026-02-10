import { useState, useEffect } from 'react';
import api from '../services/api';
import CustomSelect from './ui/CustomSelect';
import { 
    CalculatorIcon, 
    CalendarDaysIcon,
    ChartBarIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';

const PromedioHabilidad = () => {
    const [periodos, setPeriodos] = useState([]);
    const [filtroPeriodo, setFiltroPeriodo] = useState('');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Cargar Periodos
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

    // Cargar Datos al cambiar periodo
    useEffect(() => {
        if (filtroPeriodo) fetchData();
    }, [filtroPeriodo]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.post('/reportes/promedio-habilidad', {
                periodo: filtroPeriodo
            });
            setData(res.data || []);
        } catch (error) {
            console.error("Error:", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <CalculatorIcon className="h-7 w-7 text-blue-700"/>
                    Promedio por Habilidad
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Análisis comparativo de rendimiento de cada habilidad transversal entre diferentes asignaturas.
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

            {/* Contenido */}
            {loading ? (
                <div className="text-center py-10 text-blue-600">Calculando promedios...</div>
            ) : data.length === 0 ? (
                <div className="text-center py-10 text-gray-400 italic bg-white rounded border border-dashed">
                    No hay datos registrados para este periodo.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {data.map((item, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                            
                            {/* Encabezado de la Habilidad y Promedio General */}
                            <div className="bg-slate-50 px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <ChartBarIcon className="h-5 w-5 text-blue-600"/>
                                        {item.habilidad}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Evaluada en {item.materias.length} asignatura(s)
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                                    <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Promedio General:</span>
                                    <span className={`text-xl font-bold ${parseFloat(item.promedio_general) >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                                        {item.promedio_general}%
                                    </span>
                                </div>
                            </div>

                            {/* Tabla de Detalles */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-600">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3">Ciclo</th>
                                            <th className="px-6 py-3">Asignatura</th>
                                            <th className="px-6 py-3">Actividad</th>
                                            <th className="px-6 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <UserGroupIcon className="h-4 w-4"/> Est. Calif.
                                                </div>
                                            </th>
                                            <th className="px-6 py-3 text-center">Promedio Ind.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {item.materias.map((materia, idx) => (
                                            <tr key={idx} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium">{materia.ciclo}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900">{materia.asignatura}</td>
                                                <td className="px-6 py-4">{materia.actividad}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                                        {materia.estudiantes}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-800">
                                                    {materia.promedio}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PromedioHabilidad;