import React, { useState } from 'react';
import { DollarSign, Calendar, Users, Clock, Save } from 'lucide-react';

const API_BASE_URL = 'https://9l2vrevqm1.execute-api.us-east-1.amazonaws.com/dev';

export default function CrearTandaView({ setTandaData, setLoading, setError, loadAdminData, setActiveView }) {
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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }
    
    if (!formData.montoPorRonda || formData.montoPorRonda <= 0) {
      newErrors.montoPorRonda = 'El monto debe ser mayor a 0';
    }
    
    if (!formData.totalRondas || formData.totalRondas < 2) {
      newErrors.totalRondas = 'Debe haber al menos 2 rondas';
    }
    
    if (!formData.fechaInicio) {
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
          fechaInicio: formData.fechaInicio,
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
        // Recargar datos del admin
        await loadAdminData();
        // Volver a la vista de inicio
        setActiveView?.('inicio');
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
    console.log('🟢 CREAR TANDA - handleChange disparado');
    console.log('🟢 Campo:', name);
    console.log('🟢 Valor nuevo:', value);
    console.log('🟢 Estado actual formData:', formData);
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    console.log('🟢 setFormData llamado');
    
    // Limpiar error del campo cuando se modifica
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl mb-4">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black text-gray-800 mb-2">Crear Nueva Tanda</h2>
          <p className="text-gray-600">Configura los detalles de tu tanda</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
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
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                errors.nombre 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-orange-500'
              }`}
              placeholder="Ej: Tanda Familiar 2025"
            />
            {errors.nombre && (
              <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
            )}
          </div>

          {/* Monto y Rondas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="monto-ronda" className="block text-sm font-semibold text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Monto por Ronda *
              </label>
              <input
                id="monto-ronda"
                name="montoPorRonda"
                type="number"
                min="1"
                step="0.01"
                value={formData.montoPorRonda}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                  errors.montoPorRonda 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-orange-500'
                }`}
                placeholder="10000"
              />
              {errors.montoPorRonda && (
                <p className="mt-1 text-sm text-red-600">{errors.montoPorRonda}</p>
              )}
            </div>

            <div>
              <label htmlFor="total-rondas" className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Total de Rondas *
              </label>
              <input
                id="total-rondas"
                name="totalRondas"
                type="number"
                min="2"
                value={formData.totalRondas}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                  errors.totalRondas 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-orange-500'
                }`}
                placeholder="12"
              />
              {errors.totalRondas && (
                <p className="mt-1 text-sm text-red-600">{errors.totalRondas}</p>
              )}
            </div>
          </div>

          {/* Fecha de Inicio */}
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
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                errors.fechaInicio 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-orange-500'
              }`}
            />
            {errors.fechaInicio && (
              <p className="mt-1 text-sm text-red-600">{errors.fechaInicio}</p>
            )}
          </div>

          {/* Frecuencia */}
          <div>
            <label htmlFor="frecuencia" className="block text-sm font-semibold text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Frecuencia de Rondas
            </label>
            <select
              id="frecuencia"
              name="frecuencia"
              value={formData.frecuencia}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
            >
              <option value="semanal">Semanal (cada 7 días)</option>
              <option value="quincenal">Quincenal (cada 15 días)</option>
              <option value="mensual">Mensual (cada 30 días)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Determina cada cuánto se cobra una ronda
            </p>
          </div>

          {/* Configuración de Recordatorios */}
          <div>
            <label htmlFor="dias-recordatorio" className="block text-sm font-semibold text-gray-700 mb-2">
              Días de Anticipación para Recordatorios
            </label>
            <select
              id="dias-recordatorio"
              name="diasRecordatorio"
              value={formData.diasRecordatorio}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
            >
              <option value="1">1 día antes</option>
              <option value="2">2 días antes</option>
              <option value="3">3 días antes</option>
              <option value="5">5 días antes</option>
              <option value="7">7 días antes</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Cuándo enviar recordatorios automáticos antes del vencimiento
            </p>
          </div>

          {/* Método de Pago 
          <div>
            <label htmlFor="metodo-pago" className="block text-sm font-semibold text-gray-700 mb-2">
              Método de Pago Predeterminado
            </label>
            <select
              id="metodo-pago"
              name="metodoPago"
              value={formData.metodoPago}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
            >
              <option value="Transferencia">Transferencia Bancaria</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
              <option value="Depósito">Depósito Bancario</option>
              <option value="Otro">Otro</option>
            </select>
          </div>*/}

          {/* Resumen */}
          <div className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-2xl p-6 border-2 border-orange-200">
            <h3 className="font-bold text-gray-800 mb-3">Resumen de la Tanda</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Participantes esperados:</span>
                <span className="font-semibold text-gray-800">
                  {formData.totalRondas || '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monto por participante:</span>
                <span className="font-semibold text-gray-800">
                  ${formData.montoPorRonda ? parseFloat(formData.montoPorRonda).toLocaleString() : '0'}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-orange-300">
                <span className="text-gray-700 font-semibold">Total de la tanda:</span>
                <span className="font-bold text-orange-600 text-lg">
                  ${formData.montoPorRonda && formData.totalRondas 
                    ? (parseFloat(formData.montoPorRonda) * parseInt(formData.totalRondas)).toLocaleString()
                    : '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Botón Submit */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold py-4 px-6 rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Crear Tanda
          </button>
        </form>

        {/* Información Adicional */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Después de crear la tanda, podrás agregar participantes y asignarles números.
            Los números se asignan en el orden en que se agreguen los participantes.
          </p>
        </div>
      </div>
    </div>
  );
}