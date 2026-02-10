import { useState, useEffect } from 'react';
import api from '../services/api';
import CustomSelect from './ui/CustomSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
    CalculatorIcon, 
    CalendarDaysIcon,
    ChartBarIcon,
    UserGroupIcon,
    PrinterIcon,
    TableCellsIcon,
    AcademicCapIcon
} from '@heroicons/react/24/outline';

import logoIzq from '../assets/facultad.png'; 
import logoSoftware from '../assets/software.png';
import logoTecnologias from '../assets/tecnologias.png';

const PromedioHabilidad = () => {
    const [periodos, setPeriodos] = useState([]);
    const [filtroPeriodo, setFiltroPeriodo] = useState('');
    const [dataCiclos, setDataCiclos] = useState([]); // Ahora guardamos ciclos
    const [nombreCarrera, setNombreCarrera] = useState(''); 
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

    // Cargar Datos
    useEffect(() => {
        if (filtroPeriodo) fetchData();
    }, [filtroPeriodo]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.post('/reportes/promedio-habilidad', {
                periodo: filtroPeriodo
            });
            setDataCiclos(res.data.data || []);
            setNombreCarrera(res.data.carrera || 'Carrera');
        } catch (error) {
            console.error("Error:", error);
            setDataCiclos([]);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // GENERAR EXCEL
    // ==========================================
    const generarExcel = () => {
        if (dataCiclos.length === 0) return;

        const filasExcel = [];

        dataCiclos.forEach(ciclo => {
            ciclo.habilidades.forEach(hab => {
                if (!hab.materias || hab.materias.length === 0) {
                    filasExcel.push({
                        "Periodo": filtroPeriodo,
                        "Carrera": nombreCarrera,
                        "Ciclo": ciclo.ciclo,
                        "Habilidad": hab.habilidad,
                        "Promedio Habilidad (Ciclo)": hab.promedio_ciclo,
                        "Asignatura": "Sin asignaturas",
                        "Actividad": "-",
                        "Estudiantes": 0,
                        "Promedio Asignatura": "-"
                    });
                } else {
                    hab.materias.forEach(materia => {
                        filasExcel.push({
                            "Periodo": filtroPeriodo,
                            "Carrera": nombreCarrera,
                            "Ciclo": ciclo.ciclo,
                            "Habilidad": hab.habilidad,
                            "Promedio Habilidad (Ciclo)": hab.promedio_ciclo,
                            "Asignatura": materia.asignatura,
                            "Actividad": materia.actividad,
                            "Estudiantes": materia.estudiantes,
                            "Promedio Asignatura": materia.promedio
                        });
                    });
                }
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(filasExcel);
        // Ajuste ancho columnas
        const wscols = [
            { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 25 },
            { wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 10 }, { wch: 15 }
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Por Ciclo");
        XLSX.writeFile(workbook, `Reporte_Ciclos_${filtroPeriodo}.xlsx`);
    };

    // ==========================================
    // GENERAR PDF
    // ==========================================
    const generarPDF = () => {
        if (dataCiclos.length === 0) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const esTecnologia = nombreCarrera.toLowerCase().includes('tecnolog');
        const logoDerecho = esTecnologia ? logoTecnologias : logoSoftware;

        const dibujarEncabezado = () => {
            try { doc.addImage(logoIzq, 'PNG', 15, 5, 20, 20); } catch (e) {}
            try { doc.addImage(logoDerecho, 'PNG', pageWidth - 35, 5, 20, 20); } catch (e) {}
            
            doc.setFontSize(14); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text("UNIVERSIDAD ESTATAL DE BOLIVAR", pageWidth / 2, 12, { align: "center" });
            
            doc.setFontSize(11); doc.setFont("helvetica", "normal");
            doc.text("REPORTE DE HABILIDADES POR CICLO", pageWidth / 2, 18, { align: "center" });
            
            doc.setFontSize(10); doc.setTextColor(80);
            doc.text(`${nombreCarrera} | Periodo: ${filtroPeriodo}`, pageWidth / 2, 24, { align: "center" });
            
            return 35; 
        };

        let finalY = dibujarEncabezado();

        dataCiclos.forEach((ciclo) => {
            // Verificar espacio para el título del ciclo
            if (finalY > pageHeight - 40) { 
                doc.addPage(); 
                finalY = dibujarEncabezado(); 
            }

            // --- TÍTULO CICLO ---
            doc.setFillColor(30, 58, 138); // Azul oscuro
            doc.rect(14, finalY, pageWidth - 28, 8, 'F');
            doc.setFontSize(11);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.text(`${ciclo.ciclo}`, pageWidth / 2, finalY + 5.5, { align: "center" });
            
            finalY += 12;

            ciclo.habilidades.forEach(hab => {
                if (finalY > pageHeight - 40) {
                    doc.addPage();
                    finalY = dibujarEncabezado();
                }

                // Subtítulo Habilidad
                doc.setFontSize(10);
                doc.setTextColor(0);
                doc.setFont("helvetica", "bold");
                doc.text(`Habilidad: ${hab.habilidad}`, 14, finalY);
                
                doc.setFont("helvetica", "normal");
                doc.text(`Promedio Ciclo: ${hab.promedio_ciclo} / 5`, pageWidth - 14, finalY, { align: "right" });
                
                finalY += 2;

                // Tabla de Materias
                const bodyTable = hab.materias.map(m => [
                    m.asignatura,          
                    m.actividad,
                    m.estudiantes,    
                    m.promedio 
                ]);

                autoTable(doc, {
                    startY: finalY,
                    head: [['Asignatura', 'Actividad', 'Est.', 'Prom.']], 
                    body: bodyTable,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 1.5, halign: 'center' },
                    headStyles: { fillColor: [240, 240, 240], textColor: 50, fontStyle: 'bold', lineColor: 200 },
                    columnStyles: { 0: { cellWidth: 60, halign:'left' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 15 }, 3: { cellWidth: 15 } },
                    margin: { left: 14, right: 14 },
                    didDrawPage: (data) => {
                        if (data.pageNumber > 1 && data.cursor.y === data.settings.startY) {
                            dibujarEncabezado();
                        }
                    }
                });

                finalY = doc.lastAutoTable.finalY + 8;
            });

            finalY += 5; // Espacio extra entre ciclos
        });

        // Firma Pie de Página
        if (finalY + 30 > pageHeight) {
            doc.addPage();
            finalY = 40; 
        } else {
            finalY += 20; 
        }

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(pageWidth / 2 - 40, finalY, pageWidth / 2 + 40, finalY); 

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text("Firma Coordinador(a)", pageWidth / 2, finalY + 5, { align: "center" });

        doc.save(`Reporte_Ciclos_${filtroPeriodo}.pdf`);
    };

    return (
        <div className="space-y-6 p-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-200 pb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CalculatorIcon className="h-7 w-7 text-blue-700"/>
                        Promedio por Ciclo
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Desglose de habilidades evaluadas en cada nivel - {nombreCarrera || 'Cargando...'}
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={generarExcel}
                        disabled={dataCiclos.length === 0 || loading}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow flex items-center gap-2 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <TableCellsIcon className="h-5 w-5"/>
                        Excel
                    </button>

                    <button 
                        onClick={generarPDF}
                        disabled={dataCiclos.length === 0 || loading}
                        className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg shadow flex items-center gap-2 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PrinterIcon className="h-5 w-5"/>
                        PDF
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 max-w-md">
                <CustomSelect 
                    label="Seleccionar Periodo" 
                    icon={CalendarDaysIcon} 
                    options={periodos.map(p => ({value: p.nombre, label: p.nombre}))} 
                    value={filtroPeriodo} 
                    onChange={setFiltroPeriodo} 
                />
            </div>

            {loading ? (
                <div className="text-center py-10 text-blue-600">Calculando promedios por ciclo...</div>
            ) : dataCiclos.length === 0 ? (
                <div className="text-center py-10 text-gray-400 italic bg-white rounded border border-dashed">
                    No hay datos registrados para este periodo.
                </div>
            ) : (
                <div className="space-y-10">
                    {dataCiclos.map((ciclo, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden">
                            {/* Cabecera del Ciclo */}
                            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <AcademicCapIcon className="h-6 w-6 text-white"/>
                                    {ciclo.ciclo}
                                </h3>
                                <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-medium border border-blue-400">
                                    {ciclo.habilidades.length} Habilidades Evaluadas
                                </span>
                            </div>

                            <div className="p-6 grid grid-cols-1 gap-6">
                                {ciclo.habilidades.map((hab, idx) => (
                                    <div key={idx} className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                                        
                                        {/* Cabecera de la Habilidad */}
                                        <div className="px-4 py-3 bg-white border-b border-gray-200 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <ChartBarIcon className="h-5 w-5 text-blue-600"/>
                                                <h4 className="font-bold text-gray-800">{hab.habilidad}</h4>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500 uppercase">Promedio Ciclo:</span>
                                                <span className={`text-lg font-bold ${parseFloat(hab.promedio_ciclo) >= 3.5 ? 'text-green-600' : 'text-orange-500'}`}>
                                                    {hab.promedio_ciclo} <span className="text-xs text-gray-400">/5</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Tabla de Materias */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left text-gray-600">
                                                <thead className="text-xs text-gray-500 uppercase bg-gray-100 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-4 py-2 font-medium">Asignatura</th>
                                                        <th className="px-4 py-2 font-medium">Actividad</th>
                                                        <th className="px-4 py-2 font-medium text-center">Estudiantes</th>
                                                        <th className="px-4 py-2 font-medium text-center">Promedio</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {hab.materias.map((mat, i) => (
                                                        <tr key={i} className="hover:bg-white transition-colors">
                                                            <td className="px-4 py-2 font-medium text-gray-800">{mat.asignatura}</td>
                                                            <td className="px-4 py-2 text-xs">{mat.actividad}</td>
                                                            <td className="px-4 py-2 text-center">
                                                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                                                                    {mat.estudiantes}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2 text-center font-bold text-gray-700">
                                                                {mat.promedio}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PromedioHabilidad;