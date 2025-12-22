import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, CheckCircle, XCircle, Clock, Filter, RefreshCw } from 'lucide-react';

const API_BASE_URL = 'https://9l2vrevqm1.execute-api.us-east-1.amazonaws.com/dev';

export default function PagosView({ tandaData, setTandaData, loadAdminData }) {
  const [matrizPagos, setMatrizPagos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Definir cargarMatrizPagos PRIMERO
  const cargarMatrizPagos = useCallback(async () => {
    console.log('🔵 cargarMatrizPagos ejecutado');
    console.log('  tandaData dentro de función:', tandaData);
    console.log('  tandaData?.tandaId dentro de función:', tandaData?.tandaId);
    
    // Validar que tandaData y tandaId existan
    if (!tandaData || !tandaData.tandaId) {
      console.warn('⚠️ No se puede cargar matriz de pagos: tandaId no disponible');
      setMatrizPagos(null);
      return;
    }

    console.log('✅ Haciendo fetch para tandaId:', tandaData.tandaId);
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const url = `${API_BASE_URL}/tandas/${tandaData.tandaId}/pagos/matriz`;
      console.log('📡 Fetching:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        const matrizApi = data.data?.matriz || [];
        const pagosArray = [];
        
        matrizApi.forEach(participante => {
          const participanteId = participante.participanteId;
          const pagos = participante.pagos || {};
          
          Object.keys(pagos).forEach(ronda => {
            if (pagos[ronda]?.pagado) {
              pagosArray.push({
                participanteId,
                ronda: parseInt(ronda),
                pagado: true,
                fechaPago: pagos[ronda].fechaPago
              });
            }
          });
        });
        
        setMatrizPagos(pagosArray);
      }
    } catch (error) {
      console.error('Error cargando matriz:', error);
      setError('Error al cargar matriz de pagos');
    } finally {
      setLoading(false);
    }
  }, [tandaData]); // useCallback con tandaData como dependencia

  // useEffect DESPUÉS de definir cargarMatrizPagos
  useEffect(() => {
    console.log('🔵 PagosView useEffect ejecutado');
    console.log('  tandaData:', tandaData);
    console.log('  tandaData?.tandaId:', tandaData?.tandaId);
    
    if (tandaData?.tandaId) {
      console.log('✅ Llamando cargarMatrizPagos con tandaId:', tandaData.tandaId);
      cargarMatrizPagos();
    } else {
      console.log('⚠️ No se llama cargarMatrizPagos: tandaId no disponible');
    }
  }, [tandaData?.tandaId, cargarMatrizPagos]); // Agregar cargarMatrizPagos a dependencias

  const togglePago = async (participanteId, ronda) => {
    // Validar que tandaData y tandaId existan
    if (!tandaData || !tandaData.tandaId) {
      console.error('❌ No se puede registrar pago: tandaId no disponible');
      setError('No se puede registrar el pago. Tanda no seleccionada.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      
      // Verificar si ya existe el pago
      const pagoActual = Array.isArray(matrizPagos)
        ? matrizPagos.find(p => p.participanteId === participanteId && p.ronda === ronda)
        : null;

      const estaPagadoAhora = pagoActual?.pagado || false;

      const response = await fetch(
        `${API_BASE_URL}/tandas/${tandaData.tandaId}/pagos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            participanteId,
            ronda,
            pagado: !estaPagadoAhora,
            monto: tandaData.montoPorRonda,
            fechaPago: new Date().toISOString(),
            metodoPago: tandaData.metodoPago || 'Transferencia'
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al registrar pago');
      }

      if (data.success) {
        // Actualizar estado local inmediatamente (UI optimista)
        setMatrizPagos(prev => {
          if (!Array.isArray(prev)) prev = [];
          
          if (estaPagadoAhora) {
            // Remover el pago
            return prev.filter(p => !(p.participanteId === participanteId && p.ronda === ronda));
          } else {
            // Agregar el pago
            return [...prev, { 
              participanteId, 
              ronda, 
              pagado: true,
              fechaPago: new Date().toISOString() 
            }];
          }
        });
        // NO llamar a loadAdminData aquí para evitar recargas múltiples
      }
    } catch (error) {
      console.error('Error registrando pago:', error);
      setError(error.message || 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };

  if (!tandaData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block p-6 bg-gradient-to-br from-orange-100 to-rose-100 rounded-3xl mb-6">
            <CreditCard className="w-20 h-20 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Selecciona una Tanda
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Para ver y gestionar los pagos, primero selecciona una tanda desde la vista de Inicio
          </p>
        </div>
      </div>
    );
  }

  const participantes = tandaData.participantes || [];
  const rondas = Array.from({ length: tandaData.totalRondas }, (_, i) => i + 1);

  // Función para calcular fechas de pago de un participante
  const calcularFechasPago = (numeroAsignado) => {
    if (!tandaData.fechaInicio || !numeroAsignado) return { ultimoPago: null, proximoPago: null };
    
    const fechaInicio = new Date(tandaData.fechaInicio);
    const fechaActual = new Date();
    let diasPorRonda = 7; // semanal
    if (tandaData.frecuencia === 'quincenal') diasPorRonda = 15;
    else if (tandaData.frecuencia === 'mensual') diasPorRonda = 30;
    
    // Calcular ronda actual basada en fecha
    const diasTranscurridos = Math.floor((fechaActual - fechaInicio) / (1000 * 60 * 60 * 24));
    const rondaActualCalculada = Math.floor(diasTranscurridos / diasPorRonda) + 1;
    
    // Calcular fecha de última ronda completada
    let ultimoPago = null;
    if (numeroAsignado < rondaActualCalculada) {
      const diasHastaRondaParticipante = (numeroAsignado - 1) * diasPorRonda;
      const fechaInicioRonda = new Date(fechaInicio);
      fechaInicioRonda.setDate(fechaInicioRonda.getDate() + diasHastaRondaParticipante);
      
      const fechaSiguienteRonda = new Date(fechaInicioRonda);
      fechaSiguienteRonda.setDate(fechaSiguienteRonda.getDate() + diasPorRonda);
      
      ultimoPago = new Date(fechaSiguienteRonda);
      ultimoPago.setDate(ultimoPago.getDate() - 1); // 1 día antes
    }
    
    // Calcular fecha del próximo pago (siempre su turno)
    const diasHastaRonda = (numeroAsignado - 1) * diasPorRonda;
    const fechaInicioRonda = new Date(fechaInicio);
    fechaInicioRonda.setDate(fechaInicioRonda.getDate() + diasHastaRonda);
    
    const fechaSiguienteRonda = new Date(fechaInicioRonda);
    fechaSiguienteRonda.setDate(fechaSiguienteRonda.getDate() + diasPorRonda);
    
    const proximoPago = new Date(fechaSiguienteRonda);
    proximoPago.setDate(proximoPago.getDate() - 1); // 1 día antes
    
    return { ultimoPago, proximoPago };
  };

  // Calcular estadísticas por participante
  const calcularEstadoPorParticipante = (participanteId) => {
    if (!matrizPagos || !Array.isArray(matrizPagos)) {
      return { estado: 'pendiente', pagosAdelantados: 0 };
    }
    
    const pagos = matrizPagos.filter(
      p => p.participanteId === participanteId && p.pagado
    );
    
    const pagosRealizados = pagos.length;
    const pagosEsperados = Math.max(0, tandaData.rondaActual - 1);
    
    // Contar pagos adelantados (rondas futuras)
    const pagosAdelantados = pagos.filter(p => p.ronda > tandaData.rondaActual).length;
    
    let estado;
    if (pagosRealizados >= pagosEsperados) {
      estado = 'al_corriente';
    } else if (pagosRealizados < pagosEsperados) {
      estado = 'atrasado';
    } else {
      estado = 'pendiente';
    }
    
    return { estado, pagosAdelantados };
  };

  // Filtrar participantes según el filtro
  const participantesFiltrados = participantes.filter(p => {
    if (filtroEstado === 'todos') return true;
    const { estado } = calcularEstadoPorParticipante(p.participanteId);
    return estado === filtroEstado;
  });

  // Verificar si un pago está realizado
  const estaPagado = (participanteId, ronda) => {
    if (!matrizPagos || !Array.isArray(matrizPagos)) {
      return false;
    }
    
    return matrizPagos.some(
      p => p.participanteId === participanteId && p.ronda === ronda && p.pagado
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CreditCard className="w-7 h-7" />
            Control de Pagos
          </h2>
          <p className="text-gray-600 mt-1">
            Ronda actual: {tandaData.rondaActual} de {tandaData.totalRondas}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={cargarMatrizPagos}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex items-center gap-4 flex-wrap justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-700">Filtrar:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFiltroEstado('todos')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filtroEstado === 'todos'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos ({participantes.length})
              </button>
              <button
                onClick={() => setFiltroEstado('al_corriente')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filtroEstado === 'al_corriente'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Al Corriente
              </button>
              <button
                onClick={() => setFiltroEstado('atrasado')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filtroEstado === 'atrasado'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Atrasados
              </button>
            </div>
          </div>
          
          {/* Indicador de pagos adelantados */}
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <span className="text-xs font-bold text-yellow-700">↑</span>
            <span className="text-sm font-semibold text-yellow-800">
              {participantes.reduce((total, p) => {
                const { pagosAdelantados } = calcularEstadoPorParticipante(p.participanteId);
                return total + pagosAdelantados;
              }, 0)} pagos adelantados
            </span>
          </div>
        </div>
      </div>

      {/* Matriz de Pagos */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase sticky left-0 bg-gray-50 z-10">
                  Participante
                </th>
                {rondas.map(ronda => (
                  <th
                    key={ronda}
                    className={`px-4 py-3 text-center text-xs font-bold uppercase ${
                      ronda === tandaData.rondaActual
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600'
                    }`}
                  >
                    R{ronda}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {participantesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={rondas.length + 2} className="px-6 py-12 text-center text-gray-500">
                    No hay participantes con este filtro
                  </td>
                </tr>
              ) : (
                participantesFiltrados
                  .sort((a, b) => a.numeroAsignado - b.numeroAsignado)
                  .map((participante) => {
                    const { estado, pagosAdelantados } = calcularEstadoPorParticipante(participante.participanteId);
                    
                    return (
                      <tr key={participante.participanteId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center font-bold text-gray-700">
                              {participante.numeroAsignado}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-800 truncate">
                                {participante.nombre}
                              </div>
                              {(() => {
                                const { ultimoPago, proximoPago } = calcularFechasPago(participante.numeroAsignado);
                                return (
                                  <div className="text-xs space-y-0.5">
                                    {ultimoPago && ultimoPago < new Date() && (
                                      <div className="text-green-600 font-semibold truncate">
                                        ✓ Último: {ultimoPago.toLocaleDateString('es-MX', { 
                                          day: 'numeric', 
                                          month: 'short' 
                                        })}
                                      </div>
                                    )}
                                    
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </td>
                        {rondas.map(ronda => {
                          const pagado = estaPagado(participante.participanteId, ronda);
                          const esRondaActual = ronda === tandaData.rondaActual;
                          const esPasado = ronda < tandaData.rondaActual;
                          const esFuturo = ronda > tandaData.rondaActual;
                          
                          return (
                            <td
                              key={ronda}
                              className={`px-2 py-3 text-center ${
                                esRondaActual ? 'bg-blue-50' : ''
                              }`}
                            >
                              <button
                                onClick={() => togglePago(participante.participanteId, ronda)}
                                disabled={loading}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                                  pagado
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : esPasado
                                    ? 'bg-red-100 hover:bg-red-200 text-red-600 border-2 border-red-300'
                                    : esFuturo
                                    ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600 border-2 border-yellow-300'
                                    : 'bg-blue-100 hover:bg-blue-200 text-blue-600 border-2 border-blue-300'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                title={
                                  pagado
                                    ? 'Pagado - Click para marcar como pendiente'
                                    : esPasado
                                    ? 'Pendiente (atrasado) - Click para marcar como pagado'
                                    : esFuturo
                                    ? 'Pago adelantado - Click para marcar como pagado'
                                    : 'Ronda actual - Click para marcar como pagado'
                                }
                              >
                                {pagado ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : esFuturo ? (
                                  <span className="text-xs font-bold">↑</span>
                                ) : (
                                  <XCircle className="w-5 h-5" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {estado === 'al_corriente' && (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Al día
                              </span>
                            )}
                            {estado === 'atrasado' && (
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Atrasado
                              </span>
                            )}
                            {pagosAdelantados > 0 && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                                +{pagosAdelantados} adelantado{pagosAdelantados > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leyenda */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="font-bold text-gray-800 mb-4">Leyenda</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-800">Pagado</div>
              <div className="text-xs text-gray-500">Click para desmarcar</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 border-2 border-red-300 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-800">Atrasado</div>
              <div className="text-xs text-gray-500">Rondas pasadas sin pagar</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 border-2 border-blue-300 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-800">Ronda Actual</div>
              <div className="text-xs text-gray-500">Click para marcar pagado</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 border-2 border-yellow-300 flex items-center justify-center">
              <span className="text-xs font-bold text-yellow-600">↑</span>
            </div>
            <div>
              <div className="font-semibold text-gray-800">Adelantado</div>
              <div className="text-xs text-gray-500">Pagos futuros permitidos</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}