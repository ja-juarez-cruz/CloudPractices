import React from 'react';
import { Users, Plus, Calendar, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';

export default function InicioView({ tandas, setActiveView, onSeleccionarTanda, onCrearNueva }) {
  const [filtroActivo, setFiltroActivo] = React.useState('todas'); // 'todas', 'vigentes', 'pasadas', 'proximas'
  
  if (!tandas || tandas.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <style>{`
          /* Ocultar scrollbar pero mantener funcionalidad */
          .scrollbar-hide {
            -ms-overflow-style: none;  /* IE y Edge */
            scrollbar-width: none;  /* Firefox */
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;  /* Chrome, Safari y Opera */
          }
        `}</style>
        <div className="text-center py-16">
          <div className="inline-block p-6 bg-gradient-to-br from-orange-100 to-rose-100 rounded-3xl mb-6">
            <Users className="w-20 h-20 text-orange-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-800 mb-3">
            Bienvenido al Administrador de Tandas
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Crea tu primera tanda para comenzar a gestionar participantes y pagos de forma profesional
          </p>
          <button
            onClick={onCrearNueva}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-bold hover:shadow-lg transition-all text-lg"
          >
            <Plus className="w-6 h-6" />
            Crear Mi Primera Tanda
          </button>
        </div>
      </div>
    );
  }

  // Calcular estadísticas globales basadas en fechas
  const calcularEstadoTanda = (tanda) => {
    if (!tanda.fechaInicio) return 'proximas';
    
    const fechaInicio = new Date(tanda.fechaInicio);
    const fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0);
    fechaInicio.setHours(0, 0, 0, 0);
    
    // Calcular fecha fin
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
    
    // Determinar estado
    if (fechaActual < fechaInicio) {
      return 'proximas'; // Aún no ha comenzado (cambiado de 'proxima' a 'proximas')
    } else if (fechaActual > fechaFin) {
      return 'pasadas'; // Ya terminó (cambiado de 'pasada' a 'pasadas')
    } else {
      return 'vigentes'; // Está en progreso (cambiado de 'vigente' a 'vigentes')
    }
  };
  
  const totalTandas = tandas.length;
  const tandasVigentes = tandas.filter(t => calcularEstadoTanda(t) === 'vigentes').length;
  const tandasPasadas = tandas.filter(t => calcularEstadoTanda(t) === 'pasadas').length;
  const tandasProximas = tandas.filter(t => calcularEstadoTanda(t) === 'proximas').length;

  return (
    <div className="space-y-6">
      <style>{`
        /* Ocultar scrollbar pero mantener funcionalidad */
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE y Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;  /* Chrome, Safari y Opera */
        }
      `}</style>
      
      {/* Filtros - Compactos y clicables */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Filtrar Tandas</h2>
        <div className="flex gap-2 flex-wrap">
          {/* Todas */}
          <button
            onClick={() => setFiltroActivo('todas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filtroActivo === 'todas'
                ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Todas</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              filtroActivo === 'todas' ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {totalTandas}
            </span>
          </button>

          {/* Vigentes */}
          <button
            onClick={() => setFiltroActivo('vigentes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filtroActivo === 'vigentes'
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Vigentes</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              filtroActivo === 'vigentes' ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {tandasVigentes}
            </span>
          </button>

          {/* Pasadas */}
          <button
            onClick={() => setFiltroActivo('pasadas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filtroActivo === 'pasadas'
                ? 'bg-gray-500 text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Pasadas</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              filtroActivo === 'pasadas' ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {tandasPasadas}
            </span>
          </button>

          {/* Próximas */}
          <button
            onClick={() => setFiltroActivo('proximas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filtroActivo === 'proximas'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
            }`}
          >
            <ArrowRight className="w-4 h-4" />
            <span>Próximas</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              filtroActivo === 'proximas' ? 'bg-white/20' : 'bg-gray-100'
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
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Tanda
          </button>
        </div>

        {/* Filtrar tandas según el estado seleccionado */}
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
              {/* Carrusel con scroll horizontal */}
              <div className="overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex gap-4" style={{ scrollSnapType: 'x mandatory' }}>
                  {tandasFiltradas.map((tanda) => {
                    // Calcular ronda actual basada en fechas
                    const calcularRondaActualPorFecha = () => {
                      if (!tanda.fechaInicio) return 1;
                      
                      const fechaInicio = new Date(tanda.fechaInicio);
                      const fechaActual = new Date();
                      const diasTranscurridos = Math.floor((fechaActual - fechaInicio) / (1000 * 60 * 60 * 24));
                      
                      let diasPorRonda = 7; // semanal por defecto
                      if (tanda.frecuencia === 'quincenal') diasPorRonda = 15;
                      else if (tanda.frecuencia === 'mensual') diasPorRonda = 30;
                      
                      const rondaCalculada = Math.floor(diasTranscurridos / diasPorRonda) + 1;
                      return Math.min(Math.max(1, rondaCalculada), tanda.totalRondas);
                    };
                    
                    const rondaActualCalculada = calcularRondaActualPorFecha();
                    
                    // Calcular rondas COMPLETADAS (no la ronda actual)
                    // El progreso debe basarse en rondas que YA terminaron
                    const calcularRondasCompletadas = () => {
                      if (!tanda.fechaInicio) return 0;
                      
                      const fechaInicio = new Date(tanda.fechaInicio);
                      const fechaActual = new Date();
                      const diasTranscurridos = Math.floor((fechaActual - fechaInicio) / (1000 * 60 * 60 * 24));
                      
                      let diasPorRonda = 7;
                      if (tanda.frecuencia === 'quincenal') diasPorRonda = 15;
                      else if (tanda.frecuencia === 'mensual') diasPorRonda = 30;
                      
                      // Rondas completadas = piso(días transcurridos / días por ronda)
                      // Ejemplo: día 0-6 = 0 rondas completadas
                      //          día 7-13 = 1 ronda completada (11%)
                      //          día 14-20 = 2 rondas completadas (22%)
                      const rondasCompletadas = Math.floor(diasTranscurridos / diasPorRonda);
                      return Math.min(Math.max(0, rondasCompletadas), tanda.totalRondas);
                    };
                    
                    const rondasCompletadas = calcularRondasCompletadas();
                    const progreso = tanda.totalRondas > 0 
                      ? Math.round((rondasCompletadas / tanda.totalRondas) * 100) 
                      : 0;
                    
                    const proximoNumero = tanda.participantes?.find(
                      p => p.numeroAsignado === rondaActualCalculada
                    );
                    
                    // Calcular cantidad a recibir
                    const totalParticipantes = tanda.totalRondas || 0;
                    const cantidadARecibir = tanda.montoPorRonda * totalParticipantes;
                    
                    // Calcular fecha fin de la tanda (basada en el último participante)
                    const calcularFechaFin = () => {
                      if (!tanda.fechaInicio || !tanda.totalRondas) return null;
                      
                      const fechaInicio = new Date(tanda.fechaInicio);
                      let diasPorRonda = 7;
                      if (tanda.frecuencia === 'quincenal') diasPorRonda = 15;
                      else if (tanda.frecuencia === 'mensual') diasPorRonda = 30;
                      
                      // Calcular fecha de pago del último participante
                      const ultimaRonda = tanda.totalRondas;
                      const diasHastaUltimaRonda = (ultimaRonda - 1) * diasPorRonda;
                      const fechaInicioUltimaRonda = new Date(fechaInicio);
                      fechaInicioUltimaRonda.setDate(fechaInicioUltimaRonda.getDate() + diasHastaUltimaRonda);
                      
                      // Fecha de siguiente ronda después de la última
                      const fechaSiguienteRonda = new Date(fechaInicioUltimaRonda);
                      fechaSiguienteRonda.setDate(fechaSiguienteRonda.getDate() + diasPorRonda);
                      
                      // Fecha de pago del último participante: 1 día antes de la siguiente ronda
                      const fechaFinTanda = new Date(fechaSiguienteRonda);
                      fechaFinTanda.setDate(fechaFinTanda.getDate() - 1);
                      
                      return fechaFinTanda;
                    };
                    
                    const fechaInicio = tanda.fechaInicio ? new Date(tanda.fechaInicio) : null;
                    const fechaFin = calcularFechaFin();
                    
                    // Contar participantes reales
                    const numeroParticipantes = Array.isArray(tanda.participantes) ? tanda.participantes.length : 0;

                    return (
                      <div
                        key={tanda.tandaId}
                        className="flex-shrink-0 w-[280px] sm:w-[320px] bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden cursor-pointer"
                        style={{ scrollSnapAlign: 'start' }}
                        onClick={() => onSeleccionarTanda(tanda.tandaId)}
                      >
                        {/* Header de la card */}
                        <div className="bg-gradient-to-r from-orange-500 to-rose-500 p-4 text-white">
                        <h3 className="text-lg font-bold mb-1">{tanda.nombre}</h3>
                        <div className="flex items-center gap-2 text-xs opacity-90">
                          <Calendar className="w-3 h-3" />
                          Ronda {rondaActualCalculada} de {tanda.totalRondas}
                        </div>
                      </div>

                      {/* Contenido */}
                      <div className="p-4 space-y-3">
                        {/* Progreso */}
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-gray-600">Progreso</span>
                            <span className="text-gray-800">{progreso}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-rose-500"
                              style={{ width: `${progreso}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Info en grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-center p-2 bg-blue-50 rounded-lg">
                            <div className="text-base font-bold text-gray-800">
                              {numeroParticipantes}
                            </div>
                            <div className="text-[10px] text-gray-600">Participantes</div>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded-lg">
                            <div className="text-base font-bold text-gray-800">
                            ${tanda.montoPorRonda?.toLocaleString() || 0}
                            </div>
                            <div className="text-[10px] text-gray-600">Pago de</div>
                          </div>
                        </div>

                        {/* Cantidad a recibir */}
                        <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="text-center">
                            <div className="text-[10px] text-purple-600 font-semibold mb-1">
                              Cantidad a Recibir
                            </div>
                            <div className="text-lg font-black text-purple-700">
                            ${cantidadARecibir.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Número Actual */}
                        {proximoNumero && (
                          <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
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

                        {/* Fechas de la Tanda */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* Fecha de Inicio */}
                          {fechaInicio && (
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
                        )}
                        
                          {/* Fecha Fin */}
                          {fechaFin && (
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
                        )}
                        </div>
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
    </div>
  );
}