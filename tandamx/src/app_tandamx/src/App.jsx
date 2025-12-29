import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, DollarSign, Calendar, Send, Eye, EyeOff, Home, Settings, Bell, Share2, Check, LogOut, MessageCircle, CreditCard, Shield, CheckCircle, AlertCircle } from 'lucide-react';

// Importar componentes
import DashboardView from './components/DashboardView';
import CrearTandaView from './components/CrearTandaView';
import ParticipantesView from './components/ParticipantesView';
import PagosView from './components/PagosView';
// import NotificacionesView from './components/NotificacionesView'; // TODO: Descomentar cuando se termine de afinar
import ConfiguracionView from './components/ConfiguracionView';
import InicioView from './components/InicioView';
import RegistroPublicoView from './components/RegistroPublicoView';
import GlobalHeader from './components/GlobalHeader';
import ConfiguracionAppView from './components/ConfiguracionAppView';
import LoginView from './components/LoginView';

// ===========================================
// CONFIGURACIÓN DE LA API
// ===========================================
const API_BASE_URL = 'https://9l2vrevqm1.execute-api.us-east-1.amazonaws.com/dev';

const api = {
  getToken: () => localStorage.getItem('authToken'),
  setToken: (token) => localStorage.setItem('authToken', token),
  clearToken: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
  },
  
  getHeaders: () => {
    const token = api.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  },
  
  handleResponse: async (response) => {
    const data = await response.json();
    
    // Detectar token expirado o inválido
    if (response.status === 401 || response.status === 403) {
      // Token expirado - disparar evento global
      window.dispatchEvent(new CustomEvent('token-expired'));
      
      const errorMessage = 'Sesión expirada. Por favor inicia sesión nuevamente.';
      throw new Error(errorMessage);
    }
    
    if (!response.ok) {
      // Log detallado del error
      console.error('❌ Error en API:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        errorData: data
      });
      
      const errorMessage = data.error?.message || data.message || `Error ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }
    return data;
  },
  
  auth: {
    login: async (email, password) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await api.handleResponse(response);
      if (data.success && data.data.token) {
        api.setToken(data.data.token);
        localStorage.setItem('userId', data.data.userId);
        localStorage.setItem('userEmail', data.data.email);
      }
      return data;
    },
    
    register: async (email, password, nombre, telefono) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nombre, telefono })
      });
      const data = await api.handleResponse(response);
      if (data.success && data.data.token) {
        api.setToken(data.data.token);
        localStorage.setItem('userId', data.data.userId);
        localStorage.setItem('userEmail', data.data.email);
      }
      return data;
    },
    
    logout: () => {
      api.clearToken();
    }
  },
  
  tandas: {
    obtener: async (tandaId) => {
      const response = await fetch(`${API_BASE_URL}/tandas/${tandaId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return await api.handleResponse(response);
    },
    
    listar: async () => {
      const response = await fetch(`${API_BASE_URL}/tandas`, {
        method: 'GET',
        headers: api.getHeaders()
      });
      return await api.handleResponse(response);
    }
  },
  
  estadisticas: {
    obtener: async (tandaId) => {
      const response = await fetch(`${API_BASE_URL}/tandas/${tandaId}/estadisticas`, {
        method: 'GET',
        headers: api.getHeaders()
      });
      return await api.handleResponse(response);
    }
  }
};

