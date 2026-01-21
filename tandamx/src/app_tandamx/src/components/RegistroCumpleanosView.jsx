import React, { useState, useEffect } from 'react';
import { Gift, Calendar, Phone, User, Mail, Cake, PartyPopper, Sparkles, Heart, AlertCircle, CheckCircle, ArrowRight, Info, HelpCircle, X, ExternalLink } from 'lucide-react';

const API_BASE_URL = 'https://9l2vrevqm1.execute-api.us-east-1.amazonaws.com/dev';
const BASE_URL_ESTATIC_WEB = 'https://app-tandamx.s3.us-east-1.amazonaws.com';

export default function RegistroCumpleanosView() {
  const [token, setToken] = useState('');
  const [tandaData, setTandaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [numeroAsignado, setNumeroAsignado] = useState(null);
  const [tandaId, setTandaId] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    fechaCumpleaños: ''
  });

  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    console.log('🔍 Hash en RegistroCumpleanosView:', hash);
    
    if (hash.startsWith('#/registro-cumple/')) {
      const tokenFromUrl = hash.split('#/registro-cumple/')[1];
      console.log('🎂 Token extraído:', tokenFromUrl);
      
      if (tokenFromUrl) {
        setToken(tokenFromUrl);
        cargarDatosTanda(tokenFromUrl);
      } else {
        console.error('❌ Token vacío');
        setError('Link de registro inválido - Token vacío');
        setLoading(false);
      }
    } else {
      console.error('❌ Hash no coincide:', hash);
      setError('Link de registro inválido - Hash incorrecto');
      setLoading(false);
    }
  }, []);

  const cargarDatosTanda = async (tokenRegistro) => {
    try {
      const response = await fetch(`${API_BASE_URL}/registro/${tokenRegistro}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al cargar información');
      }

      if (data.success) {
        setTandaData(data.data);
        setTandaId(data.data.tandaId);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'No se pudo cargar la información de la tanda');
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!aceptaPrivacidad) {
        throw new Error('Debes aceptar el Aviso de Privacidad para continuar');
      }

      if (!formData.nombre.trim()) {
        throw new Error('El nombre es requerido');
      }
      
      if (!formData.telefono || formData.telefono.length !== 10) {
        throw new Error('El teléfono debe tener 10 dígitos');
      }

      if (!formData.fechaCumpleaños) {
        throw new Error('La fecha de cumpleaños es requerida');
      }

      const response = await fetch(`${API_BASE_URL}/registro/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          telefono: formData.telefono,
          email: formData.email || undefined,
          fechaCumpleaños: formData.fechaCumpleaños
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al registrarse');
      }

      if (data.success) {
        setNumeroAsignado(data.data.numeroAsignado);
        setTandaId(data.data.tandaId);
        setSuccess(true);
        setConfetti(true);
        
        setTimeout(() => setConfetti(false), 5000);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Error al completar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  const irAlTableroPublico = () => {
    if (tandaId) {
      window.location.href = `${BASE_URL_ESTATIC_WEB}/index.html?tanda=${tandaId}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (error && !tandaData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const participantesRegistrados = tandaData?.participantes?.length || 0;
  const totalRondas = tandaData?.totalRondas || 0;
  const cupoCompleto = participantesRegistrados >= totalRondas;

  if (cupoCompleto && tandaData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">¡Cupo Completo! 🎉</h2>
          <p className="text-gray-600 mb-6">
            Lo sentimos, esta tanda ya alcanzó el número máximo de participantes ({tandaData.totalRondas}).
          </p>
          
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Tanda:</strong> {tandaData.nombre}
            </p>
            <p className="text-sm text-blue-800 mt-2">
              <strong>Participantes:</strong> {participantesRegistrados} de {tandaData.totalRondas}
            </p>
          </div>

          <button
            onClick={irAlTableroPublico}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            Ver Tablero de la Tanda
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-xs text-gray-500 mt-4">
            Puedes ver el estado de la tanda en el tablero público
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-4 relative overflow-hidden">
        {confetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`
                }}
              >
                {['🎉', '🎂', '🎈', '🎁', '✨', '🎊'][Math.floor(Math.random() * 6)]}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center relative">
          <div className="absolute -top-4 -left-4 text-6xl animate-bounce">🎈</div>
          <div className="absolute -top-4 -right-4 text-6xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎈</div>
          
          <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-3xl font-black text-gray-800 mb-2">¡Registro Exitoso! 🎉</h2>
          
          <div className="my-8 p-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border-2 border-pink-200">
            <p className="text-sm text-gray-600 mb-2">
              Tu número asignado <span className="font-bold text-pink-600">por el momento</span> es:
            </p>
            <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg transform hover:scale-110 transition-transform">
              <span className="text-4xl font-black">{numeroAsignado}</span>
            </div>
            <p className="text-xs text-gray-500 mt-3">Asignado automáticamente por tu fecha de cumpleaños</p>
          </div>

          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-bold text-amber-800 mb-2">⚠️ Importante: Tu número puede cambiar</p>
                <p className="text-xs text-amber-700">
                  El número que ves arriba es <span className="font-bold">temporal</span>. 
                  Se recalculará automáticamente cuando se registren más participantes.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={irAlTableroPublico}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl font-black text-lg hover:shadow-2xl hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-3"
          >
            Ver Tablero de la Tanda
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        <style>{`
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          .animate-confetti {
            animation: confetti linear forwards;
            font-size: 2rem;
          }
        `}</style>
      </div>
    );
  }

  const montoPorRonda = tandaData?.montoPorRonda || 0;
  const totalARecibir = montoPorRonda * (totalRondas - 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 py-8 px-4 relative overflow-hidden">
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-white rounded-full shadow-lg mb-4 animate-pulse">
            <Gift className="w-12 h-12 text-pink-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-2">🎂 Tanda Cumpleañera</h1>
          <p className="text-xl text-gray-700 font-semibold">{tandaData?.nombre}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl border-2 border-pink-200">
              <Cake className="w-8 h-8 text-pink-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Aportación</p>
              <p className="text-2xl font-black text-pink-600">${montoPorRonda.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">por cumpleaños</p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border-2 border-purple-200">
              <PartyPopper className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Participantes</p>
              <p className="text-2xl font-black text-purple-600">{participantesRegistrados} / {totalRondas}</p>
              <p className="text-xs text-gray-500 mt-1">registrados</p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200">
              <Sparkles className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Recibirás</p>
              <p className="text-2xl font-black text-blue-600">${totalARecibir.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">en tu cumpleaños</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-2xl p-4 mb-8">
            <button
              type="button"
              onClick={() => setShowInfoModal(true)}
              className="w-full flex items-center justify-center gap-3 text-pink-700 hover:text-pink-900 transition-colors"
            >
              <HelpCircle className="w-6 h-6" />
              <span className="font-bold text-sm">¿Cómo funciona la Tanda Cumpleañera?</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <User className="w-4 h-4 text-pink-500" />
                Nombre Completo *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Juan Pérez García"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <Phone className="w-4 h-4 text-purple-500" />
                Teléfono (WhatsApp) *
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="5512345678"
                pattern="[0-9]{10}"
                maxLength="10"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
              />
              <p className="mt-1.5 text-xs text-gray-500">📱 10 dígitos sin espacios</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <Mail className="w-4 h-4 text-blue-500" />
                Email (opcional)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.com"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-pink-500" />
                Fecha de Cumpleaños *
              </label>
              <input
                type="date"
                name="fechaCumpleaños"
                value={formData.fechaCumpleaños}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all"
              />
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceptaPrivacidad}
                  onChange={(e) => setAceptaPrivacidad(e.target.checked)}
                  className="mt-1 w-5 h-5 text-pink-600 border-gray-300 rounded"
                  required
                />
                <span className="text-xs text-gray-700">
                  Acepto el{' '}
                  <a
                    href="https://app-tanda-mx-legal.s3.us-east-1.amazonaws.com/politica_privacidad.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 font-bold hover:underline"
                  >
                    Aviso de Privacidad
                  </a>
                  {' '}y autorizo el uso de mis datos.
                </span>
              </label>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-semibold">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !aceptaPrivacidad}
              className="w-full py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white rounded-xl font-black text-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {submitting ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  Registrando...
                </>
              ) : (
                <>
                  <Gift className="w-6 h-6" />
                  ¡Unirme a la Tanda! 🎉
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {showInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="w-8 h-8" />
                  <h3 className="text-xl font-bold">¿Cómo funciona?</h3>
                </div>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🎂</span>
                  <div>
                    <h4 className="font-bold text-pink-900 mb-1">Recibes en tu cumpleaños</h4>
                    <p className="text-sm text-pink-800">
                      Los demás participantes te dan ${montoPorRonda.toLocaleString()} cada uno.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">💝</span>
                  <div>
                    <h4 className="font-bold text-purple-900 mb-1">Das en cada cumpleaños</h4>
                    <p className="text-sm text-purple-800">
                      Tú darás ${montoPorRonda.toLocaleString()} a cada persona en su cumpleaños.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🎁</span>
                  <div>
                    <h4 className="font-bold text-blue-900 mb-1">Número automático</h4>
                    <p className="text-sm text-blue-800">
                      Tu número se asigna según tu fecha de cumpleaños.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowInfoModal(false)}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-bold"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}