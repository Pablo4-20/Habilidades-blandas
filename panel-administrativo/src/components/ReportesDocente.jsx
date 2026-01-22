import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CustomSelect from './ui/CustomSelect'; 
import { 
    DocumentTextIcon, BookOpenIcon, CalendarDaysIcon,
    PrinterIcon, SparklesIcon, ChartBarIcon,
    ArrowRightIcon, ArrowLeftIcon, ArrowDownTrayIcon, LockClosedIcon,
    UserGroupIcon 
} from '@heroicons/react/24/outline';

const ReportesDocente = () => {
    // --- ESTADOS ---
    const [asignacionesRaw, setAsignacionesRaw] = useState([]);
    const [selectedMateriaId, setSelectedMateriaId] = useState('');
    const [selectedPeriodo, setSelectedPeriodo] = useState('');
    const [dataCompleta, setDataCompleta] = useState(null); 
    const [conclusiones, setConclusiones] = useState({});
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    
    // Estado para la paginación (Paso a Paso)
    const [pasoActual, setPasoActual] = useState(0);

    // 1. CARGA INICIAL
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [resAsig, resPer] = await Promise.all([
                    api.get('/docente/asignaturas'),
                    api.get('/periodos/activos')
                ]);
                
                setAsignacionesRaw(Array.isArray(resAsig.data) ? resAsig.data : []);

                const listaPeriodos = Array.isArray(resPer.data) ? resPer.data : [];
                const activo = listaPeriodos.find(p => p.activo === 1 || p.activo === true);

                if (activo) setSelectedPeriodo(activo.nombre);
            } catch (error) {
                console.error("Error al cargar datos iniciales:", error);
            }
        };
        cargarDatos();
    }, []);

    // 2. CARGAR REPORTE Y REINICIAR PASO
    useEffect(() => {
        if (selectedMateriaId && selectedPeriodo) {
            cargarDatosReporte();
            setPasoActual(0); // Reiniciar al primer slide
        } else {
            setDataCompleta(null);
        }
    }, [selectedMateriaId, selectedPeriodo]);

    // 3. LOGICA DE AGRUPACIÓN (Habilidad -> P1 y P2 juntos)
    const reportesAgrupados = useMemo(() => {
        if (!dataCompleta || !dataCompleta.reportes) return [];

        const grupos = {};
        
        dataCompleta.reportes.forEach(r => {
            const nombreHab = r.habilidad;
            // Si no existe el grupo, lo creamos
            if (!grupos[nombreHab]) {
                grupos[nombreHab] = {
                    habilidad: nombreHab,
                    p1: null,
                    p2: null,
                    // Usamos el ID de la planificación más reciente para guardar la observación
                    idParaGuardar: null 
                };
            }
            
            // Asignamos al parcial correspondiente
            if (r.parcial_asignado === '1') grupos[nombreHab].p1 = r;
            else grupos[nombreHab].p2 = r;
        });

        // Convertimos a array y definimos qué ID usaremos para guardar la observación
        return Object.values(grupos).map(g => {
            // Preferencia: Guardar en P2, si no existe, en P1
            const reportePrincipal = g.p2 || g.p1;
            return {
                ...g,
                idParaGuardar: reportePrincipal ? reportePrincipal.planificacion_id : null,
            };
        });
    }, [dataCompleta]);

    // 4. CARGAR DATOS
    const cargarDatosReporte = async () => {
        setLoading(true);
        try {
            const res = await api.post('/reportes/pdf-data', { 
                asignatura_id: selectedMateriaId, 
                periodo: selectedPeriodo   
            });
            setDataCompleta(res.data);
            
            // Llenar estado de conclusiones INICIALMENTE desde la BD
            const initialConclusiones = {};
            const rawReportes = res.data.reportes || [];
            
            rawReportes.forEach(r => {
                // Importante: Inicializamos con lo que venga de la BD o string vacío
                initialConclusiones[r.planificacion_id] = r.conclusion || '';
            });

            setConclusiones(initialConclusiones);

        } catch (error) {
            console.error(error);
            setDataCompleta(null);
            Swal.fire('Info', 'No se encontraron datos.', 'info');
        } finally {
            setLoading(false);
        }
    };

    // 5. NAVEGACIÓN
    const handleSiguiente = () => {
        if (pasoActual < reportesAgrupados.length - 1) {
            setPasoActual(prev => prev + 1);
        }
    };

    const handleAnterior = () => {
        if (pasoActual > 0) {
            setPasoActual(prev => prev - 1);
        }
    };

    const guardarTodo = async () => {
        setGuardando(true);
        try {
            const listaParaEnviar = Object.entries(conclusiones).map(([id, texto]) => ({
                id: id,
                texto: texto
            }));

            await api.post('/reportes/guardar-todo', { conclusiones: listaParaEnviar });

            Swal.fire({
                title: '¡Guardado!',
                text: 'Observaciones registradas correctamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar.', 'error');
        } finally {
            setGuardando(false);
        }
    };

    // --- COMPONENTE GRAFICO: BARRAS VERTICALES ESTILIZADAS ---
    const MiniGrafico = ({ stats, titulo }) => {
        if (!stats) return (
            <div className="h-40 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400 text-sm">
                {titulo}: Sin datos
            </div>
        );

        const maxVal = Math.max(...Object.values(stats)) || 1;
        
        return (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-4 text-center tracking-wider">{titulo}</h5>
                
                {/* Contenedor Flex Row para barras verticales */}
                <div className="flex items-end justify-center h-32 gap-6"> 
                    {[1, 2, 3, 4, 5].map(nivel => (
                        <div key={nivel} className="flex flex-col items-center justify-end h-full w-10"> {/* w-10: Barras más delgadas */}
                            
                            {/* Valor numérico flotante */}
                            <div className="text-sm font-bold text-blue-600 mb-2 transition-all transform group-hover:-translate-y-1">
                                {stats[nivel]}
                            </div>

                            {/* La Barra Vertical */}
                            <div className="w-full bg-gray-100 rounded-t-lg h-full relative overflow-hidden">
                                <div 
                                    className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-1000 ease-out 
                                        ${nivel <= 2 ? 'bg-red-400' : nivel <= 3 ? 'bg-amber-400' : 'bg-green-500'}
                                    `}
                                    style={{ height: `${(stats[nivel] / maxVal) * 100}%` }} // Altura dinámica
                                ></div>
                            </div>

                            {/* Etiqueta Nivel */}
                            <div className="mt-2 text-[10px] font-bold text-gray-400">N{nivel}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // --- PDF ---
    const descargarPDFCompleto = () => {
        if (!dataCompleta || !dataCompleta.info) return;
        const doc = new jsPDF();
        const info = dataCompleta.info;

        const drawHeader = (doc) => {
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.setFontSize(14);
            doc.setTextColor(40, 53, 147); 
            doc.text("UNIVERSIDAD ESTATAL DE BOLIVAR", pageWidth / 2, 15, { align: "center" });
            doc.setFontSize(10);
            doc.setTextColor(80);
            doc.text(info.facultad || 'FACULTAD', pageWidth / 2, 22, { align: "center" });
            doc.setTextColor(0);
        };

        drawHeader(doc);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("ANEXO 1: FICHA RESUMEN DE EJECUCIÓN", 105, 35, { align: "center" });

        autoTable(doc, {
            startY: 40,
            theme: 'plain',
            body: [
                ['Carrera:', info.carrera],
                ['Docente:', info.docente],
                ['Asignatura:', info.asignatura],
                ['Periodo:', info.periodo]
            ],
            styles: { fontSize: 9, cellPadding: 1 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } }
        });

        const filasResumen = dataCompleta.reportes.map(r => {
            const textoConclusion = conclusiones[r.planificacion_id] || "Sin observaciones.";
            return [
                info.ciclo,
                `${r.habilidad}`,
                r.parcial_asignado === '1' ? '1er' : '2do',
                r.estadisticas[1], r.estadisticas[2], r.estadisticas[3], r.estadisticas[4], r.estadisticas[5],
                textoConclusion
            ];
        });

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 5,
            head: [['Ciclo', 'Habilidad', 'Parcial', 'N1', 'N2', 'N3', 'N4', 'N5', 'Observación']],
            body: filasResumen,
            theme: 'grid',
            headStyles: { fillColor: [220, 230, 241], textColor: 0, fontSize: 8, halign: 'center', valign: 'middle' },
            bodyStyles: { fontSize: 8, valign: 'middle', halign: 'center' },
            columnStyles: { 8: { cellWidth: 60, halign: 'left' } }
        });

        const finalY = doc.lastAutoTable.finalY + 20;
        doc.line(14, finalY, 80, finalY);
        doc.setFontSize(10);
        doc.text("Firma del Docente", 14, finalY + 5);
        doc.save(`Reporte_${info.asignatura}.pdf`);
    };

    // --- RENDER ---
    const opcionesMaterias = useMemo(() => {
        if (!selectedPeriodo) return [];
        const delPeriodo = asignacionesRaw.filter(a => a.periodo === selectedPeriodo);
        const unicas = [];
        const map = new Map();
        for (const item of delPeriodo) {
            if(!map.has(item.id)) { map.set(item.id, true); unicas.push({ value: item.id, label: item.nombre, subtext: `${item.carrera} (${item.paralelo})` }); }
        }
        return unicas;
    }, [asignacionesRaw, selectedPeriodo]);

    const itemActual = reportesAgrupados[pasoActual];

    return (
        <div className="space-y-6 animate-fade-in pb-12 p-6 bg-gray-50 min-h-screen">
            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <DocumentTextIcon className="h-7 w-7 text-blue-600"/> Reportes de Evolución
                    </h2>
                    <p className="text-gray-500 text-sm">Análisis comparativo por habilidad.</p>
                </div>
              
            </div>

            {/* FILTROS */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 border border-blue-100 rounded-lg p-2 bg-blue-50 text-blue-800 text-sm font-bold">
                    <CalendarDaysIcon className="h-5 w-5"/>
                    <span>{selectedPeriodo || 'Cargando...'}</span>
                    <LockClosedIcon className="h-4 w-4 ml-auto text-blue-400 opacity-50"/>
                </div>
                <div className={!selectedPeriodo ? 'opacity-50' : ''}>
                    <CustomSelect
                        label=""
                        placeholder={opcionesMaterias.length > 0 ? "Seleccionar Asignatura..." : "Sin materias"}
                        options={opcionesMaterias}
                        value={selectedMateriaId}
                        onChange={setSelectedMateriaId}
                        icon={BookOpenIcon}
                    />
                </div>
            </div>

            {/* CONTENIDO PRINCIPAL (WIZARD) */}
            {!loading && itemActual && (
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden flex flex-col transition-all duration-300">
                    
                    {/* BARRA DE PROGRESO */}
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                            Habilidad {pasoActual + 1} de {reportesAgrupados.length}
                        </span>
                        <div className="flex gap-1">
                            {reportesAgrupados.map((_, idx) => (
                                <div key={idx} className={`h-1.5 w-6 rounded-full transition-all ${idx === pasoActual ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 md:p-8">
                        {/* TÍTULO HABILIDAD */}
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
                                <SparklesIcon className="h-8 w-8"/>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800">{itemActual.habilidad}</h3>
                        </div>

                        {/* COMPARATIVA GRAFICA (BARRAS VERTICALES CON ESPACIO) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="bg-gray-100 text-gray-600 text-sm font-bold px-2 py-1 rounded">Parcial 1</span>
                                    {itemActual.p1 && <span className="text-sm text-green-600 font-bold flex items-center gap-1"><UserGroupIcon className="h-3 w-3"/> Evaluados</span>}
                                </div>
                                <MiniGrafico stats={itemActual.p1?.estadisticas} titulo="Resultados P1" />
                            </div>
                            
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="bg-blue-100 text-blue-700 text-sm font-bold px-2 py-1 rounded">Parcial 2</span>
                                    {itemActual.p2 && <span className="text-sm text-green-600 font-bold flex items-center gap-1"><UserGroupIcon className="h-3 w-3"/> Evaluados</span>}
                                </div>
                                <MiniGrafico stats={itemActual.p2?.estadisticas} titulo="Resultados P2" />
                            </div>
                        </div>

                        {/* CAMPO DE OBSERVACIÓN */}
                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <ChartBarIcon className="h-4 w-4 text-blue-500"/>
                                Análisis de Evolución y Observaciones (Cierre del Parcial)
                            </label>
                            <textarea 
                                rows="3"
                                className="w-full px-4 py-3 border border-blue-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-200 outline-none text-sm resize-none shadow-sm"
                                placeholder={`Escriba sus conclusiones sobre el desempeño en ${itemActual.habilidad}...`}
                                value={conclusiones[itemActual.idParaGuardar] !== undefined ? conclusiones[itemActual.idParaGuardar] : ''}
                                onChange={(e) => {
                                    if (itemActual.idParaGuardar) {
                                        setConclusiones({
                                            ...conclusiones,
                                            [itemActual.idParaGuardar]: e.target.value
                                        });
                                    }
                                }}
                            />
                            <p className="text-[10px] text-gray-400 mt-2 text-right">
                                * Esta observación se guardará al finalizar todos los reportes.
                            </p>
                        </div>
                    </div>

                    {/* FOOTER NAVEGACIÓN */}
                    <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between items-center">
                        <button 
                            onClick={handleAnterior}
                            disabled={pasoActual === 0}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition
                                ${pasoActual === 0 
                                    ? 'text-gray-300 cursor-not-allowed' 
                                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}
                            `}
                        >
                            <ArrowLeftIcon className="h-4 w-4"/> Anterior
                        </button>

                        {pasoActual < reportesAgrupados.length - 1 ? (
                            <button 
                                onClick={handleSiguiente}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 flex items-center gap-2 transform active:scale-95 transition"
                            >
                                Siguiente <ArrowRightIcon className="h-4 w-4"/>
                            </button>
                        ) : (
                            <button 
                                onClick={guardarTodo}
                                disabled={guardando}
                                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-green-200 flex items-center gap-2 transform active:scale-95 transition"
                            >
                                {guardando ? 'Guardando...' : <><ArrowDownTrayIcon className="h-5 w-5"/> Guardar Todas las Observaciones</>}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ESTADO DE CARGA Y VACÍO */}
            {loading && (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400 animate-pulse">
                    <DocumentTextIcon className="h-10 w-10 mb-2"/>
                    <p>Cargando análisis comparativo...</p>
                </div>
            )}
            
            {!loading && !dataCompleta && selectedMateriaId && (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50 text-gray-400">
                    <DocumentTextIcon className="h-10 w-10 mb-2 opacity-30"/>
                    <p>No hay reportes disponibles.</p>
                </div>
            )}
        </div>
    );
};

export default ReportesDocente;