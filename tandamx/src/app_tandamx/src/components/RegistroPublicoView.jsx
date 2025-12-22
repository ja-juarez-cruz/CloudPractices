import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, Calendar, DollarSign, AlertCircle, Loader } from 'lucide-react';

const API_BASE_URL = 'https://9l2vrevqm1.execute-api.us-east-1.amazonaws.com/dev';

export default function RegistroPublicoView({ token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tandaData, setTandaData] = useState(null);
  const [numerosSeleccionados, setNumerosSeleccionados] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [registroExitoso, setRegistroExitoso] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [tandaCompleta, setTandaCompleta] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: ''
  });

  // Cargar datos de la tanda con el token
  useEffect(() => {
    cargarDatosTanda();
  }, [token]);

  const cargarDatosTanda = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/registro/${token}`,
        {
          method: 'GET'
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Link de registro no válido o expirado');
        }
        throw new Error(data.error?.message || 'Error al cargar datos');
      }

      if (data.success) {
        setTandaData(data.data);
        
        // Verificar si hay números disponibles
        const numerosOcupados = data.data.participantes?.map(p => p.numeroAsignado) || [];
        const numerosDisponibles = [];
        for (let i = 1; i <= data.data.totalRondas; i++) {
          if (!numerosOcupados.includes(i)) {
            numerosDisponibles.push(i);
          }
        }
        
        // Si no hay números disponibles, marcar como completa
        if (numerosDisponibles.length === 0) {
          setTandaCompleta(true);
          // Redirigir después de 3 segundos
          setTimeout(() => {
            window.location.href = `/index.html?tanda=${data.data.tandaId}`;
          }, 3000);
        }
        
        // Calcular tiempo restante si hay expiración
        if (data.data.expiracion) {
          calcularTiempoRestante(data.data.expiracion);
        }
      }
    } catch (error) {
      console.error('Error cargando tanda:', error);
      setError(error.message || 'Error al cargar datos de la tanda');
    } finally {
      setLoading(false);
    }
  };

  // Función para calcular tiempo restante
  const calcularTiempoRestante = (expiracion) => {
    const ahora = new Date().getTime();
    const fechaExpiracion = new Date(expiracion).getTime();
    const diferencia = fechaExpiracion - ahora;
    
    if (diferencia <= 0) {
      setTiempoRestante('Expirado');
      return;
    }
    
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
    
    setTiempoRestante(`${horas}h ${minutos}m`);
  };

  // useEffect para actualizar el contador cada minuto
  useEffect(() => {
    if (!tandaData?.expiracion) return;
    
    const interval = setInterval(() => {
      calcularTiempoRestante(tandaData.expiracion);
    }, 60000); // Actualizar cada minuto
    
    return () => clearInterval(interval);
  }, [tandaData]);

  // Calcular fechas de ronda
  const calcularFechasRonda = (numeroRonda) => {
    if (!tandaData.fechaInicio) return null;
    
    const fechaInicio = new Date(tandaData.fechaInicio);
    let diasPorRonda = 7; // semanal
    if (tandaData.frecuencia === 'quincenal') diasPorRonda = 15;
    else if (tandaData.frecuencia === 'mensual') diasPorRonda = 30;
    
    // Fecha de inicio de esta ronda
    const diasHastaRonda = (numeroRonda - 1) * diasPorRonda;
    const fechaInicioRonda = new Date(fechaInicio);
    fechaInicioRonda.setDate(fechaInicioRonda.getDate() + diasHastaRonda);
    
    // Fecha de fin de esta ronda (1 día antes de la siguiente)
    const fechaFinRonda = new Date(fechaInicioRonda);
    fechaFinRonda.setDate(fechaFinRonda.getDate() + diasPorRonda - 1);
    
    return {
      inicio: fechaInicioRonda,
      fin: fechaFinRonda
    };
  };

  // Toggle selección de número
  const toggleNumero = (numero) => {
    const maxNumeros = Math.floor(tandaData.totalRondas * 0.5); // 50%
    
    if (numerosSeleccionados.includes(numero)) {
      setNumerosSeleccionados(numerosSeleccionados.filter(n => n !== numero));
    } else {
      if (numerosSeleccionados.length >= maxNumeros) {
        alert(`Solo puedes seleccionar hasta ${maxNumeros} números (50% del total)`);
        return;
      }
      setNumerosSeleccionados([...numerosSeleccionados, numero]);
    }
  };

  // Enviar registro
  const enviarRegistro = async (e) => {
    e.preventDefault();
    
    if (numerosSeleccionados.length === 0) {
      alert('Debes seleccionar al menos un número');
      return;
    }

    if (!formData.nombre.trim() || !formData.telefono.trim()) {
      alert('Nombre y teléfono son obligatorios');
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/registro/${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nombre: formData.nombre.trim(),
            telefono: formData.telefono.trim(),
            email: formData.email.trim() || undefined,
            numeros: numerosSeleccionados
          })
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al registrar');
      }

      if (data.success) {
        setRegistroExitoso(true);
        // Redirigir a vista pública después de 2 segundos
        setTimeout(() => {
          window.location.href = `/index.html?tanda=${tandaData.tandaId}`;
        }, 2000);
      }
    } catch (error) {
      console.error('Error en registro:', error);
      setError(error.message || 'Error al completar el registro');
    } finally {
      setEnviando(false);
    }
  };

  // Estados de carga y error
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Pantalla de tanda completa
  if (tandaCompleta) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white rounded-3xl shadow-xl p-8">
          <div className="inline-block p-6 bg-blue-100 rounded-full mb-4">
            <CheckCircle className="w-16 h-16 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Tanda Completa!</h2>
          <p className="text-gray-600 mb-4">
            Todos los números de esta tanda ya han sido asignados.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Pero puedes ver el tablero público para seguir el progreso de los pagos.
          </p>
          <div className="mt-6">
            <Loader className="w-6 h-6 text-blue-600 mx-auto mb-2 animate-spin" />
            <p className="text-xs text-gray-500">
              Redirigiendo al tablero público...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (registroExitoso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-block p-6 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Registro Exitoso!</h2>
          <p className="text-gray-600 mb-4">
            Te has registrado correctamente en la tanda
          </p>
          <p className="text-sm text-gray-500">
            Serás redirigido al tablero público...
          </p>
        </div>
      </div>
    );
  }

  // Números disponibles
  const numerosOcupados = tandaData.participantes?.map(p => p.numeroAsignado) || [];
  const numerosDisponibles = Array.from(
    { length: tandaData.totalRondas },
    (_, i) => i + 1
  ).filter(n => !numerosOcupados.includes(n));

  const maxNumeros = Math.floor(tandaData.totalRondas * 0.5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-6">
          <div className="text-center mb-6">
            <div className="inline-block p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-800 mb-2">
              {tandaData.nombre}
            </h1>
            <p className="text-gray-600">Registro de Participante</p>
            
            {/* Contador discreto de expiración */}
            {tiempoRestante && tiempoRestante !== 'Expirado' && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-yellow-800 font-medium">
                  Link válido por {tiempoRestante}
                </span>
              </div>
            )}
            
            {tiempoRestante === 'Expirado' && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-3 h-3 text-red-600" />
                <span className="text-xs text-red-800 font-medium">
                  Link expirado
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 text-center">
              <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">
                ${tandaData.montoPorRonda?.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Por Ronda</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 text-center">
              <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">
                {tandaData.totalRondas}
              </div>
              <div className="text-sm text-gray-600">Rondas</div>
            </div>
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-4 text-center">
              <Users className="w-8 h-8 text-pink-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">
                {numerosDisponibles.length}
              </div>
              <div className="text-sm text-gray-600">Disponibles</div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Tus Datos</h2>
          
          <form onSubmit={enviarRegistro} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                required
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="5512345678"
                pattern="[0-9]{10}"
                title="Ingresa un teléfono válido de 10 dígitos"
              />
              <p className="mt-1 text-xs text-gray-500">
                10 dígitos sin espacios ni guiones
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email (opcional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="tu@email.com"
              />
            </div>
          </form>
        </div>

        {/* Selección de Números */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Selecciona tus Números</h2>
            <div className="text-sm text-gray-600">
              {numerosSeleccionados.length} / {maxNumeros} máximo
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-yellow-800">
              💡 Puedes seleccionar hasta <strong>{maxNumeros} números</strong> (50% del total)
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {Array.from({ length: tandaData.totalRondas }, (_, i) => i + 1).map((numero) => {
              const disponible = numerosDisponibles.includes(numero);
              const seleccionado = numerosSeleccionados.includes(numero);
              const fechas = disponible ? calcularFechasRonda(numero) : null;

              return (
                <div key={numero} className="relative">
                  <button
                    type="button"
                    onClick={() => disponible && toggleNumero(numero)}
                    disabled={!disponible}
                    className={`w-full aspect-square rounded-xl font-bold text-lg transition-all ${
                      !disponible
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : seleccionado
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-purple-500 hover:shadow-md'
                    }`}
                  >
                    {numero}
                  </button>
                  
                  {disponible && fechas && (
                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {fechas.inicio.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      {' - '}
                      {fechas.fin.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                  
                  {disponible && fechas && (
                    <div className="text-[9px] text-center text-gray-500 mt-1">
                      {fechas.inicio.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {numerosSeleccionados.length > 0 && (
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-sm font-semibold text-purple-800 mb-2">
                Números seleccionados:
              </p>
              <div className="flex flex-wrap gap-2">
                {numerosSeleccionados.sort((a, b) => a - b).map(num => (
                  <span
                    key={num}
                    className="px-3 py-1 bg-purple-500 text-white rounded-lg font-bold"
                  >
                    #{num}
                  </span>
                ))}
              </div>
              <p className="text-sm text-purple-700 mt-3">
                Recibirás: <strong>${(tandaData.montoPorRonda * tandaData.totalRondas).toLocaleString()}</strong> por cada número
              </p>
            </div>
          )}
        </div>

        {/* Botón de Enviar */}
        <button
          onClick={enviarRegistro}
          disabled={enviando || numerosSeleccionados.length === 0 || !formData.nombre.trim() || !formData.telefono.trim()}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {enviando ? (
            <span className="flex items-center justify-center gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              Registrando...
            </span>
          ) : (
            '¡Registrarme!'
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}