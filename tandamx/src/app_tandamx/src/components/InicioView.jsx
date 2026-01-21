import React from 'react';
import { Users, Plus, Calendar, DollarSign, TrendingUp, ArrowRight, Trash2, AlertTriangle, Gift, Clock, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function InicioView({ tandas, setActiveView, onSeleccionarTanda, onCrearNueva, onEliminarTanda }) {
  console.log('🎬 InicioView INICIADO');
  console.log('   Tandas recibidas:', tandas?.length || 0);
  
  if (tandas && tandas.length > 0) {
    console.log('   Primera tanda:', tandas[0].nombre);
    console.log('   Participantes de primera tanda:', tandas[0].participantes?.length || 0);
    if (tandas[0].participantes && tandas[0].participantes.length > 0) {
      console.log('   Primer participante:', tandas[0].participantes[0]);
      console.log('   Tiene fechaCumpleaños?', tandas[0].participantes[0].fechaCumpleaños);
    }
  }
  
  const [filtroActivo, setFiltroActivo] = React.useState('todas');
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [tandaToDelete, setTandaToDelete] = React.useState(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  if (!tandas || tandas.length === 0) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4 md:p-6">
        <div className="max-w-2xl w-full">
          {/* Card principal de estado vacío */}
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl p-6 md:p-12 text-center border-2 border-gray-100">
            {/* Ilustración/Ícono grande */}
            <div className="mb-6 md:mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-100 to-sky-100 mb-4 md:mb-6">
                <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-blue-600" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 md:mb-3">
                ¡Comienza tu Primera Tanda!
              </h2>
              <p className="text-base md:text-lg text-gray-600 max-w-md mx-auto">
                Crea y administra tandas de forma profesional, transparente y segura
              </p>
            </div>

            {/* Características destacadas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="p-3 md:p-4 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl border-2 border-blue-200">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mx-auto mb-2 md:mb-3 shadow-md">
                  <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1 text-sm md:text-base">Gestión Simple</h3>
                <p className="text-xs md:text-sm text-gray-600">Control total de participantes y pagos</p>
              </div>

              <div className="p-3 md:p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-2 md:mb-3 shadow-md">
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1 text-sm md:text-base">Transparencia</h3>
                <p className="text-xs md:text-sm text-gray-600">Tablero público compartible en tiempo real</p>
              </div>

              <div className="p-3 md:p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-2 md:mb-3 shadow-md">
                  <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1 text-sm md:text-base">Seguimiento</h3>
                <p className="text-xs md:text-sm text-gray-600">Estadísticas y reportes automáticos</p>
              </div>
            </div>

            {/* Botón CTA principal */}
            <button
              onClick={onCrearNueva}
              className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold text-base md:text-lg rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-5 h-5 md:w-6 md:h-6" />
              Crear Mi Primera Tanda
            </button>

            {/* Información adicional */}
            <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-200">
              <p className="text-xs md:text-sm text-gray-500">
                💡 <span className="font-semibold">Tip:</span> Una tanda bien organizada genera confianza y facilita el ahorro en grupo
              </p>
            </div>
          </div>

          {/* Pasos rápidos */}
          <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white rounded-xl p-3 md:p-4 shadow-md border-2 border-gray-100">
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center font-bold text-xs md:text-sm shadow-md">
                  1
                </div>
                <h4 className="font-bold text-gray-900 text-sm md:text-base">Configura</h4>
              </div>
              <p className="text-xs md:text-sm text-gray-600">Define monto, frecuencia y participantes</p>
            </div>

            <div className="bg-white rounded-xl p-3 md:p-4 shadow-md border-2 border-gray-100">
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center font-bold text-xs md:text-sm shadow-md">
                  2
                </div>
                <h4 className="font-bold text-gray-900 text-sm md:text-base">Comparte</h4>
              </div>
              <p className="text-xs md:text-sm text-gray-600">Invita a participantes con un link</p>
            </div>

            <div className="bg-white rounded-xl p-3 md:p-4 shadow-md border-2 border-gray-100">
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center font-bold text-xs md:text-sm shadow-md">
                  3
                </div>
                <h4 className="font-bold text-gray-900 text-sm md:text-base">Administra</h4>
              </div>
              <p className="text-xs md:text-sm text-gray-600">Registra pagos y da seguimiento</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🔧 FUNCIONES COPIADAS DE DASHBOARDVIEW (versiones correctas)
  
  // Función para calcular fecha de cumpleaños del participante de una ronda específica
  function calcularFechaCumpleañosRonda(tanda, numeroRonda) {
      if (tanda.frecuencia !== 'cumpleaños') return null;
      
      const participantes = tanda.participantes || [];
      const participante = participantes.find(p => p.numeroAsignado === numeroRonda);
      
      if (!participante || !participante.fechaCumpleaños) return null;
      
      // 🔧 CORRECCIÓN: Agregar T00:00:00 para evitar problemas de zona horaria
      const fechaCumple = new Date(participante.fechaCumpleaños + 'T00:00:00');
      
      // Obtener hoy sin hora (solo fecha)
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      // Calcular el próximo cumpleaños (este año)
      let proximoCumple = new Date(hoy.getFullYear(), fechaCumple.getMonth(), fechaCumple.getDate());
      proximoCumple.setHours(0, 0, 0, 0);
      
      // 🔧 CORRECCIÓN: Solo pasar al próximo año si YA PASÓ (no si es hoy)
      if (proximoCumple < hoy) {
        proximoCumple.setFullYear(hoy.getFullYear() + 1);
      }
      
      return proximoCumple;
    }

    // Calcular días hasta el próximo cumpleaños
    function calcularDiasHastaCumpleaños(tanda, numeroRonda) {
      const fechaCumple = calcularFechaCumpleañosRonda(tanda, numeroRonda);
      if (!fechaCumple) return null;
      
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      const diferencia = fechaCumple - hoy;
      const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
      
      return dias;
    }

    // 🆕 Función mejorada para calcular próximo cumpleaños (puede haber múltiples el mismo día)
    const calcularProximoCumpleanos = (tanda) => {
    console.log('🎂 calcularProximoCumpleanos INICIADO');
    console.log('   Tanda:', tanda.nombre);
    console.log('   Frecuencia:', tanda.frecuencia);
    console.log('   Participantes:', tanda.participantes?.length || 0);
    
    if (tanda.frecuencia !== 'cumpleaños' || !tanda.participantes || tanda.participantes.length === 0) {
      console.log('   ❌ NO es cumpleañera o sin participantes');
      return null;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    console.log('   📅 Hoy:', hoy.toLocaleDateString('es-MX'));
    
    // Ordenar participantes por número asignado
    const participantesOrdenados = [...tanda.participantes].sort((a, b) => a.numeroAsignado - b.numeroAsignado);
    
    // 🆕 Encontrar cumpleañeros de HOY (fecha de cumpleaños === hoy)
    let cumpleañerosHoy = [];
    participantesOrdenados.forEach(p => {
      if (p.fechaCumpleaños) {
        const fechaCumple = new Date(p.fechaCumpleaños + 'T00:00:00');
        fechaCumple.setHours(0, 0, 0, 0);
        
        if (fechaCumple.getTime() === hoy.getTime()) {
          cumpleañerosHoy.push(p);
        }
      }
    });
    
    // Encontrar el número actual (el que ya pasó su cumpleaños o es hoy)
    let numeroActual = null;
    let participanteActual = null;
    
    for (const p of participantesOrdenados) {
      if (p.fechaCumpleaños) {
        const fechaCumple = new Date(p.fechaCumpleaños + 'T00:00:00');
        fechaCumple.setHours(0, 0, 0, 0);
        
        if (fechaCumple <= hoy) {
          numeroActual = p.numeroAsignado;
          participanteActual = p;
        } else {
          break; // Ya encontramos el último que cumplió
        }
      }
    }
    
    console.log('   📍 Número actual:', numeroActual);
    console.log('   👤 Participante actual:', participanteActual?.nombre);
    console.log('   🎉 Cumpleañeros HOY:', cumpleañerosHoy.map(c => `#${c.numeroAsignado} ${c.nombre}`).join(', '));

    // 🆕 Calcular días faltantes de la RONDA ACTUAL
    let diasFaltantesActual = null;
    if (participanteActual?.fechaCumpleaños) {
      const fechaActual = new Date(participanteActual.fechaCumpleaños + 'T00:00:00');
      fechaActual.setHours(0, 0, 0, 0);
      diasFaltantesActual = Math.ceil((fechaActual - hoy) / (1000 * 60 * 60 * 24));
      console.log('   ⏱️ Días faltantes ronda actual:', diasFaltantesActual);
    }

    // 🆕 Encontrar cumpleañeros recientes (número anterior con misma fecha)
    let cumpleañerosRecientes = [];
    
    if (numeroActual && participanteActual) {
      const fechaActual = new Date(participanteActual.fechaCumpleaños + 'T00:00:00');
      fechaActual.setHours(0, 0, 0, 0);
      
      const diasDesdeActual = Math.ceil((hoy - fechaActual) / (1000 * 60 * 60 * 24));
      
      // Si han pasado 5 días o menos desde el cumpleaños actual, mantenerlo en recientes
      if (diasDesdeActual <= 5) {
        cumpleañerosRecientes.push({
          ...participanteActual,
          diasDesde: diasDesdeActual,
          fechaUltimoCumple: fechaActual
        });
      }
      
      // Buscar números anteriores con la MISMA fecha que el actual
      for (let i = numeroActual - 1; i >= 1; i--) {
        const participanteAnterior = participantesOrdenados.find(p => p.numeroAsignado === i);
        
        if (participanteAnterior?.fechaCumpleaños) {
          const fechaAnterior = new Date(participanteAnterior.fechaCumpleaños + 'T00:00:00');
          fechaAnterior.setHours(0, 0, 0, 0);
          
          // Si tiene la misma fecha que el actual, agregarlo
          if (fechaAnterior.getTime() === fechaActual.getTime()) {
            cumpleañerosRecientes.push({
              ...participanteAnterior,
              diasDesde: diasDesdeActual,
              fechaUltimoCumple: fechaAnterior
            });
          } else {
            // Si encontramos una fecha diferente, detenemos la búsqueda
            break;
          }
        }
      }
      
      // Ordenar recientes por número asignado (ascendente)
      cumpleañerosRecientes.sort((a, b) => a.numeroAsignado - b.numeroAsignado);
    }

    // 🆕 Encontrar el PRÓXIMO cumpleaños (siguiente número después del actual)
    let proximoCumple = null;
    let cumpleañerosProximos = [];
    let menorDiferencia = Infinity;
    
    if (numeroActual) {
      // Buscar el siguiente número
      const siguienteParticipante = participantesOrdenados.find(p => p.numeroAsignado === numeroActual + 1);
      
      if (siguienteParticipante?.fechaCumpleaños) {
        const fechaSiguiente = new Date(siguienteParticipante.fechaCumpleaños + 'T00:00:00');
        fechaSiguiente.setHours(0, 0, 0, 0);
        
        menorDiferencia = Math.ceil((fechaSiguiente - hoy) / (1000 * 60 * 60 * 24));
        proximoCumple = fechaSiguiente;
        cumpleañerosProximos.push(siguienteParticipante);
        
        // 🆕 Buscar TODOS los participantes con la misma fecha del siguiente (sin límite)
        for (let i = numeroActual + 2; i <= Math.max(...participantesOrdenados.map(p => p.numeroAsignado)); i++) {
          const otroParticipante = participantesOrdenados.find(p => p.numeroAsignado === i);
          
          if (otroParticipante?.fechaCumpleaños) {
            const otraFecha = new Date(otroParticipante.fechaCumpleaños + 'T00:00:00');
            otraFecha.setHours(0, 0, 0, 0);
            
            if (otraFecha.getTime() === fechaSiguiente.getTime()) {
              cumpleañerosProximos.push(otroParticipante);
            }
            // 🆕 NO rompemos el loop, seguimos buscando todos con esa fecha
          }
        }
      }
    } else {
      // Si no hay número actual (aún no ha pasado ningún cumpleaños), buscar el primero
      const primerParticipante = participantesOrdenados.find(p => p.fechaCumpleaños);
      
      if (primerParticipante) {
        const fechaPrimero = new Date(primerParticipante.fechaCumpleaños + 'T00:00:00');
        fechaPrimero.setHours(0, 0, 0, 0);
        
        menorDiferencia = Math.ceil((fechaPrimero - hoy) / (1000 * 60 * 60 * 24));
        proximoCumple = fechaPrimero;
        cumpleañerosProximos.push(primerParticipante);
        
        // 🆕 Buscar TODOS los participantes con la misma fecha (sin límite)
        for (let i = 2; i <= Math.max(...participantesOrdenados.map(p => p.numeroAsignado)); i++) {
          const otroParticipante = participantesOrdenados.find(p => p.numeroAsignado === i);
          
          if (otroParticipante?.fechaCumpleaños) {
            const otraFecha = new Date(otroParticipante.fechaCumpleaños + 'T00:00:00');
            otraFecha.setHours(0, 0, 0, 0);
            
            if (otraFecha.getTime() === fechaPrimero.getTime()) {
              cumpleañerosProximos.push(otroParticipante);
            }
            // 🆕 NO rompemos el loop, seguimos buscando todos con esa fecha
          }
        }
      }
    }

    const resultado = {
      fecha: proximoCumple,
      diasFaltantes: diasFaltantesActual, // Días faltantes de la RONDA ACTUAL
      diasFaltantesProximo: menorDiferencia !== Infinity ? menorDiferencia : null, // Días para el próximo
      participante: cumpleañerosProximos[0] || null,
      cumpleañerosProximos, // 🆕 Lista de próximos cumpleañeros
      cantidadCumpleañeros: cumpleañerosProximos.length,
      cumpleañerosRecientes,
      cumpleañerosHoy, // 🆕 Lista de cumpleañeros de HOY
      cantidadCumpleañerosHoy: cumpleañerosHoy.length, // 🆕 Cantidad de cumpleañeros hoy
      numeroActual: participanteActual // Para referencia
    };
    
    console.log('   📊 RESULTADO:');
    console.log('      Número actual:', numeroActual);
    console.log('      Días faltantes (ronda actual):', resultado.diasFaltantes);
    console.log('      Días faltantes (próximo):', resultado.diasFaltantesProximo);
    console.log('      Cantidad cumpleañeros HOY:', resultado.cantidadCumpleañerosHoy);
    console.log('      Cumpleañeros HOY:', cumpleañerosHoy.map(c => `#${c.numeroAsignado} ${c.nombre}`).join(', '));
    console.log('      Cantidad cumpleañeros próximos:', resultado.cantidadCumpleañeros);
    console.log('      Cumpleañeros próximos:', cumpleañerosProximos.map(c => `#${c.numeroAsignado} ${c.nombre}`).join(', '));
    console.log('      Cumpleañeros recientes:', cumpleañerosRecientes.map(c => `#${c.numeroAsignado} ${c.nombre} (hace ${c.diasDesde} días)`).join(', '));
    
    return resultado;
  };

  // 🆕 Función para obtener rango de fechas de cumpleaños
  const obtenerRangoCumpleanos = (tanda) => {
    if (tanda.frecuencia !== 'cumpleaños' || !tanda.participantes || tanda.participantes.length === 0) {
      return null;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const cumpleañosProximos = [];
    
    tanda.participantes.forEach(p => {
      if (p.fechaCumpleaños) {
        // 🔧 CORRECCIÓN: Agregar T00:00:00 para evitar problemas de zona horaria
        const fechaCumple = new Date(p.fechaCumpleaños + 'T00:00:00');
        let proximoCumple = new Date(hoy.getFullYear(), fechaCumple.getMonth(), fechaCumple.getDate());
        proximoCumple.setHours(0, 0, 0, 0);
        
        // Solo pasar al próximo año si YA PASÓ (no si es hoy)
        if (proximoCumple < hoy) {
          proximoCumple.setFullYear(hoy.getFullYear() + 1);
        }
        
        cumpleañosProximos.push(proximoCumple);
      }
    });
    
    if (cumpleañosProximos.length === 0) return null;
    
    cumpleañosProximos.sort((a, b) => a - b);
    
    return {
      inicio: cumpleañosProximos[0],
      fin: cumpleañosProximos[cumpleañosProximos.length - 1]
    };
  };

  // Calcular estadísticas globales basadas en fechas
  const calcularEstadoTanda = (tanda) => {
    // 🆕 Para tandas cumpleañeras
    if (tanda.frecuencia === 'cumpleaños') {
      const rango = obtenerRangoCumpleanos(tanda);
      if (!rango) return 'proximas';
      
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (hoy < rango.inicio) {
        return 'proximas';
      } else if (hoy > rango.fin) {
        return 'pasadas';
      } else {
        return 'vigentes';
      }
    }

    // Lógica original para tandas normales
    if (!tanda.fechaInicio) return 'proximas';
    
    const fechaInicio = new Date(tanda.fechaInicio);
    const fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0);
    fechaInicio.setHours(0, 0, 0, 0);
    
    let diasPorRonda = 7;
    if (tanda.frecuencia === 'quincenal') diasPorRonda = 15;
    else if (tanda.frecuencia === 'mensual') diasPorRonda = 30;
    
    const diasHastaUltimaRonda = (tanda.totalRondas - 1) * diasPorRonda;
    const fechaInicioUltimaRonda = new Date(fechaInicio);
    fechaInicioUltimaRonda.setDate(fechaInicioUltimaRonda.getDate() + diasHastaUltimaRonda);
    
    const fechaSiguienteRonda = new Date(fechaInicioUltimaRonda);
    fechaSiguienteRonda.setDate(fechaSiguienteRonda.getDate() + diasPorRonda);
    
    const fechaFin = new Date(fechaSiguienteRonda);
    fechaFin.setDate(fechaFin.getDate() - 1);
    fechaFin.setHours(23, 59, 59, 999);
    
    if (fechaActual < fechaInicio) {
      return 'proximas';
    } else if (fechaActual > fechaFin) {
      return 'pasadas';
    } else {
      return 'vigentes';
    }
  };
  
  const totalTandas = tandas.length;
  const tandasVigentes = tandas.filter(t => calcularEstadoTanda(t) === 'vigentes').length;
  const tandasPasadas = tandas.filter(t => calcularEstadoTanda(t) === 'pasadas').length;
  const tandasProximas = tandas.filter(t => calcularEstadoTanda(t) === 'proximas').length;

  const handleDeleteClick = (e, tanda) => {
    e.stopPropagation();
    setTandaToDelete(tanda);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!tandaToDelete) return;
    
    setIsDeleting(true);
    try {
      const API_BASE_URL = 'https://9l2vrevqm1.execute-api.us-east-1.amazonaws.com/dev';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('🗑️ Eliminando tanda:', tandaToDelete.tandaId);
      
      const response = await fetch(`${API_BASE_URL}/tandas/${tandaToDelete.tandaId}`, {
        method: 'DELETE',
        headers: headers
      });

      console.log('📥 Respuesta DELETE:', response.status);

      if (!response.ok) {
        let errorMessage = `Error ${response.status} al eliminar la tanda`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch (e) {
          // Si no se puede parsear el error, usar el mensaje por defecto
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Tanda eliminada exitosamente:', data);

      setShowDeleteModal(false);
      setTandaToDelete(null);

      if (onEliminarTanda) {
        try {
          await onEliminarTanda(tandaToDelete.tandaId);
        } catch (callbackError) {
          console.error('Error en callback onEliminarTanda:', callbackError);
        }
      }

      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('❌ Error al eliminar tanda:', error);
      const errorMsg = error.message || 'Error desconocido al eliminar la tanda';
      alert(`No se pudo eliminar la tanda:\n\n${errorMsg}\n\nPor favor intenta de nuevo.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setTandaToDelete(null);
  };

  return (
    <div className="space-y-6">
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      {/* Filtros */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Filtrar Tandas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setFiltroActivo('todas')}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl font-semibold text-sm transition-all ${
              filtroActivo === 'todas'
                ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="font-bold">Todas</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold min-w-[3rem] ${
              filtroActivo === 'todas' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {totalTandas}
            </span>
          </button>

          <button
            onClick={() => setFiltroActivo('vigentes')}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl font-semibold text-sm transition-all ${
              filtroActivo === 'vigentes'
                ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-bold">Vigentes</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold min-w-[3rem] ${
              filtroActivo === 'vigentes' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {tandasVigentes}
            </span>
          </button>

          <button
            onClick={() => setFiltroActivo('pasadas')}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl font-semibold text-sm transition-all ${
              filtroActivo === 'pasadas'
                ? 'bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-lg shadow-gray-500/30'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-400 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="font-bold">Pasadas</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold min-w-[3rem] ${
              filtroActivo === 'pasadas' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {tandasPasadas}
            </span>
          </button>

          <button
            onClick={() => setFiltroActivo('proximas')}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl font-semibold text-sm transition-all ${
              filtroActivo === 'proximas'
                ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              <span className="font-bold">Próximas</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold min-w-[3rem] ${
              filtroActivo === 'proximas' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {tandasProximas}
            </span>
          </button>
        </div>
      </div>

      {/* Carrusel de Tandas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">
            {filtroActivo === 'todas' && 'Todas las Tandas'}
            {filtroActivo === 'vigentes' && 'Tandas Vigentes'}
            {filtroActivo === 'pasadas' && 'Tandas Pasadas'}
            {filtroActivo === 'proximas' && 'Tandas Próximas'}
          </h2>
          <button
            onClick={onCrearNueva}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Tanda
          </button>
        </div>

        {(() => {
          const tandasFiltradas = tandas.filter(tanda => {
            if (filtroActivo === 'todas') return true;
            const estado = calcularEstadoTanda(tanda);
            return estado === filtroActivo;
          });

          if (tandasFiltradas.length === 0) {
            return (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <div className="inline-block p-4 bg-gray-100 rounded-full mb-3">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">
                  No hay tandas {filtroActivo === 'todas' ? '' : filtroActivo}
                </p>
              </div>
            );
          }

          return (
            <div className="relative">
              <div className="overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex gap-4" style={{ scrollSnapType: 'x mandatory' }}>
                  {tandasFiltradas.map((tanda) => {
                    console.log('🎴 PROCESANDO TARJETA:', tanda.nombre);
                    const esCumpleañera = tanda.frecuencia === 'cumpleaños';
                    console.log('   Es cumpleañera?', esCumpleañera);
                    
                    // 🚨 VERIFICAR SI TIENE DATOS COMPLETOS
                    const tieneParticipantesCompletos = tanda.participantes?.some(p => p.fechaCumpleaños);
                    console.log('   🚨 Participantes tienen fechaCumpleaños?', tieneParticipantesCompletos);
                    
                    if (esCumpleañera && !tieneParticipantesCompletos) {
                      console.error('❌ ERROR: Tanda cumpleañera sin fechas de cumpleaños en los participantes');
                      console.log('   Necesita recargar datos desde API');
                    }
                    
                    // 🆕 Datos específicos para cumpleañeras
                    const proximoCumple = esCumpleañera ? calcularProximoCumpleanos(tanda) : null;
                    const rangoCumple = esCumpleañera ? obtenerRangoCumpleanos(tanda) : null;
                    
                    console.log('   proximoCumple:', proximoCumple);
                    console.log('   rangoCumple:', rangoCumple);
                    
                    // 🔧 Calcular ronda actual (COPIADO DE DASHBOARDVIEW)
                    const calcularRondaActual = () => {
                      console.log('🔢 calcularRondaActual INICIADO para:', tanda.nombre);
                      
                      // 🆕 Para tandas cumpleañeras, buscar el próximo cumpleaños
                      if (esCumpleañera) {
                        console.log('   ✅ Es CUMPLEAÑERA');
                        const participantes = tanda.participantes || [];
                        console.log('   Participantes:', participantes.length);
                        
                        if (participantes.length === 0) {
                          console.log('   ❌ Sin participantes, retorna 1');
                          return 1;
                        }
                        
                        const hoy = new Date();
                        hoy.setHours(0, 0, 0, 0);
                        
                        let proximoNumero = null;
                        let menorDiferencia = Infinity;
                        
                        participantes.forEach(p => {
                          console.log(`   Participante completo:`, p);
                          
                          if (p.fechaCumpleaños) {
                            const diasHasta = calcularDiasHastaCumpleaños(tanda, p.numeroAsignado);
                            console.log(`   #${p.numeroAsignado} ${p.nombre}: ${diasHasta} días`);
                            
                            if (diasHasta !== null && diasHasta >= 0 && diasHasta < menorDiferencia) {
                              console.log(`      ⭐ NUEVO PRÓXIMO: #${p.numeroAsignado}`);
                              menorDiferencia = diasHasta;
                              proximoNumero = p.numeroAsignado;
                            }
                          }
                        });
                        
                        const resultado = proximoNumero || 1;
                        console.log('   📊 RONDA ACTUAL CALCULADA:', resultado);
                        return resultado;
                      }
                      
                      // Lógica original para tandas normales
                      console.log('   ℹ️ Tanda NORMAL');
                      if (!tanda.fechaInicio) return 1;
                      
                      const fechaInicio = new Date(tanda.fechaInicio);
                      const fechaActual = new Date();
                      const diasTranscurridos = Math.floor((fechaActual - fechaInicio) / (1000 * 60 * 60 * 24));
                      
                      let diasPorRonda = 7;
                      if (tanda.frecuencia === 'quincenal') diasPorRonda = 15;
                      else if (tanda.frecuencia === 'mensual') diasPorRonda = 30;
                      
                      const rondaCalculada = Math.floor(diasTranscurridos / diasPorRonda) + 1;
                      const resultado = Math.min(Math.max(1, rondaCalculada), tanda.totalRondas);
                      console.log('   📊 RONDA ACTUAL CALCULADA:', resultado);
                      return resultado;
                    };
                    
                    const rondaActualCalculada = calcularRondaActual();
                    console.log('   ✅ RONDA ACTUAL FINAL:', rondaActualCalculada);
                    
                    // Calcular progreso
                    const calcularProgreso = () => {
                      if (esCumpleañera) {
                        const cumpleañosCompletados = rondaActualCalculada - 1;
                        return tanda.totalRondas > 0 
                          ? Math.round((cumpleañosCompletados / tanda.totalRondas) * 100) 
                          : 0;
                      }
                      
                      // Lógica original
                      if (!tanda.fechaInicio) return 0;
                      const fechaInicio = new Date(tanda.fechaInicio);
                      const fechaActual = new Date();
                      const diasTranscurridos = Math.floor((fechaActual - fechaInicio) / (1000 * 60 * 60 * 24));
                      
                      let diasPorRonda = 7;
                      if (tanda.frecuencia === 'quincenal') diasPorRonda = 15;
                      else if (tanda.frecuencia === 'mensual') diasPorRonda = 30;
                      
                      const rondasCompletadas = Math.floor(diasTranscurridos / diasPorRonda);
                      return tanda.totalRondas > 0 
                        ? Math.round((Math.max(0, rondasCompletadas) / tanda.totalRondas) * 100) 
                        : 0;
                    };
                    
                    const progreso = calcularProgreso();
                    
                    const proximoNumero = tanda.participantes?.find(
                      p => p.numeroAsignado === rondaActualCalculada
                    );
                    
                    // 🔧 CORRECCIÓN: totalParticipantes debe ser la cantidad real de participantes
                    const numeroParticipantes = Array.isArray(tanda.participantes) ? tanda.participantes.length : 0;
                    const totalParticipantes = numeroParticipantes; // Variable correcta para cálculos
                    
                    // 🔧 Para cumpleañeras, cada cumpleañero recibe (N-1) × monto
                    const cantidadARecibir = esCumpleañera 
                      ? (totalParticipantes - 1) * tanda.montoPorRonda 
                      : tanda.montoPorRonda * totalParticipantes;
                    
                    console.log('   💰 CÁLCULO MONTOS:');
                    console.log('      Total participantes:', totalParticipantes);
                    console.log('      Monto por ronda:', tanda.montoPorRonda);
                    console.log('      Es cumpleañera:', esCumpleañera);
                    console.log('      Cantidad a recibir:', cantidadARecibir);
                    if (proximoCumple) {
                      console.log('      Cantidad cumpleañeros:', proximoCumple.cantidadCumpleañeros);
                    }

                    // 🆕 Colores según tipo de tanda
                    const colores = esCumpleañera ? {
                      header: 'from-pink-500 to-purple-600',
                      headerHover: 'hover:from-pink-600 hover:to-purple-700',
                      progreso: 'from-pink-500 to-purple-600'
                    } : {
                      header: 'from-blue-600 to-blue-800',
                      headerHover: 'hover:from-blue-700 hover:to-blue-900',
                      progreso: 'from-blue-600 to-blue-800'
                    };

                    return (
                      <div
                        key={tanda.tandaId}
                        className="flex-shrink-0 w-[280px] sm:w-[320px] bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden"
                        style={{ scrollSnapAlign: 'start' }}
                      >
                        {/* Header de la card */}
                        <div 
                          className={`bg-gradient-to-r ${colores.header} ${colores.headerHover} p-4 text-white cursor-pointer transition-all relative`}
                          onClick={() => onSeleccionarTanda(tanda.tandaId)}
                        >
                          <h3 className="text-lg font-bold mb-1 pr-8 flex items-center gap-2">
                            {tanda.nombre}
                            {esCumpleañera && <Gift className="w-5 h-5" />}
                          </h3>
                          <div className="flex items-center gap-2 text-xs opacity-90">
                            {esCumpleañera ? <Gift className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                            {esCumpleañera ? 'Tanda Cumpleañera 🎂' : `Ronda ${rondaActualCalculada} de ${tanda.totalRondas}`}
                          </div>
                          
                          {/* Botón Eliminar */}
                          <button
                            onClick={(e) => handleDeleteClick(e, tanda)}
                            className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-red-500 rounded-lg transition-all group"
                            title="Eliminar tanda"
                          >
                            <Trash2 className="w-4 h-4 text-white opacity-70 group-hover:opacity-100" />
                          </button>
                        </div>

                        {/* Contenido */}
                        <div 
                          className="p-4 space-y-3 cursor-pointer"
                          onClick={() => onSeleccionarTanda(tanda.tandaId)}
                        >
                          {/* Progreso */}
                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-gray-600">Progreso</span>
                              <span className="text-gray-800">{progreso}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${colores.progreso}`}
                                style={{ width: `${progreso}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Info en grid */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className={`text-center p-2 ${esCumpleañera ? 'bg-pink-50' : 'bg-blue-50'} rounded-lg`}>
                              <div className="text-base font-bold text-gray-800">
                                {numeroParticipantes}
                              </div>
                              <div className="text-[10px] text-gray-600">Participantes</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded-lg">
                              <div className="text-base font-bold text-gray-800">
                                ${tanda.montoPorRonda?.toLocaleString() || 0}
                              </div>
                              <div className="text-[10px] text-gray-600">{esCumpleañera ? 'Regalo de' : 'Pago de'}</div>
                            </div>
                          </div>

                          {/* Cantidad a recibir */}
                          <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="text-center">
                              <div className="text-[10px] text-purple-600 font-semibold mb-1">
                                {esCumpleañera ? 
                                  (proximoCumple?.cantidadCumpleañeros > 1 ? 
                                    'Regalo por Cumpleañero' : 
                                    'Regalo Total') 
                                  : 'Cantidad a Recibir'}
                              </div>
                              <div className="text-lg font-black text-purple-700">
                                {esCumpleañera && proximoCumple?.cantidadCumpleañeros > 1 ? 
                                  `$${((totalParticipantes - 1) * tanda.montoPorRonda).toLocaleString()}` :
                                  `$${cantidadARecibir.toLocaleString()}`
                                }
                              </div>
                              {esCumpleañera && proximoCumple?.cantidadCumpleañeros > 1 && (
                                <div className="text-[9px] text-purple-600 mt-1">
                                  Total: ${((totalParticipantes - 1) * tanda.montoPorRonda * proximoCumple.cantidadCumpleañeros).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Número Actual - Solo mostrar cuando NO es cumpleañera */}
                          {proximoNumero && !esCumpleañera && (
                            <div className="p-2 bg-green-50 border-green-200 border rounded-lg">
                              <div className="text-[10px] text-green-600 font-semibold mb-1">
                                Número Actual
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-green-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                                  {proximoNumero.numeroAsignado}
                                </div>
                                <div className="text-xs font-semibold text-gray-800 truncate">
                                  {proximoNumero.nombre}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 🆕 Contador de días para cumpleañeras */}
                          {esCumpleañera && proximoCumple && (
                            <div className="p-3 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-xl">
                              {/* 🎂 CUMPLEAÑOS HOY (diasFaltantes === 0) */}
                              {proximoCumple.diasFaltantes === 0 ? (
                                <>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Gift className="w-6 h-6 text-pink-600" />
                                      <span className="text-xs font-bold text-pink-800">
                                        ¡Hoy Cumple Años!
                                      </span>
                                    </div>
                                  </div>
                                  {/* Mostrar quién(es) cumple(n) hoy */}
                                  <div className="space-y-1">
                                    {proximoCumple.cumpleañerosHoy.map((cumple, idx) => (
                                      <div key={idx} className="flex items-center gap-2 bg-pink-200 p-2 rounded-lg">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
                                          {cumple.numeroAsignado}
                                        </div>
                                        <div className="flex-1">
                                          <div className="text-sm font-bold text-pink-800">
                                            {cumple.nombre.split(' ')[0]}
                                          </div>
                                          <div className="text-sm font-semibold text-pink-600">
                                            {new Date(cumple.fechaCumpleaños + 'T00:00:00').toLocaleDateString('es-MX', {
                                              day: 'numeric',
                                              month: 'short',
                                              year: 'numeric'
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              ) : proximoCumple.cumpleañerosRecientes && proximoCumple.cumpleañerosRecientes.length > 0 ? (
                                /* 🎉 CUMPLEAÑOS RECIENTE (últimos 5 días) */
                                <>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-5 h-5 text-pink-600" />
                                      <span className="text-xs font-semibold text-pink-800">
                                        Cumpleaños Reciente
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-pink-600">
                                      Hace {proximoCumple.cumpleañerosRecientes[0].diasDesde} día{proximoCumple.cumpleañerosRecientes[0].diasDesde !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                  {/* Mostrar quién cumplió recientemente */}
                                  <div className="space-y-1">
                                    {proximoCumple.cumpleañerosRecientes.map((cumple, idx) => (
                                      <div key={idx} className="flex items-center gap-2 bg-pink-100 p-2 rounded-lg">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 text-white flex items-center justify-center font-bold text-sm">
                                          {cumple.numeroAsignado}
                                        </div>
                                        <div className="flex-1">
                                          <div className="text-xs font-bold text-pink-800">
                                            {cumple.nombre.split(' ')[0]}
                                          </div>
                                          <div className="text-[10px] text-pink-600">
                                            {cumple.fechaUltimoCumple.toLocaleDateString('es-MX', {
                                              day: 'numeric',
                                              month: 'short',
                                              year: 'numeric'
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              ) : proximoCumple.cantidadCumpleañeros > 1 ? (
                                /* 👥 MÚLTIPLES PRÓXIMOS CUMPLEAÑEROS */
                                <>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-5 h-5 text-pink-600" />
                                      <span className="text-xs font-semibold text-pink-800">
                                        {proximoCumple.cantidadCumpleañeros} Cumpleañeros
                                      </span>
                                    </div>
                                    {proximoCumple.diasFaltantesProximo > 0 && (
                                      <div className="text-right">
                                        <div className="text-xl font-black text-pink-600">
                                          {proximoCumple.diasFaltantesProximo}
                                        </div>
                                        <div className="text-[9px] text-pink-600">
                                          día{proximoCumple.diasFaltantesProximo !== 1 ? 's' : ''}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {/* Lista de nombres de cumpleañeros */}
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {proximoCumple.cumpleañerosHoy.map((cumple, idx) => (
                                      <span key={idx} className="text-[10px] bg-pink-200 text-pink-800 px-2 py-0.5 rounded-full font-semibold">
                                        #{cumple.numeroAsignado} {cumple.nombre.split(' ')[0]}
                                      </span>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                /* 📅 UN SOLO PRÓXIMO CUMPLEAÑERO */
                                <>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-5 h-5 text-pink-600" />
                                      <span className="text-xs font-semibold text-pink-800">
                                        Próximo Cumpleaños
                                      </span>
                                    </div>
                                    {proximoCumple.diasFaltantesProximo > 0 && (
                                      <div className="text-right">
                                        <div className="text-xl font-black text-pink-600">
                                          {proximoCumple.diasFaltantesProximo}
                                        </div>
                                        <div className="text-[9px] text-pink-600">
                                          día{proximoCumple.diasFaltantesProximo !== 1 ? 's' : ''}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {/* 🆕 Fechas específicas para cumpleañeras */}
                          {esCumpleañera && proximoCumple && proximoCumple.cumpleañerosHoy && proximoCumple.cumpleañerosHoy.length > 0 ? (
                            <div className="p-3 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-xl">
                              <div className="flex flex-col gap-2">
                                {/* Título */}
                                <div className="text-[10px] text-pink-600 font-semibold">
                                  {proximoCumple.cumpleañerosHoy.length > 1 
                                    ? `Próximos Cumpleaños (${proximoCumple.cumpleañerosHoy.length})`
                                    : 'Próximo Cumpleaños'}
                                </div>
                                
                                {/* Lista de cumpleañeros */}
                                <div className="flex flex-col gap-2">
                                  {proximoCumple.cumpleañerosProximos.map((cumpleañero, index) => (
                                    <div key={cumpleañero.numeroAsignado} className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-lg">
                                        {cumpleañero.numeroAsignado}
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-xs font-bold text-gray-800">
                                          {cumpleañero.nombre.split(' ')[0]}
                                        </div>
                                        {(
                                          <div className="text-xs text-pink-500 font-semibold">
                                            {proximoCumple.fecha?.toLocaleDateString('es-MX', { 
                                              day: 'numeric', 
                                              month: 'long',
                                              year: 'numeric'
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Mostrar la fecha solo una vez si hay múltiples cumpleañeros
                                {proximoCumple.cumpleañerosHoy.length > 1 && (
                                  <div className="text-xs text-pink-600 font-semibold text-center pt-1 border-t border-pink-200">
                                    {proximoCumple.fecha?.toLocaleDateString('es-MX', { 
                                      day: 'numeric', 
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </div>
                                )}*/}
                              </div>
                            </div>
                          ) : (
                            /* Fechas para tandas normales */
                            <div className="grid grid-cols-2 gap-2">
                              {tanda.fechaInicio && (() => {
                                const fechaInicio = new Date(tanda.fechaInicio);
                                fechaInicio.setDate(fechaInicio.getDate() + 1);
                                return (
                                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="text-[10px] text-blue-600 font-semibold mb-1">
                                      Inicio
                                    </div>
                                    <div className="text-xs font-bold text-gray-800">
                                      {fechaInicio.toLocaleDateString('es-MX', { 
                                        day: 'numeric', 
                                        month: 'short',
                                        year: 'numeric'
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                              
                              {/* Calcular fecha fin para tandas normales */}
                              {tanda.fechaInicio && (() => {
                                const fechaInicio = new Date(tanda.fechaInicio);
                                let fechaFin = null;

                                if (tanda.frecuencia === 'semanal') {
                                  const diasHasta = (tanda.totalRondas - 1) * 7;
                                  fechaFin = new Date(fechaInicio);
                                  fechaFin.setDate(fechaFin.getDate() + diasHasta + 1);
                                } else if (tanda.frecuencia === 'quincenal') {
                                  let temp = new Date(fechaInicio);
                                  for (let i = 1; i < tanda.totalRondas + 1; i++) {
                                    const dia = temp.getDate();
                                    if (dia < 15) {
                                      temp.setDate(dia === 1 || dia === 15 ? 15 : 16);
                                    } else {
                                      temp.setMonth(temp.getMonth() + 1);
                                      temp.setDate(1);
                                    }
                                  }
                                  fechaFin = temp;
                                } else if (tanda.frecuencia === 'mensual') {
                                  fechaFin = new Date(fechaInicio);
                                  fechaFin.setMonth(fechaFin.getMonth() + tanda.totalRondas - 1);
                                  fechaFin.setDate(fechaFin.getDate() + 1);
                                }

                                return fechaFin ? (
                                  <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg">
                                    <div className="text-[10px] text-purple-600 font-semibold mb-1">
                                      Fin
                                    </div>
                                    <div className="text-xs font-bold text-gray-800">
                                      {fechaFin.toLocaleDateString('es-MX', { 
                                        day: 'numeric', 
                                        month: 'short',
                                        year: 'numeric'
                                      })}
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && tandaToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scaleIn">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Eliminar Tanda</h3>
                  <p className="text-sm opacity-90">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-800 mb-2">
                ¿Estás seguro que deseas eliminar la tanda:
              </p>
              <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 mb-4">
                <p className="font-bold text-gray-900 text-lg mb-2">
                  {tandaToDelete.nombre}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Participantes:</span>
                    <span className="font-semibold text-gray-800 ml-1">
                      {Array.isArray(tandaToDelete.participantes) ? tandaToDelete.participantes.length : 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Rondas:</span>
                    <span className="font-semibold text-gray-800 ml-1">
                      {tandaToDelete.totalRondas}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-semibold mb-1">Advertencia:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Se eliminarán todos los participantes</li>
                      <li>Se perderá todo el historial de pagos</li>
                      <li>Los links de registro dejarán de funcionar</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-6 bg-white text-gray-700 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      Eliminar Tanda
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
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
        
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}