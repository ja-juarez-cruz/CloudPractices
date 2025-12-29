import React, { useState, useEffect } from 'react';
import { Settings, Save, Trash2, AlertTriangle, DollarSign, Calendar, Clock, X } from 'lucide-react';

const API_BASE_URL = 'https://9l2vrevqm1.execute-api.us-east-1.amazonaws.com/dev';

export default function ConfiguracionView({ tandaData, setTandaData, loadAdminData, setActiveView }) {
  const [formData, setFormData] = useState({
    nombre: tandaData?.nombre || '',
    montoPorRonda: tandaData?.montoPorRonda || '',
    fechaInicio: tandaData?.fechaInicio || '',
    frecuencia: tandaData?.frecuencia || 'semanal',
    diasRecordatorio: tandaData?.diasRecordatorio || 1
  });

  function getTodayLocalISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset).toISOString().split("T")[0];
  }

  function formatFechaLarga(fechaStr) {
    if (!fechaStr) return "";
    const [y, m, d] = fechaStr.split("-");
    const fecha = new Date(y, m - 1, d);

    return fecha.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  
  // Sincronizar formData cuando tandaData cambia
  useEffect(() => {
    if (tandaData) {
      setFormData({
        nombre: tandaData.nombre || '',
        montoPorRonda: tandaData.montoPorRonda || '',
        fechaInicio: tandaData.fechaInicio || '',
        frecuencia: tandaData.frecuencia || 'semanal',
        diasRecordatorio: tandaData.diasRecordatorio || 1
      });
    }
  }, [tandaData]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [confirmacionTexto, setConfirmacionTexto] = useState('');
  const [confirmacionEliminarCuenta, setConfirmacionEliminarCuenta] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar que la fecha no sea menor a la actual
    const fechaSeleccionada = new Date(formData.fechaInicio);
    const fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0);
    
    if (fechaSeleccionada < fechaActual) {
      setError('La fecha de inicio no puede ser anterior a la fecha actual');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      
      // Preparar payload con fechas en formato ISO
      const payload = {
        nombre: formData.nombre,
        montoPorRonda: parseFloat(formData.montoPorRonda),
        fechaInicio: formData.fechaInicio, // Ya está en formato YYYY-MM-DD
        frecuencia: formData.frecuencia,
        diasRecordatorio: parseInt(formData.diasRecordatorio)
      };
      
      const response = await fetch(
        `${API_BASE_URL}/tandas/${tandaData.tandaId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al actualizar configuración');
      }

      if (data.success) {
        setSuccess('✅ Configuración actualizada exitosamente');
        await loadAdminData();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      setError(error.message || 'Error al actualizar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarTanda = async () => {
    // Validar que el usuario escribió el nombre correcto
    if (confirmacionTexto.trim() !== tandaData.nombre.trim()) {
      setError('El nombre de la tanda no coincide. Por favor, escríbelo correctamente.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/tandas/${tandaData.tandaId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al eliminar tanda');
      }

      if (data.success) {
        // Cerrar modal
        setShowDeleteModal(false);
        setConfirmacionTexto('');
        
        // Mostrar éxito
        setSuccess('✅ Tanda eliminada exitosamente');
        
        // Esperar un momento para que el usuario vea el mensaje
        setTimeout(() => {
          // Limpiar estado y redirigir a inicio
          setTandaData(null);
          setActiveView('inicio');
          loadAdminData();
        }, 1500);
      }
    } catch (error) {
      console.error('Error eliminando tanda:', error);
      setError(error.message || 'Error al eliminar tanda');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarCuenta = async () => {
    // Validar que el usuario escribió ELIMINAR
    if (confirmacionEliminarCuenta.trim().toUpperCase() !== 'ELIMINAR') {
      setError('Debes escribir "ELIMINAR" para confirmar la eliminación de tu cuenta.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
      const response = await fetch(
        `${API_BASE_URL}/users/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al eliminar cuenta');
      }

      if (data.success) {
        // Cerrar modal
        setShowDeleteAccountModal(false);
        
        // Limpiar localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        
        // Mostrar mensaje y redirigir
        alert('Tu cuenta ha sido eliminada permanentemente. Serás redirigido al login.');
        
        // Forzar recarga para ir al login
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error eliminando cuenta:', error);
      setError(error.message || 'Error al eliminar cuenta');
    } finally {
      setLoading(false);
    }
  };

  if (!tandaData) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Settings className="w-7 h-7" />
          Configuración de la Tanda
        </h2>
        <p className="text-gray-600 mt-1">
          Modifica los parámetros de tu tanda
        </p>
      </div>

      {/* Mensajes */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-green-700 font-semibold">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-600 font-semibold">{error}</p>
        </div>
      )}

      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">Información General</h3>
          
          {/* Nombre */}
          <div className="mb-4">
            <label htmlFor="config-nombre" className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre de la Tanda
            </label>
            <input
              id="config-nombre"
              name="nombre"
              type="text"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Monto y Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="config-monto" className="block text-sm font-semibold text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Monto por Ronda
              </label>
              <input
                id="config-monto"
                name="montoPorRonda"
                type="number"
                min="1"
                step="0.01"
                value={formData.montoPorRonda}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="config-fecha" className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha de Inicio
              </label>
              <input
                id="config-fecha"
                name="fechaInicio"
                type="date"
                min={getTodayLocalISO()}
                value={formData.fechaInicio}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                required
              />
              {formData.fechaInicio && (
                <p className="mt-1 text-xs text-gray-500">
                  <strong>{formatFechaLarga(formData.fechaInicio)}</strong>
                </p>
              )}              
            </div>
          </div>

          

          {/* Fechas de Pago por Ronda */}
          {formData.fechaInicio && formData.frecuencia && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="text-sm font-semibold text-blue-800 mb-3">
                📅 Fechas calculadas
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {(() => {
                  const fechaBase = new Date(formData.fechaInicio);
                  const rondas = [];
                  const maxDiasPago = 7;

                  function calcularFechaRonda(fechaInicial, indice, frecuencia) {
                    const fecha = new Date(fechaInicial);

                    if (frecuencia === "semanal") {
                      if (indice===1){
                        fecha.setDate(fecha.getDate());
                      }
                      else{
                        fecha.setDate(fecha.getDate() + 7 * (indice-1));
                      }
                      
                      //fecha.setDate(fecha.getDate()-1);
                      return fecha;
                    }

                    if (frecuencia === "mensual") {
                      fecha.setMonth(fecha.getMonth() + indice-1);
                      return fecha;
                    }

                    if (frecuencia === "quincenal") {
                      indice = indice
                      let temp = new Date(fecha);

                      for (let i = 1; i <= indice; i++) {
                        const dia = temp.getDate();

                        if (dia < 15) {
                          // Segunda quincena del mismo mes
                          if (dia === 1 | dia === 15){
                            temp.setDate(15);
                          }
                          else
                          {temp.setDate(16);}
                        } else {
                          // Primera quincena del siguiente mes
                          temp.setMonth(temp.getMonth() + 1);
                          temp.setDate(1);
                        }
                      }
                      temp.setDate(temp.getDate()-1)

                        return temp;
                    }

                    return fecha;
                  }

                  for (let i = 1; i <= tandaData.totalRondas; i++) {
                    const fechaInicioRonda = calcularFechaRonda(
                      fechaBase,
                      i,
                      formData.frecuencia
                    );
                    fechaInicioRonda.setDate(fechaInicioRonda.getDate()+1)

                    const fechaLimite = new Date(fechaInicioRonda);
                    
                    if (formData.frecuencia==='semanal'){
                      fechaLimite.setDate(fechaLimite.getDate() + 6);
                    }
                    else{
                      fechaLimite.setDate(fechaLimite.getDate() + maxDiasPago);
                    }

                    rondas.push(
                      <div
                        key={i}
                        className={`flex justify-between items-center p-2 rounded-lg ${
                          i % 2 === 0 ? "bg-blue-100" : "bg-white"
                        }`}
                      >
                        <span className="text-xs font-medium text-blue-900">
                          Ronda {i}
                        </span>

                        <div className="text-right">
                          <div className="text-xs text-blue-700 font-semibold">
                            Inicio:{" "}
                            {fechaInicioRonda.toLocaleDateString("es-MX", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>

                          <div className="text-[10px] text-blue-600">
                            Fecha pago:{" "}
                            {fechaLimite.toLocaleDateString("es-MX", {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return rondas;
                })()}
              </div>

              <div className="mt-3 text-xs text-blue-600 border-t border-blue-300 pt-2">
                💡 <strong>Fecha límite de pago</strong> = Fecha inicio de ronda + 7
                días
              </div>
            </div>
          )}
        </div>


        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Configuración de Rondas</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total de Rondas - Solo lectura */}
            <div>
              <label htmlFor="config-total-rondas" className="block text-sm font-semibold text-gray-700 mb-2">
                Total de Rondas
              </label>
              <input
                id="config-total-rondas"
                type="text"
                value={tandaData.totalRondas}
                readOnly
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                Este valor no se puede modificar después de crear la tanda
              </p>
            </div>

            {/* Frecuencia - Solo lectura */}
            <div>
              <label htmlFor="config-frecuencia" className="block text-sm font-semibold text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Frecuencia
              </label>
              <input
                id="config-frecuencia"
                type="text"
                value={formData.frecuencia === 'semanal' ? 'Semanal (cada 7 días)' : 
                       formData.frecuencia === 'quincenal' ? 'Quincenal (cada 15 días)' : 
                       'Mensual (cada 30 días)'}
                readOnly
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                Este valor no se puede modificar después de crear la tanda
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recordatorios</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Días de Recordatorio */}
            <div>
              <label htmlFor="config-dias" className="block text-sm font-semibold text-gray-700 mb-2">
                Días de Anticipación
              </label>
              <select
                id="config-dias"
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
                Cuántos días antes enviar recordatorios de pago
              </p>
            </div>
          </div>
        </div>

        {/* Botón Guardar */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>

      {/* Zona de Peligro */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-red-800 mb-2">Zona de Peligro</h3>
            <p className="text-sm text-red-700 mb-4">
              Las acciones en esta sección son <strong>irreversibles</strong> y eliminarán todos los datos permanentemente.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={loading}
          className="px-4 py-2 bg-transparent border border-red-400 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar Tanda
        </button>

        <div className="mt-4 p-3 bg-red-100 rounded-xl">
          <p className="text-xs text-red-800">
            <strong>⚠️ Advertencia:</strong> Al eliminar la tanda se perderán todos los datos:
            participantes, pagos, historial y configuración. Esta acción no se puede deshacer.
          </p>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación de Tanda */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fadeIn">
            {/* Header del modal */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Eliminar Tanda</h2>
                <p className="text-sm text-gray-600">Esta acción no se puede deshacer</p>
              </div>
            </div>

            {/* Advertencia */}
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-800 font-semibold mb-2">
                ⚠️ Se eliminarán permanentemente:
              </p>
              <p className="text-sm text-red-700">
                La tanda, todos los participantes, todos los pagos, todas las notificaciones y la referencia en tu cuenta.
              </p>
            </div>

            {/* Campo de confirmación */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Para confirmar, escribe el nombre de la tanda:
              </label>
              <div className="mb-2 p-3 bg-gray-100 rounded-xl border border-gray-300">
                <p className="text-base font-bold text-gray-800 text-center">
                  {tandaData.nombre}
                </p>
              </div>
              <input
                type="text"
                value={confirmacionTexto}
                onChange={(e) => setConfirmacionTexto(e.target.value)}
                placeholder="Escribe el nombre aquí"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Error en el modal */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-xl">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmacionTexto('');
                  setError(null);
                }}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarTanda}
                disabled={loading || confirmacionTexto.trim() !== tandaData.nombre.trim()}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Eliminar Permanentemente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Información */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Algunos campos como el "Total de Rondas" no se pueden modificar 
          después de crear la tanda para mantener la integridad de los datos.
        </p>
      </div>

      {/* Modal de Confirmación de Eliminación de Cuenta */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fadeIn">
            {/* Header del modal */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-800">⚠️ Eliminar Cuenta</h2>
                <p className="text-sm text-gray-600">Acción PERMANENTE e IRREVERSIBLE</p>
              </div>
            </div>

            {/* Advertencias */}
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-sm text-red-800 font-bold mb-3">
                🚨 ESTA ACCIÓN NO SE PUEDE DESHACER
              </p>
              <p className="text-xs text-red-700 mb-2">
                Se eliminarán PERMANENTEMENTE:
              </p>
              <ul className="text-xs text-red-700 space-y-1 ml-4 list-disc">
                <li><strong>Tu cuenta y perfil</strong></li>
                <li><strong>Todas tus tandas</strong> (activas e inactivas)</li>
                <li><strong>Todos los participantes</strong> de todas tus tandas</li>
                <li><strong>Todo el historial de pagos</strong></li>
                <li><strong>Todas las configuraciones</strong></li>
              </ul>
              <p className="text-xs text-red-800 font-bold mt-3">
                NO podrás recuperar esta información.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-xl">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Campo de confirmación */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Para confirmar, escribe <span className="text-red-600 font-bold">ELIMINAR</span> en mayúsculas:
              </label>
              <input
                type="text"
                value={confirmacionEliminarCuenta}
                onChange={(e) => setConfirmacionEliminarCuenta(e.target.value)}
                placeholder="Escribe ELIMINAR"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Debe ser exactamente "ELIMINAR" en mayúsculas
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteAccountModal(false);
                  setConfirmacionEliminarCuenta('');
                  setError(null);
                }}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarCuenta}
                disabled={loading || confirmacionEliminarCuenta.trim().toUpperCase() !== 'ELIMINAR'}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Eliminar Cuenta
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-center text-gray-500 mt-4">
              Esta acción eliminará tu cuenta permanentemente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Agregar estilos para la animación del modal
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out;
    }
  `;
  if (!document.querySelector('style[data-modal-animations]')) {
    style.setAttribute('data-modal-animations', 'true');
    document.head.appendChild(style);
  }
}