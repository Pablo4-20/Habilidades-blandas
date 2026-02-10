import { useState, useEffect } from 'react';
import api from '../services/api';
import CustomSelect from './ui/CustomSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx'; // [NUEVO] Importamos la librería para Excel
import { 
    CalculatorIcon, 
    CalendarDaysIcon,
    ChartBarIcon,
    UserGroupIcon,
    PrinterIcon,
    TableCellsIcon // [NUEVO] Icono para el botón de Excel
} from '@heroicons/react/24/outline';

import logoIzq from '../assets/facultad.png'; 
import logoSoftware from '../assets/software.png';
import logoTecnologias from '../assets/tecnologias.png';

const PromedioHabilidad = () => {
    const [periodos, setPeriodos] = useState([]);
    const [filtroPeriodo, setFiltroPeriodo] = useState('');
    const [data, setData] = useState([]);
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
            setData(res.data.data || []);
            setNombreCarrera(res.data.carrera || 'Carrera');
        } catch (error) {
            console.error("Error:", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // [NUEVO] GENERAR EXCEL
    // ==========================================
    const generarExcel = () => {
        if (data.length === 0) return;

        // 1. Aplanar la data: Convertir la estructura jerárquica a filas planas para Excel
        const filasExcel = [];

        data.forEach(item => {
            // Si la habilidad no tiene materias, igual agregamos una fila con el promedio general
            if (!item.materias || item.materias.length === 0) {
                filasExcel.push({
                    "Periodo": filtroPeriodo,
                    "Carrera": nombreCarrera,
                    "Habilidad": item.habilidad,
                    "Promedio Gral. Habilidad": `${item.promedio_general}%`,
                    "Ciclo": "N/A",
                    "Asignatura": "Sin asignaturas",
                    "Actividad": "-",
                    "Estudiantes Evaluados": 0,
                    "Promedio Asignatura": "-"
                });
            } else {
                // Si tiene materias, creamos una fila por cada materia/actividad
                item.materias.forEach(materia => {
                    filasExcel.push({
                        "Periodo": filtroPeriodo,
                        "Carrera": nombreCarrera,
                        "Habilidad": item.habilidad,
                        "Promedio Gral. Habilidad": `${item.promedio_general}%`, // Repetimos el dato para permitir filtros en Excel
                        "Ciclo": materia.ciclo,
                        "Asignatura": materia.asignatura,
                        "Actividad": materia.actividad,
                        "Estudiantes Evaluados": materia.estudiantes,
                        "Promedio Asignatura": `${materia.promedio}%`
                    });
                });
            }
        });

        // 2. Crear hoja de trabajo y libro
        const worksheet = XLSX.utils.json_to_sheet(filasExcel);
        
        // Ajustar ancho de columnas automáticamente (opcional pero recomendado)
        const wscols = [
            { wch: 15 }, // Periodo
            { wch: 30 }, // Carrera
            { wch: 25 }, // Habilidad
            { wch: 20 }, // Promedio Gral
            { wch: 10 }, // Ciclo
            { wch: 30 }, // Asignatura
            { wch: 25 }, // Actividad
            { wch: 15 }, // Estudiantes
            { wch: 15 }  // Promedio Ind
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Habilidades");

        // 3. Descargar archivo
        XLSX.writeFile(workbook, `Reporte_Habilidades_${filtroPeriodo}.xlsx`);
    };

    // ==========================================
    // GENERAR PDF
    // ==========================================
    const generarPDF = () => {
        if (data.length === 0) return;

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
            doc.text("REPORTE DE PROMEDIOS POR HABILIDAD", pageWidth / 2, 18, { align: "center" });
            
            doc.setFontSize(10); doc.setTextColor(80);
            doc.text(`${nombreCarrera} | Periodo: ${filtroPeriodo}`, pageWidth / 2, 24, { align: "center" });
            
            return 35; 
        };

        let finalY = dibujarEncabezado();

        data.forEach((item, index) => {
            if (finalY > pageHeight - 40) { 
                doc.addPage(); 
                finalY = dibujarEncabezado(); 
            }

            doc.setFillColor(240, 240, 240);
            doc.rect(14, finalY, pageWidth - 28, 8, 'F');
            
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138); 
            doc.setFont("helvetica", "bold");
            doc.text(`Habilidad: ${item.habilidad}`, 16, finalY + 5);
            
            doc.setTextColor(0, 100, 0); 
            doc.text(`Promedio General: ${item.promedio_general}%`, pageWidth - 16, finalY + 5, { align: "right" });

            finalY += 10;

            const bodyTable = item.materias.map(m => [
                m.ciclo,          
                m.estudiantes,    
                m.promedio + '%'  
            ]);

            autoTable(doc, {
                startY: finalY,
                head: [['Ciclo', 'Estudiantes Evaluados', 'Promedio Individual']], 
                body: bodyTable,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
                headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 40 }, 
                    1: { cellWidth: 50 }, 
                    2: { cellWidth: 'auto' } 
                },
                margin: { left: 14, right: 14 },
                didDrawPage: (data) => {
                    if (data.pageNumber > 1 && data.cursor.y === data.settings.startY) {
                        dibujarEncabezado();
                    }
                }
            });

            finalY = doc.lastAutoTable.finalY + 10;
        });

        if (finalY + 40 > pageHeight) {
            doc.addPage();
            finalY = dibujarEncabezado() + 20; 
        } else {
            finalY += 20; 
        }

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(pageWidth / 2 - 40, finalY, pageWidth / 2 + 40, finalY); 

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        doc.text("Firma Coordinador(a)", pageWidth / 2, finalY + 5, { align: "center" });

        const fechaActual = new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado el: ${fechaActual}`, pageWidth - 14, pageHeight - 10, { align: 'right' });

        doc.save(`Promedio_Habilidades_${filtroPeriodo}.pdf`);
    };

    return (
        <div className="space-y-6 p-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-200 pb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CalculatorIcon className="h-7 w-7 text-blue-700"/>
                        Promedio por Habilidad
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Análisis comparativo - {nombreCarrera || 'Cargando...'}
                    </p>
                </div>
                
                {/* [NUEVO] Agrupamos botones de exportación */}
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={generarExcel}
                        disabled={data.length === 0 || loading}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow flex items-center gap-2 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <TableCellsIcon className="h-5 w-5"/>
                        Excel
                    </button>

                    <button 
                        onClick={generarPDF}
                        disabled={data.length === 0 || loading}
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
                <div className="text-center py-10 text-blue-600">Calculando promedios...</div>
            ) : data.length === 0 ? (
                <div className="text-center py-10 text-gray-400 italic bg-white rounded border border-dashed">
                    No hay datos registrados para este periodo.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {data.map((item, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <ChartBarIcon className="h-5 w-5 text-blue-600"/>
                                        {item.habilidad}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Datos consolidados del periodo
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                                    <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Promedio General:</span>
                                    <span className={`text-xl font-bold ${parseFloat(item.promedio_general) >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                                        {item.promedio_general}%
                                    </span>
                                </div>
                            </div>

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