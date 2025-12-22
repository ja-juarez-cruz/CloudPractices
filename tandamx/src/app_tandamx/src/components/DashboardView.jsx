import React, { useMemo } from 'react';
import { Users, DollarSign, Calendar, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';

export default function DashboardView({ tandaData, estadisticas }) {
  if (!tandaData) return null;

  // Calcular ronda actual basada en fecha
  const calcularRondaActual = () => {
    if (!tandaData.fechaInicio) return 1;

    const fechaInicio = new Date(tandaData.fechaInicio);
    const fechaActual = new Date();
    const diasTranscurridos = Math.floor((fechaActual - fechaInicio) / (1000 * 60 * 60 * 24));

    let diasPorRonda = 7; // semanal
    if (tandaData.frecuencia === 'quincenal') diasPorRonda = 15;
    else if (tandaData.frecuencia === 'mensual') diasPorRonda = 30;

    const rondaCalculada = Math.floor(diasTranscurridos / diasPorRonda) + 1;
    return Math.min(Math.max(1, rondaCalculada), tandaData.totalRondas);
  };

  const rondaActual = calcularRondaActual();

  // Calcular estadísticas de la RONDA ACTUAL
  const statsRondaActual = useMemo(() => {
    const participantes = tandaData.participantes || [];
    const totalParticipantes = participantes.length;

    // Contar solo los que han pagado la RONDA ACTUAL
    let pagadosRondaActual = 0;
    let montoRecaudadoRondaActual = 0;

    participantes.forEach(participante => {
      // Verificar si tiene pago en la ronda actual
      const pagos = participante.pagos || {};
      const pagoRondaActual = pagos[rondaActual];

      if (pagoRondaActual && pagoRondaActual.pagado) {
        pagadosRondaActual++;
        montoRecaudadoRondaActual += tandaData.montoPorRonda || 0;
      }
    });

    const pendientesRondaActual = totalParticipantes - pagadosRondaActual;
    const montoEsperadoRondaActual = totalParticipantes * (tandaData.montoPorRonda || 0);
    const porcentajeRecaudacionRondaActual = montoEsperadoRondaActual > 0
      ? (montoRecaudadoRondaActual / montoEsperadoRondaActual) * 100
      : 0;

    return {
      totalParticipantes,
      pagadosRondaActual,
      pendientesRondaActual,
      montoRecaudadoRondaActual,
      montoEsperadoRondaActual,
      porcentajeRecaudacionRondaActual
    };
  }, [tandaData.participantes, rondaActual, tandaData.montoPorRonda]);

  const proximoNumero = tandaData.participantes?.find(
    p => p.numeroAsignado === rondaActual
  );

  // Progreso de rondas: solo cuenta rondas COMPLETADAS (que ya iniciaron una nueva)
  const rondasCompletadas = Math.max(0, rondaActual - 1);
  const progresoRondas = tandaData.totalRondas > 0
    ? (rondasCompletadas / tandaData.totalRondas) * 100
    : 0;


  return (
    <div className="space-y-6">

      {/* Próximo Número y Progreso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximo Número */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-6 h-6" />
            <h3 className="text-lg font-bold">Turno de Esta Ronda</h3>
          </div>
          {proximoNumero ? (
            <div>
              <div className="text-6xl font-black mb-2">{proximoNumero.numeroAsignado}</div>
              <div className="text-xl font-semibold mb-1">{proximoNumero.nombre}</div>
              <div className="text-sm opacity-90">{proximoNumero.telefono}</div>
              
              {/* Fecha de pago */}
              {(() => {
                const calcularFechaPago = (numeroAsignado) => {
                  if (!tandaData.fechaInicio) return null;
                  
                  const fechaInicio = new Date(tandaData.fechaInicio);
                  let diasPorRonda = 7; // semanal
                  if (tandaData.frecuencia === 'quincenal') diasPorRonda = 15;
                  else if (tandaData.frecuencia === 'mensual') diasPorRonda = 30;
                  
                  // Calcular fecha de inicio de su ronda
                  const diasHastaRonda = (numeroAsignado - 1) * diasPorRonda;
                  const fechaInicioRonda = new Date(fechaInicio);
                  fechaInicioRonda.setDate(fechaInicioRonda.getDate() + diasHastaRonda);
                  
                  // Fecha de siguiente ronda
                  const fechaSiguienteRonda = new Date(fechaInicioRonda);
                  fechaSiguienteRonda.setDate(fechaSiguienteRonda.getDate() + diasPorRonda);
                  
                  // Fecha de pago: 1 día antes de que empiece la siguiente ronda
                  const fechaPago = new Date(fechaSiguienteRonda);
                  fechaPago.setDate(fechaPago.getDate() - 1);
                  
                  return fechaPago;
                };
                
                const fechaPago = calcularFechaPago(proximoNumero.numeroAsignado);
                
                return (
                  <>
                    {fechaPago && (
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <div className="text-sm opacity-90">Fecha de Pago</div>
                        <div className="text-lg font-bold">
                          📅 {fechaPago.toLocaleDateString('es-MX', { 
                            weekday: 'long',
                            day: 'numeric', 
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-white/20">
                      <div className="text-sm opacity-90">Recibirá</div>
                      <div className="text-2xl font-bold">
                        ${(tandaData.montoPorRonda * statsRondaActual.totalParticipantes)?.toLocaleString()}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-16 h-16 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No hay número asignado para esta ronda</p>
            </div>
          )}
        </div>

        {/* Progreso de la Tanda */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-6 h-6 text-gray-700" />
            <h3 className="text-lg font-bold text-gray-800">Progreso de la Tanda</h3>
          </div>

          <div className="space-y-6">
            {/* Barra de Monto Recaudado (Ronda Actual) */}
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-gray-600">Monto Recaudado (Ronda {rondaActual})</span>
                <span className="text-gray-800">
                  ${statsRondaActual.montoRecaudadoRondaActual.toLocaleString()} / ${statsRondaActual.montoEsperadoRondaActual.toLocaleString()}
                </span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500"
                  style={{
                    width: `${statsRondaActual.porcentajeRecaudacionRondaActual}%`
                  }}
                ></div>
              </div>
              <div className="text-right text-xs text-gray-500 mt-1">
                {statsRondaActual.porcentajeRecaudacionRondaActual.toFixed(1)}% completado
              </div>
            </div>

            {/* Barra de Rondas Completadas */}
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-gray-600">Rondas Completadas</span>
                <span className="text-gray-800">{rondasCompletadas} / {tandaData.totalRondas}</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-400 transition-all duration-500"
                  style={{ width: `${progresoRondas}%` }}
                ></div>
              </div>
              <div className="text-right text-xs text-gray-500 mt-1">
                {progresoRondas.toFixed(1)}% completado
              </div>
            </div>

            {/* Información adicional */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <div className="text-xs text-gray-500 mb-1">Monto por Ronda</div>
                <div className="text-xl font-bold text-gray-800">
                  ${tandaData.montoPorRonda?.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Total Tanda</div>
                <div className="text-xl font-bold text-gray-800">
                  ${(tandaData.montoPorRonda * tandaData.totalRondas)?.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista Rápida de Participantes */}
      <div className="bg-white rounded-2xl shadow-xl p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-gray-700" />
            <h3 className="text-lg font-bold text-gray-800">
              Participantes – Ronda {rondaActual}
            </h3>
          </div>
          <span className="text-sm text-gray-500">
            {statsRondaActual.pagadosRondaActual} de {statsRondaActual.totalParticipantes} pagados
          </span>
        </div>

        {/* 🔹 Resumen de la ronda (lista compacta) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 rounded-xl bg-gray-50 border">

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-xs text-gray-500">Total</div>
              <div className="font-bold text-gray-800">
                {statsRondaActual.totalParticipantes}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-xs text-gray-500">Pagados</div>
              <div className="font-bold text-gray-800">
                {statsRondaActual.pagadosRondaActual}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <div>
              <div className="text-xs text-gray-500">Pendientes</div>
              <div className="font-bold text-gray-800">
                {statsRondaActual.pendientesRondaActual}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-600" />
            <div>
              <div className="text-xs text-gray-500">Recaudado</div>
              <div className="font-bold text-gray-800">
                ${statsRondaActual.montoRecaudadoRondaActual.toLocaleString()}
              </div>
            </div>
          </div>

        </div>

        {/* Lista de participantes */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {(tandaData.participantes || [])
            .sort((a, b) => a.numeroAsignado - b.numeroAsignado)
            .map((participante) => {
              const esProximo = participante.numeroAsignado === rondaActual;
              const pagos = participante.pagos || {};
              const pagoRondaActual = pagos[rondaActual];
              const pagadoRondaActual = pagoRondaActual && pagoRondaActual.pagado;

              return (
                <div
                  key={participante.participanteId}
                  className={`p-3 rounded-xl border-2 transition-all ${esProximo
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${esProximo
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-700'
                        }`}>
                        {participante.numeroAsignado}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">
                          {participante.nombre}
                        </div>
                        <div className="text-xs text-gray-500">
                          {participante.telefono}
                        </div>
                      </div>
                    </div>

                    {pagadoRondaActual ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                        ✓ Pagado R{rondaActual}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold">
                        ⏳ Pendiente R{rondaActual}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}