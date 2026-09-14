import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { PencilSquareIcon, TrashIcon, PlusIcon, PhotoIcon, ArrowLeftIcon, LinkIcon, MinusCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ModalAsignarHabilidades from './ModalAsignarHabilidades';

const GestionCarreras = () => {
    // --- ESTADOS GLOBALES ---
    const [facultades, setFacultades] = useState([]);
    const [carreras, setCarreras] = useState([]);
    const [vistaActual, setVistaActual] = useState('facultades'); // 'facultades' o 'carreras'
    const [facultadActiva, setFacultadActiva] = useState(null);

    // --- ESTADOS DE MODALES ---
    const [modalFacultadAbierto, setModalFacultadAbierto] = useState(false);
    const [modalCarreraAbierto, setModalCarreraAbierto] = useState(false);
    const [modalAsignarAbierto, setModalAsignarAbierto] = useState(false);
    const [modalHabilidadesAbierto, setModalHabilidadesAbierto] = useState(false);
    
    // --- ESTADOS DE FORMULARIOS ---
    const [isEditing, setIsEditing] = useState(false);
    
    // Formulario Facultad
    const [facId, setFacId] = useState(null);
    const [facNombre, setFacNombre] = useState('');
    const [facTipo, setFacTipo] = useState('Facultad');

    // Formulario Carrera
    const [carId, setCarId] = useState(null);
    const [carNombre, setCarNombre] = useState('');
    const [carLogoFile, setCarLogoFile] = useState(null);
    const [carLogoPreview, setCarLogoPreview] = useState(null);
    const [carreraSeleccionada, setCarreraSeleccionada] = useState(null); // Para Habilidades

    // Formulario Asignación Masiva
    const [carrerasSeleccionadas, setCarrerasSeleccionadas] = useState([]);

    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://hbb.swueb.net';

    useEffect(() => {
        fetchDatos();
    }, []);

    const fetchDatos = async () => {
        try {
            const [resFacultades, resCarreras] = await Promise.all([
                api.get('/facultades'),
                api.get('/gestion-carreras')
            ]);
            setFacultades(resFacultades.data);
            setCarreras(resCarreras.data);
        } catch (error) {
            console.error('Error al cargar datos:', error);
        }
    };

    // --- LÓGICA FACULTADES ---
    const abrirModalFacultad = (fac = null) => {
        if (fac) {
            setIsEditing(true);
            setFacId(fac.id);
            setFacNombre(fac.nombre);
            setFacTipo(fac.tipo);
        } else {
            setIsEditing(false);
            setFacId(null);
            setFacNombre('');
            setFacTipo('Facultad');
        }
        setModalFacultadAbierto(true);
    };

    const submitFacultad = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/facultades/${facId}`, { nombre: facNombre, tipo: facTipo });
                Swal.fire('Actualizado', 'La Facultad fue actualizada.', 'success');
            } else {
                await api.post('/facultades', { nombre: facNombre, tipo: facTipo });
                Swal.fire('Creado', 'La Facultad fue creada.', 'success');
            }
            setModalFacultadAbierto(false);
            fetchDatos();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Error al guardar', 'error');
        }
    };

    const eliminarFacultad = async (id) => {
        const result = await Swal.fire({
            title: '¿Eliminar Facultad?',
            text: "Las carreras dentro de esta Facultad no se borrarán, pero quedarán sin asignar.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/facultades/${id}`);
                Swal.fire('Eliminado!', '', 'success');
                fetchDatos();
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar.', 'error');
            }
        }
    };

    // --- LÓGICA CARRERAS ---
    const carrerasEnFacultad = carreras.filter(c => c.facultad_id === facultadActiva?.id);
    const carrerasDisponibles = carreras.filter(c => c.facultad_id === null);

    const abrirModalCarrera = (car = null) => {
        if (car) {
            setIsEditing(true);
            setCarId(car.id);
            setCarNombre(car.nombre);
            setCarLogoFile(null);
            setCarLogoPreview(car.logo ? `${backendUrl}/storage/${car.logo}` : null);
        } else {
            setIsEditing(false);
            setCarId(null);
            setCarNombre('');
            setCarLogoFile(null);
            setCarLogoPreview(null);
        }
        setModalCarreraAbierto(true);
    };

    const submitCarrera = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('nombre', carNombre);
        
        if (facultadActiva && !isEditing) {
            formData.append('facultad_id', facultadActiva.id);
        }

        if (carLogoFile) formData.append('logo', carLogoFile);

        try {
            if (isEditing) {
                formData.append('_method', 'PUT');
                await api.post(`/gestion-carreras/${carId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                Swal.fire('Actualizado', 'La carrera ha sido actualizada', 'success');
            } else {
                await api.post('/gestion-carreras', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                Swal.fire('Creado', 'La carrera ha sido creada', 'success');
            }
            setModalCarreraAbierto(false);
            fetchDatos();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Ocurrió un error', 'error');
        }
    };

    const eliminarCarrera = async (id) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esto.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/gestion-carreras/${id}`);
                Swal.fire('Eliminado!', '', 'success');
                fetchDatos();
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar.', 'error');
            }
        }
    };

    const desvincularCarrera = async (id) => {
        const result = await Swal.fire({
            title: '¿Desvincular Carrera?',
            text: "La carrera se quitará de esta Facultad, pero seguirá existiendo en el sistema.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, desvincular',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.post(`/gestion-carreras/${id}/desvincular`);
                Swal.fire('Desvinculada', 'La carrera ya no pertenece a esta Facultad.', 'success');
                fetchDatos();
            } catch (error) {
                Swal.fire('Error', 'No se pudo desvincular la carrera.', 'error');
            }
        }
    };

    // --- LÓGICA ASIGNACIÓN MASIVA ---
    const toggleSeleccionCarrera = (id) => {
        setCarrerasSeleccionadas(prev => 
            prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
        );
    };

    const asignarCarreras = async () => {
        if(carrerasSeleccionadas.length === 0) return;
        try {
            await api.post('/carreras/asignar-facultad', {
                facultad_id: facultadActiva.id,
                carreras_ids: carrerasSeleccionadas
            });
            Swal.fire('Éxito', 'Carreras vinculadas correctamente', 'success');
            setModalAsignarAbierto(false);
            setCarrerasSeleccionadas([]);
            fetchDatos();
        } catch (error) {
            Swal.fire('Error', 'No se pudo asignar las carreras', 'error');
        }
    };


    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">
                    {vistaActual === 'facultades' ? 'Gestión de Facultades y Extensiones' : `${facultadActiva?.tipo}: ${facultadActiva?.nombre}`}
                </h1>
                
                {vistaActual === 'facultades' && (
                    <button onClick={() => abrirModalFacultad()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-colors">
                        <PlusIcon className="h-5 w-5 mr-2" /> Nueva Facultad
                    </button>
                )}
            </div>

            {/* VISTA 1: TARJETAS DE FACULTADES */}
            {vistaActual === 'facultades' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {facultades.map((fac) => (
                        <div key={fac.id} className="bg-white shadow rounded-xl p-6 relative group border-t-4 border-blue-500 hover:shadow-lg transition-all">
                            <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); abrirModalFacultad(fac); }} className="text-gray-400 hover:text-blue-600 bg-blue-50 p-1.5 rounded-md transition-colors">
                                    <PencilSquareIcon className="h-5 w-5" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); eliminarFacultad(fac.id); }} className="text-gray-400 hover:text-red-600 bg-red-50 p-1.5 rounded-md transition-colors">
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                            
                            <div 
                                className="cursor-pointer mt-2 flex flex-col items-center justify-center text-center"
                                onClick={() => { setFacultadActiva(fac); setVistaActual('carreras'); }}
                            >
                                <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">{fac.tipo}</span>
                                <h3 className="text-lg font-bold text-gray-800">{fac.nombre}</h3>
                                <p className="text-sm text-gray-500 mt-3 bg-gray-50 px-3 py-1 rounded-full">{fac.carreras?.length || 0} Carreras registradas</p>
                            </div>
                        </div>
                    ))}
                    {facultades.length === 0 && (
                        <div className="col-span-full bg-white p-8 rounded-xl shadow-sm text-center border border-gray-100">
                            <p className="text-gray-500">No hay facultades registradas. Crea la primera para comenzar.</p>
                        </div>
                    )}
                </div>
            ) : (
            
            /* VISTA 2: LISTADO DE CARRERAS DE LA FACULTAD */
                <div>
                    <div className="flex justify-between items-center mb-5">
                        <button onClick={() => setVistaActual('facultades')} className="text-gray-600 hover:text-blue-600 flex items-center font-medium transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
                            <ArrowLeftIcon className="h-4 w-4 mr-2" /> Volver a Facultad
                        </button>
                        
                        <div className="flex gap-3">
                            <button onClick={() => { setCarrerasSeleccionadas([]); setModalAsignarAbierto(true); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center text-sm shadow-sm transition-colors">
                                <LinkIcon className="h-4 w-4 mr-2" /> Vincular Existentes
                            </button>
                            <button onClick={() => abrirModalCarrera()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center text-sm shadow-sm transition-colors">
                                <PlusIcon className="h-4 w-4 mr-2" /> Nueva Carrera
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50/80">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Logo</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Carrera</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {carrerasEnFacultad.map((car) => (
                                    <tr key={car.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {car.logo ? (
                                                <img src={`${backendUrl}/storage/${car.logo}`} alt={car.nombre} className="h-12 w-12 object-contain rounded-lg border border-gray-200 p-1 bg-white" />
                                            ) : (
                                                <div className="h-12 w-12 bg-gray-50 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400">
                                                    <PhotoIcon className="h-6 w-6" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">{car.nombre}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => abrirModalCarrera(car)} className="text-blue-500 hover:text-blue-700 mr-4 transition-colors" title="Editar Carrera">
                                                <PencilSquareIcon className="h-5 w-5 inline" />
                                            </button>

                                            <button onClick={() => desvincularCarrera(car.id)} className="text-amber-500 hover:text-amber-700 mr-4 transition-colors" title="Desvincular de esta Facultad">
                                                <MinusCircleIcon className="h-5 w-5 inline" />
                                            </button>

                                            <button onClick={() => eliminarCarrera(car.id)} className="text-red-500 hover:text-red-700 mr-5 transition-colors" title="Eliminar del sistema">
                                                <TrashIcon className="h-5 w-5 inline" />
                                            </button>

                                            <button 
                                                onClick={() => { setCarreraSeleccionada(car); setModalHabilidadesAbierto(true); }}
                                                className="inline-flex items-center px-3 py-1.5 border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-xs font-semibold transition-colors"
                                            >
                                                Asignar Habilidades
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {carrerasEnFacultad.length === 0 && (
                            <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                                <PhotoIcon className="h-12 w-12 text-gray-300 mb-3" />
                                <p>No hay carreras asignadas a esta Facultad aún.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODALES CON DISEÑO MODERNO */}
            
            {/* 1. Modal Facultad */}
            {modalFacultadAbierto && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                        <div className="bg-gradient-to-r from-blue-50 to-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Editar Facultad' : 'Nueva Facultad'}</h2>
                            <button onClick={() => setModalFacultadAbierto(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={submitFacultad}>
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre de la Facultad</label>
                                    <input 
                                        type="text" 
                                        value={facNombre} 
                                        onChange={(e) => setFacNombre(e.target.value)} 
                                        className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                                        placeholder="Ej. Facultad de Ciencias..."
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo</label>
                                    <select 
                                        value={facTipo} 
                                        onChange={(e) => setFacTipo(e.target.value)} 
                                        className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    >
                                        <option value="Facultad">Facultad</option>
                                        <option value="Extensión">Extensión Universitaria</option>
                                    </select>
                                </div>
                            </div>
                            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setModalFacultadAbierto(false)} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Modal Carrera */}
            {modalCarreraAbierto && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                        <div className="bg-gradient-to-r from-blue-50 to-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Editar Carrera' : 'Nueva Carrera'}</h2>
                            <button onClick={() => setModalCarreraAbierto(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={submitCarrera}>
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre de la Carrera</label>
                                    <input 
                                        type="text" 
                                        value={carNombre} 
                                        onChange={(e) => setCarNombre(e.target.value)} 
                                        className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                                        placeholder="Ej. Ingeniería de Software"
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Logo de la Carrera</label>
                                    
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all bg-gray-50 group relative">
                                        <div className="space-y-1 text-center">
                                            {carLogoPreview ? (
                                                <div className="relative mx-auto h-24 w-24 mb-4">
                                                    <img src={carLogoPreview} alt="Preview" className="h-full w-full object-contain rounded-lg shadow-sm bg-white p-1" />
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => { e.preventDefault(); setCarLogoFile(null); setCarLogoPreview(null); }} 
                                                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors shadow-sm"
                                                    >
                                                        <XMarkIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition-colors" aria-hidden="true" />
                                            )}
                                            
                                            <div className="flex text-sm text-gray-600 justify-center">
                                                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                    <span>Seleccionar un archivo</span>
                                                    <input 
                                                        id="file-upload" 
                                                        name="file-upload" 
                                                        type="file" 
                                                        className="sr-only" 
                                                        accept="image/*" 
                                                        onChange={(e) => {
                                                            if(e.target.files[0]) {
                                                                setCarLogoFile(e.target.files[0]);
                                                                setCarLogoPreview(URL.createObjectURL(e.target.files[0]));
                                                            }
                                                        }} 
                                                    />
                                                </label>
                                                <p className="pl-1">o arrastrar aquí</p>
                                            </div>
                                            <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 2MB</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setModalCarreraAbierto(false)} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. Modal Asignar Carreras Existentes */}
            {modalAsignarAbierto && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
                        <div className="bg-gradient-to-r from-blue-50 to-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Vincular Carreras</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Destino: <span className="font-semibold text-blue-600">{facultadActiva?.nombre}</span></p>
                            </div>
                            <button onClick={() => setModalAsignarAbierto(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-4">Selecciona las carreras que deseas integrar a esta Facultad:</p>
                            
                            <div className="max-h-64 overflow-y-auto border border-gray-200 bg-gray-50 rounded-xl p-2 mb-2 custom-scrollbar">
                                {carrerasDisponibles.length === 0 ? (
                                    <div className="text-center py-8">
                                        <LinkIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-500 font-medium">No hay carreras libres disponibles.</p>
                                    </div>
                                ) : (
                                    carrerasDisponibles.map(car => (
                                        <label key={car.id} className="flex items-center space-x-3 p-3 hover:bg-blue-50/50 rounded-lg cursor-pointer border-b border-gray-100 last:border-0 transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={carrerasSeleccionadas.includes(car.id)}
                                                onChange={() => toggleSeleccionCarrera(car.id)}
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-gray-700 font-medium text-sm">{car.nombre}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => setModalAsignarAbierto(false)} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                Cancelar
                            </button>
                            <button 
                                onClick={asignarCarreras} 
                                disabled={carrerasSeleccionadas.length === 0}
                                className={`px-5 py-2 text-sm font-medium rounded-lg shadow-sm transition-all flex items-center ${carrerasSeleccionadas.length === 0 ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            >
                                Vincular Seleccionadas {carrerasSeleccionadas.length > 0 && <span className="ml-2 bg-blue-500 text-white py-0.5 px-2 rounded-full text-xs">{carrerasSeleccionadas.length}</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Modal Habilidades */}
            {modalHabilidadesAbierto && carreraSeleccionada && (
                <ModalAsignarHabilidades 
                    carrera={carreraSeleccionada} 
                    onClose={() => setModalHabilidadesAbierto(false)}
                    onRefresh={fetchDatos} 
                />
            )}
        </div>
    );
};

export default GestionCarreras;