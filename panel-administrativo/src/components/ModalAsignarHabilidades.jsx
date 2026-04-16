import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { InformationCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const ModalAsignarHabilidades = ({ carrera, onClose, onRefresh }) => {
  const [habilidades, setHabilidades] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  
  const [busqueda, setBusqueda] = useState('');
  const [tooltip, setTooltip] = useState({ mostrar: false, x: 0, y: 0, titulo: '', texto: '' });

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const resHab = await api.get('/habilidades-blandas');
        setHabilidades(resHab.data);

        const resCarrera = await api.get(`/gestion-carreras/${carrera.id}`);
        const idsActuales = resCarrera.data.habilidades_blandas?.map(h => h.id) || [];
        setSeleccionadas(idsActuales);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchDatos();
  }, [carrera.id]);

  const handleCheckboxChange = (id) => {
    setSeleccionadas(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]                    
    );
  };

  // 1. FILTRAR Y ORDENAR
  const habilidadesFiltradas = habilidades
    .filter(hab => hab.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  // 2. LÓGICA PARA "SELECCIONAR TODO"
  // Verifica si todas las habilidades actualmente filtradas están en el array de seleccionadas
  const estanTodasSeleccionadas = habilidadesFiltradas.length > 0 && 
    habilidadesFiltradas.every(hab => seleccionadas.includes(hab.id));

  const handleSeleccionarTodo = () => {
    const idsFiltrados = habilidadesFiltradas.map(hab => hab.id);

    if (estanTodasSeleccionadas) {
      // Si ya están todas, las quitamos de la lista de seleccionadas
      setSeleccionadas(prev => prev.filter(id => !idsFiltrados.includes(id)));
    } else {
      // Si faltan algunas, las agregamos evitando duplicados
      setSeleccionadas(prev => {
        const nuevaSeleccion = new Set([...prev, ...idsFiltrados]);
        return Array.from(nuevaSeleccion);
      });
    }
  };

  const guardarCambios = async () => {
    setGuardando(true);
    try {
      await api.post(`/gestion-carreras/${carrera.id}/habilidades`, {
        habilidades: seleccionadas
      });
      onRefresh(); 
      onClose();   
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  };

  const handleMouseMove = (e, hab) => {
    let x = e.clientX + 15;
    let y = e.clientY + 15;
    if (x + 260 > window.innerWidth) x = e.clientX - 260 - 10;
    setTooltip({ mostrar: true, x, y, titulo: hab.nombre, texto: hab.descripcion || 'No hay concepto registrado.' });
  };

  const handleMouseLeave = () => {
    setTooltip({ ...tooltip, mostrar: false });
  };

  return (
    <>
      {/* Fondo con z-index alto para cubrir el sidebar */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            {/* Corrección de flex-direction e items-alignment para responsividad */}
            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Asignar Habilidades a: <span className="text-blue-600">{carrera.nombre}</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Selecciona las habilidades blandas que serán evaluadas en esta carrera.
                </p>
              </div>
              
              <div className="relative w-full md:w-72">
                <input
                  type="text"
                  placeholder="Buscar habilidad..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full border border-gray-300 text-sm rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Sub-Header: Seleccionar Todo */}
          {!cargando && habilidadesFiltradas.length > 0 && (
            <div className="px-6 py-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Mostrando {habilidadesFiltradas.length} habilidades
              </span>
              <label className="flex items-center cursor-pointer hover:text-blue-700 text-sm font-semibold text-gray-700 transition-colors">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mr-2 cursor-pointer"
                  checked={estanTodasSeleccionadas}
                  onChange={handleSeleccionarTodo}
                />
                {estanTodasSeleccionadas ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </label>
            </div>
          )}

          {/* Cuerpo del Modal */}
          <div className="p-6 overflow-y-auto flex-1 bg-gray-50 relative">
            {cargando ? (
              <div className="text-center py-10 flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Cargando catálogo de habilidades...</p>
              </div>
            ) : habilidadesFiltradas.length === 0 ? (
              <p className="text-center text-gray-500 py-10 text-lg">
                {busqueda ? 'No se encontraron habilidades con ese nombre.' : 'No hay habilidades registradas en el sistema.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {habilidadesFiltradas.map((hab) => (
                  <div 
                    key={hab.id} 
                    className={`flex items-start p-3 border rounded-lg transition-colors bg-white shadow-sm hover:shadow-md ${
                      seleccionadas.includes(hab.id) ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <label className="flex items-start flex-1 cursor-pointer group/label">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5 cursor-pointer"
                        checked={seleccionadas.includes(hab.id)}
                        onChange={() => handleCheckboxChange(hab.id)}
                      />
                      <span className="ml-3 text-gray-800 font-medium text-sm flex-1 leading-tight select-none group-hover/label:text-blue-700 transition-colors">
                        {hab.nombre}
                      </span>
                    </label>
                    
                    <div className="ml-2 flex-shrink-0">
                      <InformationCircleIcon 
                        className="h-5 w-5 text-gray-400 hover:text-blue-600 cursor-help transition-colors outline-none"
                        onMouseMove={(e) => handleMouseMove(e, hab)}
                        onMouseLeave={handleMouseLeave}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer del Modal */}
          {/* Corrección de apilamiento en pantallas pequeñas usando flex-col sm:flex-row y gap-4 */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600 font-medium bg-gray-100 px-3 py-1.5 rounded-full w-full sm:w-auto text-center">
              Seleccionadas en total: <span className="text-blue-600 font-bold">{seleccionadas.length}</span>
            </div>
            <div className="flex space-x-3 w-full sm:w-auto justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm w-full sm:w-auto"
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                onClick={guardarCambios}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center justify-center w-full sm:w-auto"
                disabled={cargando || guardando}
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
          
        </div>
      </div>

      {/* Tooltip Inteligente con z-index más alto que el modal */}
      {tooltip.mostrar && (
        <div 
          className="fixed z-[70] w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none transition-opacity duration-150 ease-in-out"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          <p className="font-semibold mb-1 border-b border-gray-700 pb-1 text-blue-300">
            {tooltip.titulo}
          </p>
          <p className="leading-relaxed">
            {tooltip.texto}
          </p>
        </div>
      )}
    </>
  );
};

export default ModalAsignarHabilidades;