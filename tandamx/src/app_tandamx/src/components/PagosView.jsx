import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, CheckCircle, XCircle, Clock, Filter, RefreshCw, X, Save, DollarSign, Calendar, FileText, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'https://9l2vrevqm1.execute-api.us-east-1.amazonaws.com/dev';

export default function PagosView({ tandaData, setTandaData, loadAdminData }) {
  const [matrizPagos, setMatrizPagos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showEditModal, setShowEditModal] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null);
  const [clickTimeout, setClickTimeout] = useState(null);
  const [editFormData, setEditFormData] = useState({
    fechaPago: '',
    metodoPago: 'Transferencia',
    notas: '',
    monto: 0,
    exentoPago: false
  });

  const cargarMatrizPagos = useCallback(async () => {
    if (!tandaData || !tandaData.tandaId) {
      setMatrizPagos(null);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const url = `${API_BASE_URL}/tandas/${tandaData.tandaId}/pagos/matriz`;
      
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
            // Incluir TODOS los registros, tanto pagados como no pagados
            // que tengan información relevante
            const pagoData = pagos[ronda];
            const tieneInfoRelevante = pagoData && (
              pagoData.pagado ||
              pagoData.notas ||
              pagoData.exentoPago ||
              pagoData.monto ||
              pagoData.fechaPago ||
              pagoData.metodoPago
            );
            
            if (tieneInfoRelevante) {
              pagosArray.push({
                participanteId,
                ronda: parseInt(ronda),
                pagado: pagoData.pagado || false,
                fechaPago: pagoData.fechaPago,
                metodoPago: pagoData.metodoPago || 'Transferencia',
                notas: pagoData.notas || '',
                monto: pagoData.monto || tandaData.montoPorRonda,
                exentoPago: pagoData.exentoPago || false
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
  }, [tandaData]);

  useEffect(() => {
    if (tandaData?.tandaId) {
      cargarMatrizPagos();
    }
  }, [tandaData?.tandaId, cargarMatrizPagos]);

  // Validar que los pagos sean secuenciales
  const puedePagarRonda = (participanteId, ronda) => {
    if (!matrizPagos || !Array.isArray(matrizPagos)) return true;
    
    // Si es la ronda 1, siempre se puede pagar
    if (ronda === 1) return true;
    
    // Verificar que todas las rondas anteriores estén pagadas
    for (let r = 1; r < ronda; r++) {
      const estaPagada = matrizPagos.some(
        p => p.participanteId === participanteId && p.ronda === r && p.pagado
      );
      if (!estaPagada) {
        return false;
      }
    }
    
    return true;
  };

  // Manejar click/doble click
  const handleCellClick = (participanteId, ronda, estaPagado) => {
    if (clickTimeout) {
      // Es doble click
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      
      if (estaPagado) {
        // Abrir modal de edición
        abrirModalEdicion(participanteId, ronda);
      }
    } else {
      // Es single click
      const timeout = setTimeout(() => {
        setClickTimeout(null);
        // Toggle pago
        togglePago(participanteId, ronda);
      }, 250); // 250ms para detectar doble click
      
      setClickTimeout(timeout);
    }
  };

  const abrirModalEdicion = (participanteId, ronda) => {
    const pago = matrizPagos?.find(
      p => p.participanteId === participanteId && p.ronda === ronda
    );
    
    if (!pago) return;
    
    const participante = tandaData.participantes.find(p => p.participanteId === participanteId);
    
    setPagoSeleccionado({
      participanteId,
      ronda,
      participante
    });
    
    setEditFormData({
      fechaPago: pago.fechaPago ? new Date(pago.fechaPago).toISOString().split('T')[0] : '',
      metodoPago: pago.metodoPago || 'Transferencia',
      notas: pago.notas || '',
      monto: pago.monto || tandaData.montoPorRonda,
      exentoPago: pago.exentoPago || false
    });
    
    setShowEditModal(true);
  };

  const guardarEdicionPago = async () => {
    if (!pagoSeleccionado) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(
        `${API_BASE_URL}/tandas/${tandaData.tandaId}/pagos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            participanteId: pagoSeleccionado.participanteId,
            ronda: pagoSeleccionado.ronda,
            pagado: true,
            monto: parseFloat(editFormData.monto),
            fechaPago: editFormData.fechaPago ? new Date(editFormData.fechaPago).toISOString() : new Date().toISOString(),
            metodoPago: editFormData.metodoPago,
            notas: editFormData.notas,
            exentoPago: editFormData.exentoPago
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al actualizar pago');
      }

      if (data.success) {
        // Actualizar estado local
        setMatrizPagos(prev => {
          if (!Array.isArray(prev)) return prev;
          
          return prev.map(p => {
            if (p.participanteId === pagoSeleccionado.participanteId && p.ronda === pagoSeleccionado.ronda) {
              return {
                ...p,
                fechaPago: editFormData.fechaPago ? new Date(editFormData.fechaPago).toISOString() : p.fechaPago,
                metodoPago: editFormData.metodoPago,
                notas: editFormData.notas,
                monto: parseFloat(editFormData.monto),
                exentoPago: editFormData.exentoPago
              };
            }
            return p;
          });
        });
        
        setShowEditModal(false);
        setPagoSeleccionado(null);
      }
    } catch (error) {
      console.error('Error actualizando pago:', error);
      setError(error.message || 'Error al actualizar pago');
    } finally {
      setLoading(false);
    }
  };

  const togglePago = async (participanteId, ronda) => {
    if (!tandaData || !tandaData.tandaId) {
      setError('No se puede registrar el pago. Tanda no seleccionada.');
      return;
    }

    const pagoActual = Array.isArray(matrizPagos)
      ? matrizPagos.find(p => p.participanteId === participanteId && p.ronda === ronda)
      : null;

    const estaPagadoAhora = pagoActual?.pagado || false;

    // Si NO está pagado y queremos pagarlo, validar secuencia
    if (!estaPagadoAhora && !puedePagarRonda(participanteId, ronda)) {
      setError(`Debe pagar las rondas anteriores primero. No se puede pagar la ronda ${ronda} sin haber pagado las anteriores.`);
      setTimeout(() => setError(null), 4000);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');

      // Preparar datos para el API
      let bodyData;
      
      if (estaPagadoAhora) {
        // Si estamos desmarcando, preservar datos existentes si tiene información adicional
        const tieneInfoAdicional = pagoActual && (
          pagoActual.notas || 
          pagoActual.exentoPago || 
          pagoActual.monto !== tandaData.montoPorRonda ||
          pagoActual.metodoPago !== (tandaData.metodoPago || 'Transferencia')
        );

        if (tieneInfoAdicional) {
          // Preservar todos los datos, solo cambiar pagado a false
          bodyData = {
            participanteId,
            ronda,
            pagado: false,
            monto: pagoActual.monto,
            fechaPago: pagoActual.fechaPago,
            metodoPago: pagoActual.metodoPago,
            notas: pagoActual.notas,
            exentoPago: pagoActual.exentoPago
          };
        } else {
          // No tiene info adicional, usar valores por defecto
          bodyData = {
            participanteId,
            ronda,
            pagado: false,
            monto: tandaData.montoPorRonda,
            fechaPago: new Date().toISOString(),
            metodoPago: tandaData.metodoPago || 'Transferencia',
            notas: '',
            exentoPago: false
          };
        }
      } else {
        // Marcando como pagado por primera vez
        bodyData = {
          participanteId,
          ronda,
          pagado: true,
          monto: tandaData.montoPorRonda,
          fechaPago: new Date().toISOString(),
          metodoPago: tandaData.metodoPago || 'Transferencia',
          notas: '',
          exentoPago: false
        };
      }

      const response = await fetch(
        `${API_BASE_URL}/tandas/${tandaData.tandaId}/pagos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(bodyData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al registrar pago');
      }

      if (data.success) {
        setMatrizPagos(prev => {
          if (!Array.isArray(prev)) prev = [];
          
          if (estaPagadoAhora) {
            // Actualizar el registro existente en lugar de eliminarlo
            return prev.map(p => {
              if (p.participanteId === participanteId && p.ronda === ronda) {
                return {
                  ...p,
                  pagado: false,
                  // Los demás campos se preservan del estado actual
                };
              }
              return p;
            });
          } else {
            // Verificar si ya existe un registro (podría estar desmarcado)
            const existeRegistro = prev.find(
              p => p.participanteId === participanteId && p.ronda === ronda
            );
            
            if (existeRegistro) {
              // Actualizar registro existente
              return prev.map(p => {
                if (p.participanteId === participanteId && p.ronda === ronda) {
                  return {
                    ...p,
                    pagado: true,
                    // Si no tiene fecha, asignar la actual
                    fechaPago: p.fechaPago || new Date().toISOString(),
                    // Si no tiene método de pago, usar el de la tanda
                    metodoPago: p.metodoPago || tandaData.metodoPago || 'Transferencia',
                    // Si no tiene monto, usar el de la tanda
                    monto: p.monto || tandaData.montoPorRonda,
                  };
                }
                return p;
              });
            } else {
              // Crear nuevo registro
              return [...prev, { 
                participanteId, 
                ronda, 
                pagado: true,
                fechaPago: new Date().toISOString(),
                metodoPago: tandaData.metodoPago || 'Transferencia',
                notas: '',
                monto: tandaData.montoPorRonda,
                exentoPago: false
              }];
            }
          }
        });
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
          <div className="inline-block p-6 bg-gradient-to-br from-blue-100 to-sky-100 rounded-3xl mb-6">
            <CreditCard className="w-20 h-20 text-blue-600" />
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

  const calcularEstadoPorParticipante = (participanteId) => {
    if (!matrizPagos || !Array.isArray(matrizPagos)) {
      return { estado: 'pendiente', pagosAdelantados: 0 };
    }
    
    const pagos = matrizPagos.filter(
      p => p.participanteId === participanteId && p.pagado
    );
    
    const pagosRealizados = pagos.length;
    const pagosEsperados = Math.max(0, tandaData.rondaActual - 1);
    
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

  const participantesFiltrados = participantes.filter(p => {
    if (filtroEstado === 'todos') return true;
    const { estado } = calcularEstadoPorParticipante(p.participanteId);
    return estado === filtroEstado;
  });

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
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <CreditCard className="w-7 h-7 text-blue-600" />
              Control de Pagos
            </h2>
            <p className="text-gray-600 mt-1">
              {tandaData.nombre} • Ronda {tandaData.rondaActual} de {tandaData.totalRondas}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={cargarMatrizPagos}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-600 font-semibold text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-4">
        <div className="flex items-center gap-4 flex-wrap justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-700">Filtrar:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFiltroEstado('todos')}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  filtroEstado === 'todos'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos ({participantes.length})
              </button>
              <button
                onClick={() => setFiltroEstado('al_corriente')}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  filtroEstado === 'al_corriente'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Al Corriente
              </button>
              <button
                onClick={() => setFiltroEstado('atrasado')}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  filtroEstado === 'atrasado'
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Atrasados
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">💡 Instrucciones de uso:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>1 click:</strong> Marcar/desmarcar pago</li>
              <li><strong>Doble click:</strong> Editar detalles del pago (solo pagos marcados)</li>
              <li><strong>Pagos secuenciales:</strong> Debes pagar las rondas en orden (1, 2, 3...)</li>
              <li><strong>🔒 Datos protegidos:</strong> Si un pago tiene notas, monto diferente u otras personalizaciones, estos datos se conservan aunque lo desmarques</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Matriz de Pagos */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-sky-50 border-b-2 border-blue-200">
              <tr>
                <th className="px-3 md:px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase sticky left-0 bg-gradient-to-r from-blue-50 to-sky-50 z-10 w-[50%] md:w-auto">
                  Participante
                </th>
                {rondas.map(ronda => (
                  <th
                    key={ronda}
                    className={`px-2 md:px-4 py-3 text-center text-xs font-bold uppercase ${
                      ronda === tandaData.rondaActual
                        ? 'bg-green-100 text-green-700 border-2 border-green-300'
                        : 'text-gray-600'
                    }`}
                  >
                    <span className="hidden md:inline">R{ronda}</span>
                    <span className="md:hidden">{ronda}</span>
                  </th>
                ))}
                <th className="hidden md:table-cell px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
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
                        <td className="px-3 md:px-4 py-3 sticky left-0 bg-white z-10 w-[50%] md:w-auto">
                          <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center font-bold text-sm md:text-base shadow-md flex-shrink-0">
                              {participante.numeroAsignado}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-gray-800 text-xs md:text-sm truncate">
                                {participante.nombre}
                              </div>
                              <div className="text-[10px] md:text-xs text-gray-500 truncate hidden md:block">
                                {participante.telefono}
                              </div>
                            </div>
                          </div>
                        </td>
                        {rondas.map(ronda => {
                          const pagado = estaPagado(participante.participanteId, ronda);
                          const esRondaActual = ronda === tandaData.rondaActual;
                          const esPasado = ronda < tandaData.rondaActual;
                          const puedePagar = puedePagarRonda(participante.participanteId, ronda);
                          
                          const pago = matrizPagos?.find(
                            p => p.participanteId === participante.participanteId && p.ronda === ronda
                          );
                          
                          return (
                            <td
                              key={ronda}
                              className={`px-1 md:px-2 py-2 md:py-3 text-center ${
                                esRondaActual ? 'bg-green-50' : ''
                              }`}
                            >
                              <button
                                onClick={() => handleCellClick(participante.participanteId, ronda, pagado)}
                                disabled={loading || (!pagado && !puedePagar)}
                                className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all relative group ${
                                  pagado
                                    ? pago?.exentoPago
                                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md'
                                      : pago?.monto < tandaData.montoPorRonda
                                      ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md'
                                      : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md'
                                    : !puedePagar
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : esPasado
                                    ? 'bg-red-100 hover:bg-red-200 text-red-600 border-2 border-red-300'
                                    : 'bg-blue-100 hover:bg-blue-200 text-blue-600 border-2 border-blue-300'
                                } disabled:opacity-50`}
                                title={
                                  !puedePagar && !pagado
                                    ? 'Debe pagar las rondas anteriores primero'
                                    : pagado
                                    ? `Pagado ${pago?.exentoPago ? '(Exento de pago)' : ''} - Doble click para editar`
                                    : esPasado
                                    ? 'Pendiente (atrasado)'
                                    : 'Click para marcar como pagado'
                                }
                              >
                                {pagado ? (
                                  <>
                                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                                    {pago?.exentoPago && (
                                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-purple-700 rounded-full text-white text-[7px] md:text-[8px] flex items-center justify-center font-bold">
                                        E
                                      </span>
                                    )}
                                    {pago?.monto < tandaData.montoPorRonda && !pago?.exentoPago && (
                                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-orange-700 rounded-full text-white text-[7px] md:text-[8px] flex items-center justify-center font-bold">
                                        P
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <XCircle className="w-4 h-4 md:w-5 md:h-5" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                        <td className="hidden md:table-cell px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {estado === 'al_corriente' && (
                              <span className="px-3 py-1 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-2 border-green-200 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Al día
                              </span>
                            )}
                            {estado === 'atrasado' && (
                              <span className="px-3 py-1 bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-2 border-red-200 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Atrasado
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

      {/* Modal de Edición de Pago */}
      {showEditModal && pagoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full my-8 shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-8 h-8" />
                  <div>
                    <h3 className="text-xl font-bold">Editar Pago</h3>
                    <p className="text-sm opacity-90">
                      {pagoSeleccionado.participante?.nombre} - Ronda {pagoSeleccionado.ronda}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setPagoSeleccionado(null);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Fecha de Pago */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fecha de Pago
                </label>
                <input
                  type="date"
                  value={editFormData.fechaPago}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, fechaPago: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Método de Pago
                </label>
                <select
                  value={editFormData.metodoPago}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, metodoPago: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Monto */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Monto
                </label>
                <input
                  type="number"
                  value={editFormData.monto}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, monto: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Monto completo: ${tandaData.montoPorRonda?.toLocaleString()}
                </p>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notas
                </label>
                <textarea
                  value={editFormData.notas}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, notas: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                  placeholder="Observaciones adicionales..."
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editFormData.notas.length}/200 caracteres
                </p>
              </div>

              {/* Exento de Pago */}
              <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.exentoPago}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, exentoPago: e.target.checked }))}
                    className="mt-1 w-5 h-5 rounded border-2 border-purple-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-gray-800 block mb-1">
                      Exento de Pago
                    </span>
                    <span className="text-xs text-gray-600">
                      Marcar cuando este participante NO pagó en su turno porque es quien recibe.
                    </span>
                  </div>
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Botones fijos en la parte inferior */}
            <div className="p-6 bg-gray-50 border-t-2 border-gray-200 rounded-b-2xl">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setPagoSeleccionado(null);
                  }}
                  className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarEdicionPago}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          Leyenda
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-800 text-sm">Pagado</div>
              <div className="text-xs text-gray-500 truncate">Doble click para editar</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm relative flex-shrink-0">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-700 rounded-full text-white text-[7px] flex items-center justify-center font-bold">E</span>
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-800 text-sm">Exento de Pago</div>
              <div className="text-xs text-gray-500 truncate">Es quien recibe en esa ronda</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-sm relative flex-shrink-0">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-700 rounded-full text-white text-[7px] flex items-center justify-center font-bold">P</span>
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-800 text-sm">Pago Parcial</div>
              <div className="text-xs text-gray-500 truncate">Monto menor al total</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-100 border-2 border-red-300 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-800 text-sm">Atrasado</div>
              <div className="text-xs text-gray-500 truncate">Rondas pasadas sin pagar</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 border-2 border-blue-300 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-800 text-sm">Ronda Actual</div>
              <div className="text-xs text-gray-500 truncate">Click para marcar pagado</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-800 text-sm">Bloqueado</div>
              <div className="text-xs text-gray-500 truncate">Pagar rondas anteriores</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
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
      `}</style>
    </div>
  );
}