// ===========================================
// COMPONENTE PRINCIPAL
// ===========================================
export default function TandaManager() {
  const [currentView, setCurrentView] = useState('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [tandaData, setTandaData] = useState(null);
  const [todasLasTandas, setTodasLasTandas] = useState([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [showAppSettings, setShowAppSettings] = useState(false); // Nueva vista de configuración
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');

  // Estados para manejo de sesión
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const lastActivityRef = useRef(Date.now()); // Usar ref en lugar de state

  // Detectar token expirado
  useEffect(() => {
    const handleTokenExpired = () => {
      setSessionExpired(true);
      
      // Si hay actividad reciente (menos de 5 min), mostrar modal
      const inactivityTime = Date.now() - lastActivityRef.current;
      const fiveMinutes = 5 * 60 * 1000;
      
      if (inactivityTime < fiveMinutes && isAdmin) {
        setShowSessionModal(true);
      } else {
        // Logout directo si inactivo o no es admin
        handleSessionExpiredLogout();
      }
    };

    window.addEventListener('token-expired', handleTokenExpired);
    
    return () => {
      window.removeEventListener('token-expired', handleTokenExpired);
    };
  }, [isAdmin]);

  // Detectar actividad del usuario
  useEffect(() => {
    if (!isAdmin) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now(); // Actualizar ref SIN causar re-render
    };

    // Eventos que indican actividad
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
    };
  }, [isAdmin]);

  // Función para logout por sesión expirada
  const handleSessionExpiredLogout = () => {
    api.auth.logout();
    setIsAdmin(false);
    setCurrentView('login');
    setShowSessionModal(false);
    setTandaData(null);
    setTodasLasTandas([]);
    setError('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
  };

  // Función para continuar sesión
  const handleContinueSession = () => {
    setShowSessionModal(false);
    setSessionExpired(false);
    // Usuario decidió continuar, se necesita re-login
    setError('Por favor inicia sesión nuevamente para continuar.');
    handleSessionExpiredLogout();
  };

  useEffect(() => {
    // Detectar si es ruta de registro público usando hash
    const hash = window.location.hash;
    
    // Hash routing: #/registro/token
    if (hash.startsWith('#/registro/')) {
      const token = hash.split('#/registro/')[1];
      setCurrentView('registro');
      setTandaData({ registroToken: token });
      return;
    }
    
    // Detectar si es vista pública de tanda
    const urlParams = new URLSearchParams(window.location.search);
    const tandaId = urlParams.get('tanda');
    
    if (tandaId) {
      setCurrentView('public');
      loadPublicData(tandaId);
    } else {
      const token = api.getToken();
      if (token) {
        setIsAdmin(true);
        setCurrentView('admin');
        loadAdminData();
      }
    }
  }, []);

  const loadPublicData = async (tandaId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.tandas.obtener(tandaId);
      if (result.success) {
        setTandaData(result.data);
      }
    } catch (error) {
      console.error('Error cargando tanda pública:', error);
      setError('Error al cargar la tanda pública');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      console.log('🔄 Cargando tandas del usuario...');
      console.log('🔑 Token presente:', token ? `Sí (${token.substring(0, 20)}...)` : 'NO');
      
      const result = await api.tandas.listar();
      
      console.log('✅ Respuesta recibida:', result);
      
      if (result.success) {
        const tandas = result.data?.tandas || [];
        console.log(`📊 Total de tandas encontradas: ${tandas.length}`);
        
        setTodasLasTandas(tandas);
        
        // Si hay una tanda seleccionada actualmente, cargar sus detalles
        if (tandaData?.tandaId) {
          console.log(`🔄 Recargando tanda seleccionada: ${tandaData.tandaId}`);
          const tandaDetail = await api.tandas.obtener(tandaData.tandaId);
          if (tandaDetail.success) {
            setTandaData(tandaDetail.data);
            // Cargar estadísticas de forma asíncrona sin bloquear
            await loadEstadisticas(tandaDetail.data.tandaId);
          }
        }
        // Si no hay tanda seleccionada, mostrar vista de inicio
        // (NO seleccionar automáticamente la primera)
      } else {
        console.warn('⚠️ Respuesta sin éxito');
        setTodasLasTandas([]);
        setTandaData(null);
      }
    } catch (error) {
      console.error('❌ Error cargando datos del admin:', error);
      setError(`Error al cargar datos: ${error.message}`);
      setTodasLasTandas([]);
      setTandaData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadEstadisticas = async (tandaId) => {
    if (!tandaId) {
      console.warn('No tandaId provided to loadEstadisticas');
      return;
    }
    
    try {
      const result = await api.estadisticas.obtener(tandaId);
      if (result.success) {
        setEstadisticas(result.data.estadisticas);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      // No mostrar error al usuario, las estadísticas son opcionales
      setEstadisticas(null);
    }
  };

  const seleccionarTanda = async (tandaId) => {
    setLoading(true);
    try {
      const tandaDetail = await api.tandas.obtener(tandaId);
      if (tandaDetail.success) {
        setTandaData(tandaDetail.data);
        await loadEstadisticas(tandaId);
        setActiveView('dashboard');
      }
    } catch (error) {
      console.error('Error cargando tanda:', error);
      setError('Error al cargar tanda');
    } finally {
      setLoading(false);
    }
  };

  const crearNuevaTanda = () => {
    setTandaData(null);
    setActiveView('crear');
  };

  const handleLogout = () => {
    api.auth.logout();
    setIsAdmin(false);
    setTandaData(null);
    setCurrentView('login');
    setEmail('');
    setPassword('');
  };

  const handleLoginSuccess = useCallback(async (userData) => {
    // LoginView ya verificó que el token existe, pero hacemos doble check por seguridad
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      console.error('❌ Token no encontrado después de login');
      setError('Error: No se pudo establecer la sesión');
      return;
    }
    
    console.log('✅ Token verificado en localStorage');
    
    setIsAdmin(true);
    setCurrentView('admin');
    setActiveView('inicio');
    setTandaData(null);
    setNombre(userData.nombre || '');
    setEmail(userData.email || '');
    
    await loadAdminData();
  }, [loadAdminData]);

  const copyPublicLink = () => {
    if (!tandaData) return;
    const publicUrl = `${window.location.origin}${window.location.pathname}?tanda=${tandaData.tandaId}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareWhatsApp = () => {
    if (!tandaData) return;
    const publicUrl = `${window.location.origin}${window.location.pathname}?tanda=${tandaData.tandaId}`;
    const mensaje = `¡Únete a nuestra tanda "${tandaData.nombre}"! Consulta el tablero aquí: ${publicUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappUrl, '_blank');
  };

  // ===========================================
  // COMPONENTE DE LOGIN/REGISTRO
  // ===========================================
  
  // ===========================================
  // TABLERO PÚBLICO
  // ===========================================
  const PublicBoard = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      );
    }

    if (!tandaData) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Tanda no encontrada</h2>
            <p className="text-gray-600">No se pudo cargar la información de la tanda</p>
          </div>
        </div>
      );
    }

    // Calcular ronda actual basada en fecha (misma lógica que DashboardView)
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

    const proximoNumero = tandaData.participantes?.find(
      p => p.numeroAsignado === rondaActual
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-6">
            <div className="text-center mb-6">
              <div className="inline-block p-3 bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl mb-4">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-800 mb-2">
                {tandaData.nombre}
              </h1>
              <p className="text-gray-600">Tablero Público</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 text-center">
                <DollarSign className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-800">
                  ${tandaData.montoPorRonda?.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Por Ronda</div>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl p-4 text-center">
                <Calendar className="w-8 h-8 text-rose-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-800">
                  Ronda {rondaActual} / {tandaData.totalRondas}
                </div>
                <div className="text-sm text-gray-600">Progreso</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-4 text-center">
                <Users className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-800">
                  {tandaData.participantes?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Participantes</div>
              </div>
            </div>

            {proximoNumero && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white text-center mb-6">
                <div className="text-sm font-semibold mb-1">Próximo Número</div>
                <div className="text-4xl font-black mb-2">{proximoNumero.numeroAsignado}</div>
                <div className="text-lg">{proximoNumero.nombre}</div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Participantes
            </h2>

            <div className="space-y-3">
              {(tandaData.participantes || [])
                .sort((a, b) => a.numeroAsignado - b.numeroAsignado)
                .map((participante) => {
                  // Verificar si pagó la ronda actual usando el objeto pagos
                  const pagos = participante.pagos || {};
                  const pagoRondaActual = pagos[rondaActual];
                  const pagadoRondaActual = pagoRondaActual && pagoRondaActual.pagado;
                  
                  const esProximo = participante.numeroAsignado === rondaActual;
                  
                  return (
                    <div
                      key={participante.participanteId}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        esProximo
                          ? 'border-green-500 bg-green-50 shadow-md'
                          : 'border-gray-200 bg-gray-50 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${
                            esProximo
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {participante.numeroAsignado}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">{participante.nombre}</div>
                            {esProximo && (
                              <span className="text-sm text-green-600 font-semibold">
                                ← Turno actual
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          {pagadoRondaActual ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Pagado R{rondaActual}
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              Pendiente R{rondaActual}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===========================================
  // PANEL ADMIN
  // ===========================================
  const AdminPanel = () => {
    // Mostrar vista de configuración de app
    if (showAppSettings) {
      return (
        <>
          <GlobalHeader 
            userName={nombre || localStorage.getItem('userEmail')?.split('@')[0] || 'Usuario'}
            onLogout={handleLogout}
            onOpenSettings={() => setShowAppSettings(true)}
          />
          <ConfiguracionAppView
            userData={{ nombre, email, telefono }}
            onBack={() => setShowAppSettings(false)}
            onAccountDeleted={handleLogout}
          />
        </>
      );
    }

    if (loading && !tandaData && todasLasTandas.length === 0) {
      return (
        <>
          <GlobalHeader 
            userName={nombre || localStorage.getItem('userEmail')?.split('@')[0] || 'Usuario'}
            onLogout={handleLogout}
            onOpenSettings={() => setShowAppSettings(true)}
          />
          <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando datos...</p>
            </div>
          </div>
        </>
      );
    }

    // Vista de Crear Tanda (cuando activeView === 'crear')
    if (activeView === 'crear') {
      return (
        <>
          <GlobalHeader 
            userName={nombre || localStorage.getItem('userEmail')?.split('@')[0] || 'Usuario'}
            onLogout={handleLogout}
            onOpenSettings={() => setShowAppSettings(true)}
          />
          <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
            <div className="max-w-7xl mx-auto p-4 md:p-8 pt-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Crear Nueva Tanda</h1>
                  <p className="text-sm text-gray-600">Configura los detalles de tu nueva tanda</p>
                </div>
                <button
                  onClick={() => {
                    setActiveView('inicio');
                    loadAdminData();
                  }}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm"
                >
                  Cancelar
                </button>
              </div>
              <CrearTandaView 
                setTandaData={setTandaData} 
                setLoading={setLoading} 
                setError={setError} 
                loadAdminData={loadAdminData}
                setActiveView={setActiveView}
              />
            </div>
          </div>
        </>
      );
    }

    // Vista de Inicio (cuando no hay tanda seleccionada)
    if (!tandaData) {
      return (
        <>
          <GlobalHeader 
            userName={nombre || localStorage.getItem('userEmail')?.split('@')[0] || 'Usuario'}
            onLogout={handleLogout}
            onOpenSettings={() => setShowAppSettings(true)}
          />
          <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
            <div className="max-w-7xl mx-auto p-4 md:p-8 pt-8">
              <InicioView 
                tandas={todasLasTandas}
                setActiveView={setActiveView}
                onSeleccionarTanda={seleccionarTanda}
                onCrearNueva={crearNuevaTanda}
              />
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <GlobalHeader 
          userName={nombre || localStorage.getItem('userEmail')?.split('@')[0] || 'Usuario'}
          onLogout={handleLogout}
          onOpenSettings={() => setShowAppSettings(true)}
        />
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
          {/* Header de Tanda */}
          <div className="bg-white shadow-md border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {/* Botón Volver a Inicio */}
                <button
                  onClick={() => {
                    setTandaData(null);
                    setActiveView('inicio');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                  title="Volver a Inicio"
                >
                  <Home className="w-5 h-5 text-gray-600 group-hover:text-orange-600" />
                </button>
                
                <div className="w-px h-8 bg-gray-300"></div>
                
                <div className="p-2 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-800">{tandaData.nombre}</h1>
                  <p className="text-xs text-gray-600">Gestión de tanda</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
                <button
                  onClick={copyPublicLink}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold text-xs"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  <span className="hidden sm:inline">{copiedLink ? 'Copiado' : 'Compartir'}</span>
                </button>
              </div>
            </div>
          </div>

        {/* Navigation Tabs - Solo las 4 pestañas de gestión */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto">
              {[
                { id: 'dashboard', label: 'Resumen', icon: Calendar },
                { id: 'participantes', label: 'Participantes', icon: Users },
                { id: 'pagos', label: 'Pagos', icon: CreditCard },
                // { id: 'notificaciones', label: 'Recordatorios', icon: Send }, // TODO: Descomentar cuando esté listo
                { id: 'configuracion', label: 'Configuración', icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-semibold transition-all whitespace-nowrap ${
                      activeView === item.id
                        ? 'text-orange-600 border-b-2 border-orange-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {activeView === 'dashboard' && <DashboardView tandaData={tandaData} estadisticas={estadisticas} />}
          {activeView === 'participantes' && <ParticipantesView tandaData={tandaData} setTandaData={setTandaData} loadAdminData={loadAdminData} />}
          {activeView === 'pagos' && <PagosView tandaData={tandaData} setTandaData={setTandaData} loadAdminData={loadAdminData} />}
          {/* TODO: Descomentar cuando NotificacionesView esté listo */}
          {/* {activeView === 'notificaciones' && <NotificacionesView tandaData={tandaData} />} */}
          {activeView === 'configuracion' && <ConfiguracionView tandaData={tandaData} setTandaData={setTandaData} loadAdminData={loadAdminData} setActiveView={setActiveView} />}
        </div>
      </div>
    </>
    );
  };

  // ===========================================
  // RENDER PRINCIPAL
  // ===========================================
  
  // Vista de registro público (sin autenticación)
  if (currentView === 'registro') {
    return <RegistroPublicoView token={tandaData?.registroToken} />;
  }
  
  if (currentView === 'public') {
    return <PublicBoard />;
  }

  if (currentView === 'admin' && isAdmin) {
    return (
      <>
        <AdminPanel />
        
        {/* Modal de Sesión Expirada */}
        {showSessionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-fadeIn">
              <div className="text-center mb-6">
                <div className="inline-block p-4 bg-yellow-100 rounded-full mb-4">
                  <AlertCircle className="w-12 h-12 text-yellow-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Sesión Expirada
                </h3>
                <p className="text-gray-600">
                  Tu sesión ha expirado por seguridad. ¿Deseas continuar trabajando?
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleContinueSession}
                  className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Iniciar Sesión Nuevamente
                </button>
                
                <button
                  onClick={handleSessionExpiredLogout}
                  className="w-full py-3 px-4 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                >
                  Cerrar Sesión
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                Por tu seguridad, cerramos sesiones automáticamente después de un período de inactividad.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return <LoginView onLoginSuccess={handleLoginSuccess} />;
}