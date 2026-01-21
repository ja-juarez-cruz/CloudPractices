import React, { useState, useMemo, useRef } from 'react';
import { DollarSign, Calendar, Users, Clock, Save, X, AlertCircle, Download, Share2, Gift } from 'lucide-react';
import html2canvas from 'html2canvas';

const API_BASE_URL = 'https://9l2vrevqm1.execute-api.us-east-1.amazonaws.com/dev';

// Componente para el Calendario de Rondas con exportación
function CalendarioRondas({ fechasEjemplo, totalRondas, nombreTanda, montoPorRonda, frecuencia }) {
  const calendarioRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportarCalendario = async () => {
    if (!calendarioRef.current) {
      alert('No se pudo encontrar el calendario para exportar');
      return;
    }
    
    setIsExporting(true);
    
    try {
      console.log('📸 Iniciando captura de calendario...');
      
      const canvas = await html2canvas(calendarioRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: calendarioRef.current.scrollWidth,
        windowHeight: calendarioRef.current.scrollHeight
      });
      
      console.log('✅ Canvas generado correctamente');
      
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Error al generar la imagen');
          return;
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `calendario-${nombreTanda || 'tanda'}.png`;
        link.href = url;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        console.log('✅ Descarga iniciada');
      }, 'image/png');
      
    } catch (error) {
      console.error('❌ Error al exportar calendario:', error);
      alert(`Error al exportar el calendario: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const compartirCalendario = async () => {
    if (!calendarioRef.current) {
      alert('No se pudo encontrar el calendario para compartir');
      return;
    }
    
    setIsExporting(true);
    
    try {
      console.log('📸 Iniciando captura para compartir...');
      
      const canvas = await html2canvas(calendarioRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: calendarioRef.current.scrollWidth,
        windowHeight: calendarioRef.current.scrollHeight
      });
      
      console.log('✅ Canvas generado para compartir');
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('Error al generar la imagen');
          setIsExporting(false);
          return;
        }
        
        const fileName = `calendario-${nombreTanda || 'tanda'}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            console.log('📱 Usando Web Share API...');
            await navigator.share({
              files: [file],
              title: `Calendario - ${nombreTanda || 'Tanda'}`,
              text: `Calendario de rondas para ${nombreTanda || 'la tanda'}`
            });
            console.log('✅ Compartido exitosamente');
          } catch (shareError) {
            if (shareError.name !== 'AbortError') {
              console.log('⚠️ Error compartiendo, intentando descargar...', shareError);
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.download = fileName;
              link.href = url;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setTimeout(() => URL.revokeObjectURL(url), 100);
            }
          }
        } else {
          console.log('⚠️ Web Share API no disponible, descargando...');
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = fileName;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 100);
        }
        
        setIsExporting(false);
      }, 'image/png');
      
    } catch (error) {
      console.error('❌ Error al compartir calendario:', error);
      alert(`Error al compartir: ${error.message}`);
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Calendario de Rondas
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={compartirCalendario}
            disabled={isExporting}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-1.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            title="Compartir"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Compartir</span>
          </button>
          <button
            type="button"
            onClick={exportarCalendario}
            disabled={isExporting}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-1.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            title="Descargar imagen"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Descargar</span>
          </button>
        </div>
      </div>

      <div className="p-4 bg-gray-50 max-h-[400px] overflow-y-auto">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-3">
          <p className="text-xs text-blue-800 text-center">
            💡 <strong>Vista previa</strong> - Desplázate para ver todas las rondas. Al exportar se incluyen todas.
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {fechasEjemplo.map((item, index) => (
            <div 
              key={index}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-blue-200 hover:border-blue-400 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-lg flex items-center justify-center font-bold text-sm mb-1 shadow-sm">
                {item.ronda}
              </div>
              <div className="text-xs font-bold text-gray-800">
                {item.fecha.toLocaleDateString('es-MX', { 
                  day: 'numeric', 
                  month: 'short'
                })}
              </div>
              <div className="text-[10px] text-gray-600">
                {item.fecha.getFullYear()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div ref={calendarioRef} className="absolute left-[-9999px] top-[-9999px] p-8 bg-white" style={{ width: '800px' }}>
        <div className="mb-6 text-center pb-4 border-b-2 border-blue-200">
          <h1 className="text-3xl font-black text-gray-800 mb-2">
            📅 {nombreTanda || 'Calendario de Tanda'}
          </h1>
          <div className="flex items-center justify-center gap-6 text-base text-gray-700">
            <span className="flex items-center gap-2 font-semibold">
              <Users className="w-5 h-5 text-blue-600" />
              {totalRondas} participantes
            </span>
            <span className="flex items-center gap-2 font-semibold">
              <DollarSign className="w-5 h-5 text-green-600" />
              ${montoPorRonda ? parseFloat(montoPorRonda).toLocaleString() : '0'} por persona
            </span>
            <span className="flex items-center gap-2 font-semibold capitalize">
              <Clock className="w-5 h-5 text-purple-600" />
              {frecuencia === 'cumpleaños' ? 'Cada Cumpleaños' : frecuencia}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {fechasEjemplo.map((item, index) => (
            <div 
              key={index}
              className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-200"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-lg mb-2">
                {item.ronda}
              </div>
              <div className="text-sm font-bold text-gray-700 mb-1">
                Ronda {item.ronda}
              </div>
              <div className="text-base font-black text-gray-900">
                {item.fecha.toLocaleDateString('es-MX', { 
                  day: '2-digit', 
                  month: 'short'
                })}
              </div>
              <div className="text-sm text-gray-600 font-semibold">
                {item.fecha.getFullYear()}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="col-span-3">
              <div className="text-sm text-gray-600 font-semibold mb-1">
                Total a recibir (cada participante)
              </div>
              <div className="text-xl font-black text-green-700">
                ${montoPorRonda && totalRondas
                  ? (parseFloat(montoPorRonda) * (totalRondas - 1)).toLocaleString()
                  : '0'}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t-2 border-gray-200 text-center">
          <p className="text-sm text-gray-600 font-semibold">
            📱 Generado por <span className="text-blue-600 font-black">TandasMX</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date().toLocaleDateString('es-MX', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
      </div>

      <div className="px-6 pb-4 bg-gray-50">
        <p className="text-xs text-gray-600 text-center">
          {isExporting ? '⏳ Generando imagen...' : `💡 Al exportar se incluyen todas las ${totalRondas} rondas con sus fechas`}
        </p>
      </div>
    </div>
  );
}

export default function CrearTandaView({ setTandaData, setLoading, setError, loadAdminData }) {
  const [formData, setFormData] = useState({
    nombre: '',
    montoPorRonda: '',
    totalRondas: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    frecuencia: 'semanal',
    diasRecordatorio: '1',
    metodoPago: 'Transferencia'
  });

  const [errors, setErrors] = useState({});

  // Calcular fechas de ejemplo de rondas dinámicamente
  const fechasEjemplo = useMemo(() => {
    // Para tanda cumpleañera, no mostramos calendario hasta que haya participantes registrados
    if (formData.frecuencia === 'cumpleaños') {
      return [];
    }

    if (!formData.fechaInicio || !formData.totalRondas) return [];
    
    const fechaBase = new Date(formData.fechaInicio);
    const rondas = parseInt(formData.totalRondas);
    const resultado = [];
    
    function ultimoDiaDelMes(fecha) {
      return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
    }

    const calcularFechaRonda = (indice) => {
      const fecha = new Date(fechaBase);
      const frecuencia = formData.frecuencia;
      
      if (frecuencia === "semanal") {
        if (indice === 1) {
          fecha.setDate(fecha.getDate());
        } else {
          fecha.setDate(fecha.getDate() + 7 * (indice - 1));
        }
        fecha.setDate(fecha.getDate() + 1);
        return fecha;
      }

      if (frecuencia === "mensual") {
        fecha.setMonth(fecha.getMonth() + indice - 1);
        fecha.setDate(fecha.getDate() + 1);
        return fecha;
      }

      if (frecuencia === "quincenal") {
        let temp = new Date(fecha);
        let diaInicial = temp.getDate();
        let esFinDeMes = diaInicial > 15;

        for (let i = 1; i <= indice; i++) {
          if (esFinDeMes) {
            temp = ultimoDiaDelMes(temp);
          } else {
            temp.setDate(15);
          }

          if (i < indice) {
            if (esFinDeMes) {
              temp.setDate(1);
              temp.setMonth(temp.getMonth() + 1);
              temp.setDate(15);
            } else {
              temp = ultimoDiaDelMes(temp);
            }
            esFinDeMes = !esFinDeMes;
          }
        }

        return temp;
      }

      return fecha;
    };
    
    for (let i = 1; i <= rondas; i++) {
      const fecha = calcularFechaRonda(i);
      resultado.push({
        ronda: i,
        fecha: fecha
      });
    }
    
    return resultado;
  }, [formData.fechaInicio, formData.totalRondas, formData.frecuencia]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }
    
    if (!formData.montoPorRonda || formData.montoPorRonda <= 0) {
      newErrors.montoPorRonda = 'El monto debe ser mayor a 0';
    }
    
    if (!formData.totalRondas || formData.totalRondas < 2) {
      newErrors.totalRondas = 'Debe haber al menos 2 participantes';
    }
    
    // Para tanda cumpleañera, la fecha de inicio no es requerida
    if (formData.frecuencia !== 'cumpleaños' && !formData.fechaInicio) {
      newErrors.fechaInicio = 'La fecha de inicio es requerida';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/tandas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          montoPorRonda: parseFloat(formData.montoPorRonda),
          totalRondas: parseInt(formData.totalRondas),
          fechaInicio: formData.frecuencia === 'cumpleaños' ? null : formData.fechaInicio,
          frecuencia: formData.frecuencia,
          diasRecordatorio: parseInt(formData.diasRecordatorio),
          metodoPago: formData.metodoPago,
          rondaActual: 1,
          status: 'active'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al crear la tanda');
      }
      
      if (data.success) {
        console.log('✅ Tanda creada exitosamente:', data.data);
        
        await loadAdminData();
        setTandaData(data.data);
      }
    } catch (error) {
      console.error('Error creando tanda:', error);
      setError(error.message || 'Error al crear la tanda');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const esCumpleañera = formData.frecuencia === 'cumpleaños';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header - SIEMPRE AZUL */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Crear Nueva Tanda</h2>
              <p className="text-sm opacity-90">
                {esCumpleañera 
                  ? 'Tanda Cumpleañera 🎂'
                  : 'Configura los detalles de tu tanda'}
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          <div className="space-y-6">
            {/* Nombre de la Tanda */}
            <div>
              <label htmlFor="nombre-tanda" className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre de la Tanda *
              </label>
              <input
                id="nombre-tanda"
                name="nombre"
                type="text"
                value={formData.nombre}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.nombre 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                }`}
                placeholder={esCumpleañera ? "Ej: Tanda Cumpleañera Familia 2025" : "Ej: Tanda Familiar 2025"}
              />
              {errors.nombre && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.nombre}
                </p>
              )}
            </div>

            {/* Frecuencia - MOVIDO ARRIBA */}
            <div>
              <label htmlFor="frecuencia" className="block text-sm font-semibold text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Tipo de Tanda *
              </label>
              <select
                id="frecuencia"
                name="frecuencia"
                value={formData.frecuencia}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="semanal">Semanal (cada 7 días)</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
                <option value="cumpleaños">Cumpleañera 🎂</option>
              </select>
            </div>

            {/* Alerta especial para tanda cumpleañera */}
            {esCumpleañera && (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Gift className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-bold mb-2">🎂 Tanda Cumpleañera - Cómo funciona:</p>
                    <ul className="list-disc list-inside space-y-1.5 text-xs">
                      <li><strong>Cada participante recibe dinero el día de su cumpleaños</strong></li>
                      <li>Los otros {formData.totalRondas ? parseInt(formData.totalRondas) - 1 : 'N-1'} participantes le dan ${formData.montoPorRonda || 'X'} cada uno</li>
                      <li>Total a recibir: ${formData.montoPorRonda && formData.totalRondas ? (parseFloat(formData.montoPorRonda) * (parseInt(formData.totalRondas) - 1)).toLocaleString() : 'X × (N-1)'}</li>
                      <li>Las fechas de cumpleaños se capturan al registrar participantes</li>
                      <li className="text-blue-700 font-semibold">⚠️ El calendario se generará cuando todos los participantes estén registrados</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Monto y Participantes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="monto-ronda" className="block text-sm font-semibold text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  {esCumpleañera ? 'Monto por Participante *' : 'Monto por Ronda *'}
                </label>
                <input
                  id="monto-ronda"
                  name="montoPorRonda"
                  type="number"
                  min="1"
                  step="0.01"
                  value={formData.montoPorRonda}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.montoPorRonda 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                  placeholder="1000"
                />
                {esCumpleañera && (
                  <p className="mt-1.5 text-xs text-blue-600">
                    Cada persona da esta cantidad al cumpleañero
                  </p>
                )}
                {errors.montoPorRonda && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.montoPorRonda}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="total-rondas" className="block text-sm font-semibold text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  {esCumpleañera ? 'Total de Participantes *' : 'Total de Rondas *'}
                </label>
                <input
                  id="total-rondas"
                  name="totalRondas"
                  type="number"
                  min="2"
                  value={formData.totalRondas}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.totalRondas 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                  placeholder="10"
                />
                {esCumpleañera && (
                  <p className="mt-1.5 text-xs text-blue-600">
                    Número de personas en la tanda
                  </p>
                )}
                {errors.totalRondas && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.totalRondas}
                  </p>
                )}
              </div>
            </div>

            {/* Fecha de Inicio - SOLO para tandas normales */}
            {!esCumpleañera && (
              <div>
                <label htmlFor="fecha-inicio" className="block text-sm font-semibold text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha de Inicio *
                </label>
                <input
                  id="fecha-inicio"
                  name="fechaInicio"
                  type="date"
                  value={formData.fechaInicio}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.fechaInicio 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                />
                {errors.fechaInicio && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.fechaInicio}
                  </p>
                )}
              </div>
            )}

            {/* Calendario de Rondas - SOLO para tandas normales */}
            {!esCumpleañera && fechasEjemplo.length > 0 && (
              <CalendarioRondas 
                fechasEjemplo={fechasEjemplo}
                totalRondas={parseInt(formData.totalRondas)}
                nombreTanda={formData.nombre}
                montoPorRonda={formData.montoPorRonda}
                frecuencia={formData.frecuencia}
              />
            )}

            {/* Días de Recordatorio
            <div>
              <label htmlFor="dias-recordatorio" className="block text-sm font-semibold text-gray-700 mb-2">
                Días de Anticipación para Recordatorios
              </label>
              <select
                id="dias-recordatorio"
                name="diasRecordatorio"
                value={formData.diasRecordatorio}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="1">1 día antes</option>
                <option value="2">2 días antes</option>
                <option value="3">3 días antes</option>
                <option value="5">5 días antes</option>
                <option value="7">7 días antes</option>
                {esCumpleañera && (
                  <>
                    <option value="15">15 días antes</option>
                    <option value="30">30 días antes</option>
                  </>
                )}
              </select>
              <p className="mt-1.5 text-xs text-gray-500">
                {esCumpleañera 
                  ? 'Cuándo recordar a los participantes sobre el cumpleaños'
                  : 'Cuándo enviar recordatorios automáticos antes del vencimiento'}
              </p>
            </div>*/}

            {/* Resumen Financiero - SIEMPRE AZUL */}
            <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-5 border-2 border-blue-200">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Resumen Financiero
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Número de Participantes:</span>
                  <span className="font-semibold text-gray-800">
                    {formData.totalRondas || '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {esCumpleañera ? 'Aportación por persona:' : 'Monto por ronda:'}
                  </span>
                  <span className="font-semibold text-gray-800">
                    ${formData.montoPorRonda ? parseFloat(formData.montoPorRonda).toLocaleString() : '0'}
                  </span>
                </div>
                {esCumpleañera ? (
                  <>
                    <div className="pt-3 border-t-2 border-blue-300">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-semibold">Total a recibir (cada participante):</span>
                        <span className="font-black text-blue-700 text-xl">
                          ${formData.montoPorRonda && formData.totalRondas 
                            ? (parseFloat(formData.montoPorRonda) * (parseInt(formData.totalRondas) - 1)).toLocaleString()
                            : '0'}
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1 text-right">
                        ({formData.totalRondas ? parseInt(formData.totalRondas) - 1 : '0'} personas × ${formData.montoPorRonda || '0'})
                      </p>
                    </div>
                    <div className="pt-3 border-t border-blue-200">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total a dar en el año:</span>
                        <span className="font-bold text-green-600">
                          ${formData.montoPorRonda && formData.totalRondas 
                            ? (parseFloat(formData.montoPorRonda) * (parseInt(formData.totalRondas) - 1)).toLocaleString()
                            : '0'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        (${formData.montoPorRonda || '0'} a cada uno de los otros {formData.totalRondas ? parseInt(formData.totalRondas) - 1 : '0'} participantes)
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="pt-3 border-t-2 border-blue-300">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-semibold">Total de la tanda:</span>
                        <span className="font-black text-blue-700 text-xl">
                          ${formData.montoPorRonda && formData.totalRondas 
                            ? (parseFloat(formData.montoPorRonda) * parseInt(formData.totalRondas)).toLocaleString()
                            : '0'}
                        </span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-blue-200">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Recibirá cada participante:</span>
                        <span className="font-bold text-green-600">
                          ${formData.montoPorRonda && formData.totalRondas 
                            ? (parseFloat(formData.montoPorRonda) * parseInt(formData.totalRondas)).toLocaleString()
                            : '0'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Información Adicional */}
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-semibold mb-1">Recuerda:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {esCumpleañera ? (
                      <>
                        <li>Cada participante debe registrarse con su fecha de cumpleaños</li>
                        <li>El calendario se generará automáticamente cuando todos estén registrados</li>
                        <li>Los participantes recibirán el dinero de todos los demás en su cumpleaños</li>
                      </>
                    ) : (
                      <>
                        <li>Podrás agregar participantes después de crear la tanda</li>
                        <li>Las fechas se calculan según la frecuencia seleccionada</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Botón de Crear - SIEMPRE AZUL */}
            <div className="pt-4 border-t-2 border-gray-200">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Crear Tanda {esCumpleañera && '🎂'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}