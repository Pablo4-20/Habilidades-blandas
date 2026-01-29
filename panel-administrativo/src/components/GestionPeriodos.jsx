import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { 
    CalendarDaysIcon, PlusCircleIcon, TrashIcon, 
    CheckCircleIcon, XCircleIcon, ClockIcon,
    PencilSquareIcon, ArrowPathIcon, XMarkIcon, ExclamationTriangleIcon,
    ChevronLeftIcon, ChevronRightIcon
} from '@heroicons/react/24/outline';

const GestionPeriodos = () => {
    const [periodos, setPeriodos] = useState([]);
    const [form, setForm] = useState({ fecha_inicio: '', fecha_fin: '' });
    const [editingId, setEditingId] = useState(null); 
    const [hayActivo, setHayActivo] = useState(false); 

    // PAGINACIÓN (AJUSTADO A 6)
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6;

    useEffect(() => {
        fetchPeriodos();
    }, []);

    const fetchPeriodos = async () => {
        try {
            const res = await api.get('/periodos');
            const data = Array.isArray(res.data) ? res.data : [];
            
            // Ordenar por fecha de inicio descendente (más reciente primero)
            data.sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));
            
            setPeriodos(data);
            
            // Validar si existe alguno activo
            const existeActivo = data.some(p => p.activo === 1 || p.activo === true);
            setHayActivo(existeActivo);

        } catch (error) {
            console.error(error);
            setPeriodos([]);
        }
    };

    // --- CÁLCULOS DE PAGINACIÓN ---
    const totalPages = Math.ceil(periodos.length / ITEMS_PER_PAGE);
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = periodos.slice(indexOfFirstItem, indexOfLastItem);

    const formatearFecha = (fecha) => {
        if (!fecha) return '';
        const soloFecha = fecha.split('T')[0].split(' ')[0];
        return soloFecha.replace(/-/g, '/'); 
    };

    const cargarEdicion = (periodo) => {
        setEditingId(periodo.id);
        setForm({
            fecha_inicio: periodo.fecha_inicio.split('T')[0].split(' ')[0], 
            fecha_fin: periodo.fecha_fin.split('T')[0].split(' ')[0]
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarEdicion = () => {
        setEditingId(null);
        setForm({ fecha_inicio: '', fecha_fin: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!editingId && hayActivo) {
            return Swal.fire('Acción Bloqueada', 'Ya existe un periodo activo. Debes finalizarlo antes de crear uno nuevo.', 'warning');
        }

        try {
            if (editingId) {
                await api.put(`/periodos/${editingId}`, form);
                Swal.fire('Actualizado', 'El periodo ha sido modificado.', 'success');
            } else {
                await api.post('/periodos', form);
                Swal.fire({
                    icon: 'success',
                    title: 'Periodo Creado',
                    text: 'El nombre se ha generado automáticamente.'
                });
            }
            cancelarEdicion();
            fetchPeriodos();
        } catch (error) {
            const msg = error.response?.data?.message || 'Verifica que la fecha fin sea posterior al inicio.';
            Swal.fire('Error', msg, 'error');
        }
    };

    const toggleEstado = async (id) => {
        try {
            await api.put(`/periodos/${id}/estado`);
            fetchPeriodos();
        } catch (error) {
            Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
        }
    };

    const eliminar = async (id) => {
        const result = await Swal.fire({
            title: '¿Eliminar periodo?',
            text: "Esta acción borrará el periodo del sistema.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/periodos/${id}`);
                Swal.fire('Eliminado', 'El periodo ha sido eliminado.', 'success');
                fetchPeriodos();
            } catch (error) {
                Swal.fire('Error', 'No se puede eliminar porque tiene datos asociados.', 'error');
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in flex flex-col h-full">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CalendarDaysIcon className="h-7 w-7 text-blue-600"/> Gestión de Periodos Académicos
            </h2>

            {/* FORMULARIO INTELIGENTE */}
            <div className={`p-6 rounded-2xl shadow-sm border transition-colors duration-300 ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}>
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className={`font-bold flex items-center gap-2 ${editingId ? 'text-orange-700' : 'text-gray-700'}`}>
                        {editingId ? <><PencilSquareIcon className="h-5 w-5"/> Editando Periodo</> : 'Nuevo Periodo'}
                    </h3>
                    {editingId && (
                        <button onClick={cancelarEdicion} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 font-bold">
                            <XMarkIcon className="h-4 w-4"/> Cancelar
                        </button>
                    )}
                </div>

                {!editingId && hayActivo && (
                    <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg flex items-center gap-2 border border-yellow-200">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                        <span>
                            <b>Atención:</b> Ya existe un periodo <b>ACTIVO</b>. Para crear uno nuevo, primero debe inactivar o finalizar el actual.
                        </span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Fecha Inicio</label>
                        <input 
                            type="date" 
                            required
                            disabled={!editingId && hayActivo} 
                            className={`w-full mt-1 px-4 py-2 border rounded-xl outline-none transition ${(!editingId && hayActivo) ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-white focus:ring-2 focus:ring-blue-100 border-gray-300'}`}
                            value={form.fecha_inicio}
                            onChange={e => setForm({...form, fecha_inicio: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Fecha Fin</label>
                        <input 
                            type="date" 
                            required
                            disabled={!editingId && hayActivo} 
                            className={`w-full mt-1 px-4 py-2 border rounded-xl outline-none transition ${(!editingId && hayActivo) ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-white focus:ring-2 focus:ring-blue-100 border-gray-300'}`}
                            value={form.fecha_fin}
                            onChange={e => setForm({...form, fecha_fin: e.target.value})}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={!editingId && hayActivo} 
                        className={`font-bold py-2.5 px-6 rounded-xl transition shadow-md flex justify-center items-center gap-2 text-white 
                        ${editingId 
                            ? 'bg-orange-500 hover:bg-orange-600' 
                            : hayActivo 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {editingId ? (
                            <><ArrowPathIcon className="h-5 w-5"/> Actualizar</>
                        ) : (
                            <><PlusCircleIcon className="h-5 w-5"/> Generar Periodo</>
                        )}
                    </button>
                </form>
            </div>

            {/* TABLA DE PERIODOS CON PAGINACIÓN */}
            <div className="flex flex-col flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Periodo (Automático)</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Duración (Año/Mes/Día)</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Estado</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {currentItems.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-10 text-gray-400">No hay periodos registrados.</td></tr>
                            ) : currentItems.map(p => (
                                <tr key={p.id} className={`transition ${editingId === p.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-gray-800 text-sm block">{p.nombre}</span>
                                    </td>
                                    
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg w-fit border border-gray-200 font-mono">
                                            <ClockIcon className="h-4 w-4 text-gray-400"/>
                                            {formatearFecha(p.fecha_inicio)} 
                                            <span className="text-gray-400 mx-1">➜</span> 
                                            {formatearFecha(p.fecha_fin)}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => toggleEstado(p.id)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 mx-auto transition border ${
                                                p.activo 
                                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            {p.activo ? <CheckCircleIcon className="h-4 w-4"/> : <XCircleIcon className="h-4 w-4"/>}
                                            {p.activo ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </td>

                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => cargarEdicion(p)}
                                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition"
                                                title="Editar"
                                            >
                                                <PencilSquareIcon className="h-5 w-5"/>
                                            </button>

                                            <button 
                                                onClick={() => eliminar(p.id)} 
                                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
                                                title="Eliminar"
                                            >
                                                <TrashIcon className="h-5 w-5"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- CONTROLES DE PAGINACIÓN --- */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        Mostrando del <span className="font-bold text-gray-800">{currentItems.length > 0 ? indexOfFirstItem + 1 : 0}</span> al <span className="font-bold text-gray-800">{Math.min(indexOfLastItem, periodos.length)}</span> de <span className="font-bold text-gray-800">{periodos.length}</span> periodos
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
        </div>
    );
};

export default GestionPeriodos;