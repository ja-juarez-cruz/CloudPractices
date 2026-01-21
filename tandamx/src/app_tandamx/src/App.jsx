import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Calendar, CreditCard, Settings, Share2, Check, MessageCircle, AlertCircle, CheckCircle, ArrowLeft, Menu, X } from 'lucide-react';

// Importar componentes
import DashboardView from './components/DashboardView';
import CrearTandaView from './components/CrearTandaView';
import ParticipantesView from './components/ParticipantesView';
import PagosView from './components/PagosView';
import ConfiguracionView from './components/ConfiguracionView';
import InicioView from './components/InicioView';
import RegistroPublicoView from './components/RegistroPublicoView';
import GlobalHeader from './components/GlobalHeader';
import ConfiguracionAppView from './components/ConfiguracionAppView';
import LoginView from './components/LoginView';
import PublicBoard from './components/PublicBoard';
import RegistroCumpleView from './components/RegistroCumpleanosView'
import DeleteAccountView from './components/DeleteAccountView';

// Importar logos
import logoTanda from './public/assets/logos/logo-tanda-512.png';
import logoTandaSvg from './public/assets/logos/logo-tanda.svg';

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
    localStorage.removeItem('userName');
    localStorage.removeItem('activeView');
    localStorage.removeItem('selectedTandaId');
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
    
    if (response.status === 401 || response.status === 403) {
      window.dispatchEvent(new CustomEvent('token-expired'));
      throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
    }
    
    if (!response.ok) {
      console.error('❌ Error en API:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        errorData: data
      });
      
      const errorMessage = data.error?.message || data.message || `Error ${response.status}`;
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
        localStorage.setItem('userName', data.data.nombre);
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
        localStorage.setItem('userName', data.data.nombre);
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
  // ========== ESTADOS PRINCIPALES ==========
  const [currentView, setCurrentView] = useState('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [tandaData, setTandaData] = useState(null);
  const [todasLasTandas, setTodasLasTandas] = useState([]);
  const [activeView, setActiveView] = useState('inicio');
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Estados de usuario
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // Estados para manejo de sesión
  const [showSessionModal, setShowSessionModal] = useState(false);
  const lastActivityRef = useRef(Date.now());

  
  // ========== PERSISTENCIA DE ESTADO ==========
  useEffect(() => {
    if (isAdmin && tandaData?.tandaId) {
      localStorage.setItem('selectedTandaId', tandaData.tandaId);
      localStorage.setItem('activeView', activeView);
    }
  }, [activeView, tandaData?.tandaId, isAdmin]);


  // ========== DETECCIÓN DE URL PARAMS ==========
  useEffect(() => {
    const hash = window.location.hash;
    
    // 🆕 PRIORIDAD 0: DELETE ACCOUNT (antes que todo)
    if (hash === '#/delete-account') {
      console.log('🗑️ Detectada ruta de eliminación de cuenta');
      setCurrentView('delete-account');
      setIsAdmin(false);
      return;
    }

    
    // 🆕 PRIORIDAD 1: REGISTRO CUMPLEAÑERO
    if (hash.startsWith('#/registro-cumple/')) {
      const token = hash.split('#/registro-cumple/')[1];
      console.log('🎂 Detectada ruta de registro cumpleañero, token:', token);
      setCurrentView('registro-cumple');
      setTandaData({ registroToken: token });
      setIsAdmin(false); // 🔧 IMPORTANTE: Forzar que no esté en modo admin
      return; // 🔧 IMPORTANTE: Salir inmediatamente
    }
    
    // PRIORIDAD 2: REGISTRO NORMAL
    if (hash.startsWith('#/registro/')) {
      const token = hash.split('#/registro/')[1];
      console.log('📝 Detectada ruta de registro normal, token:', token);
      setCurrentView('registro');
      setTandaData({ registroToken: token });
      setIsAdmin(false); // 🔧 IMPORTANTE: Forzar que no esté en modo admin
      return; // 🔧 IMPORTANTE: Salir inmediatamente
    }
    
    // PRIORIDAD 3: TABLERO PÚBLICO
    const urlParams = new URLSearchParams(window.location.search);
    const tandaId = urlParams.get('tanda');
    
    if (tandaId) {
      console.log('📊 Detectada ruta pública, tandaId:', tandaId);
      setCurrentView('public');
      loadPublicData(tandaId);
      setIsAdmin(false); // 🔧 IMPORTANTE: Forzar que no esté en modo admin
      return;
    }
    
    // PRIORIDAD 4: RESTAURAR SESIÓN (solo si no hay rutas públicas)
    const restoreState = async () => {
      const token = api.getToken();
      const savedView = localStorage.getItem('activeView');
      const savedTandaId = localStorage.getItem('selectedTandaId');
      const savedUserName = localStorage.getItem('userName');
      const savedUserEmail = localStorage.getItem('userEmail');

      if (token && savedUserName && savedUserEmail) {
        setIsAdmin(true);
        setCurrentView('admin');
        setUserName(savedUserName);
        setUserEmail(savedUserEmail);

        // Restaurar vista activa
        if (savedView && savedView !== 'inicio' && savedView !== 'crear') {
          setActiveView(savedView);
        } else {
          setActiveView('inicio');
        }

        // Cargar todas las tandas
        await loadAdminData();

        // Si había una tanda seleccionada, restaurarla
        if (savedTandaId && savedView !== 'inicio') {
          await seleccionarTanda(savedTandaId, false);
        }
      }
    };

    restoreState();
  }, []);
  
  // ========== DETECCIÓN DE TOKEN EXPIRADO ==========
  useEffect(() => {
    const handleTokenExpired = () => {
      const inactivityTime = Date.now() - lastActivityRef.current;
      const fiveMinutes = 5 * 60 * 1000;
      
      if (inactivityTime < fiveMinutes && isAdmin) {
        setShowSessionModal(true);
      } else {
        handleSessionExpiredLogout();
      }
    };

    window.addEventListener('token-expired', handleTokenExpired);
    
    return () => {
      window.removeEventListener('token-expired', handleTokenExpired);
    };
  }, [isAdmin]);

  // ========== DETECCIÓN DE ACTIVIDAD ==========
  useEffect(() => {
    if (!isAdmin) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

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

  // ========== FUNCIONES DE CARGA DE DATOS ==========
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
      const result = await api.tandas.listar();
      
      if (result.success) {
        const tandas = result.data?.tandas || [];
        setTodasLasTandas(tandas);
        
        // Si hay una tanda cargada actualmente, refrescar sus datos
        if (tandaData?.tandaId) {
          const tandaDetail = await api.tandas.obtener(tandaData.tandaId);
          if (tandaDetail.success) {
            setTandaData(tandaDetail.data);
            await loadEstadisticas(tandaDetail.data.tandaId);
          }
        }
      } else {
        setTodasLasTandas([]);
      }
    } catch (error) {
      console.error('❌ Error cargando datos del admin:', error);
      setError(`Error al cargar datos: ${error.message}`);
      setTodasLasTandas([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEstadisticas = async (tandaId) => {
    if (!tandaId) return;
    
    try {
      const result = await api.estadisticas.obtener(tandaId);
      if (result.success) {
        setEstadisticas(result.data.estadisticas);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setEstadisticas(null);
    }
  };

  // ========== RECARGAR DATOS AL CAMBIAR VISTA ==========
  useEffect(() => {
    if (tandaData?.tandaId && ['dashboard', 'participantes', 'pagos'].includes(activeView)) {
      const recargarDatos = async () => {
        try {
          const tandaDetail = await api.tandas.obtener(tandaData.tandaId);
          if (tandaDetail.success) {
            setTandaData(tandaDetail.data);
            
            if (activeView === 'dashboard') {
              await loadEstadisticas(tandaDetail.data.tandaId);
            }
          }
        } catch (error) {
          console.error('Error recargando datos:', error);
        }
      };
      
      recargarDatos();
    }
  }, [activeView]);

  // ========== FUNCIONES DE NAVEGACIÓN ==========
  const seleccionarTanda = async (tandaId, cambiarVista = true) => {
    setLoading(true);
    try {
      const tandaDetail = await api.tandas.obtener(tandaId);
      if (tandaDetail.success) {
        setTandaData(tandaDetail.data);
        await loadEstadisticas(tandaId);
        if (cambiarVista) {
          setActiveView('dashboard');
        }
        setShowMobileMenu(false);
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
    setShowMobileMenu(false);
  };

  const volverAInicio = () => {
    setTandaData(null);
    setActiveView('inicio');
    localStorage.removeItem('selectedTandaId');
    localStorage.removeItem('activeView');
    setShowMobileMenu(false);
  };

  // ========== FUNCIONES DE AUTENTICACIÓN ==========
  const handleLogout = () => {
    api.auth.logout();
    setIsAdmin(false);
    setTandaData(null);
    setCurrentView('login');
    setUserName('');
    setUserEmail('');
    setUserPhone('');
  };

  const handleLoginSuccess = useCallback(async (userData) => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      console.error('❌ Token no encontrado después de login');
      setError('Error: No se pudo establecer la sesión');
      return;
    }
    
    setIsAdmin(true);
    setCurrentView('admin');
    setActiveView('inicio');
    setTandaData(null);
    setUserName(userData.nombre || '');
    setUserEmail(userData.email || '');
    
    await loadAdminData();
  }, []);

  const handleSessionExpiredLogout = () => {
    api.auth.logout();
    setIsAdmin(false);
    setCurrentView('login');
    setShowSessionModal(false);
    setTandaData(null);
    setTodasLasTandas([]);
    setError('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
  };

  const handleContinueSession = () => {
    setShowSessionModal(false);
    setError('Por favor inicia sesión nuevamente para continuar.');
    handleSessionExpiredLogout();
  };

  // ========== HANDLER PARA TANDA CREADA ==========
  const handleTandaCreada = useCallback((nuevaTanda) => {
    console.log('✅ Tanda creada exitosamente:', nuevaTanda);
    setTandaData(nuevaTanda);
    setActiveView('participantes');
    loadAdminData(); // Recargar lista de tandas
  }, []);

  // ===========================================
  // BOTTOM NAVIGATION COMPONENT
  // ===========================================
  const BottomNavigation = () => {
    const navItems = [
      { id: 'dashboard', label: 'Resumen', icon: Calendar },
      { id: 'participantes', label: 'Participantes', icon: Users },
      { id: 'pagos', label: 'Pagos', icon: CreditCard },
      { id: 'configuracion', label: 'Config', icon: Settings },
    ];

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-40 safe-bottom">
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setShowMobileMenu(false);
                  }}
                  className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${
                    isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {/* Indicador superior */}
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600 rounded-b-full"></div>
                  )}
                  
                  {/* Ícono con efecto */}
                  <div className={`relative ${isActive ? 'transform -translate-y-1' : ''}`}>
                    <Icon className={`w-6 h-6 transition-all ${
                      isActive ? 'scale-110' : ''
                    }`} />
                    
                    {/* Badge de notificación (ejemplo) */}
                    {item.id === 'pagos' && isActive && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                    )}
                  </div>
                  
                  {/* Label */}
                  <span className={`text-xs mt-1 font-medium ${
                    isActive ? 'font-bold' : ''
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ===========================================
  // PANEL ADMIN
  // ===========================================
  const AdminPanel = () => {
    // Vista de configuración de app
    if (showAppSettings) {
      return (
        <>
          <GlobalHeader 
            userName={userName}
            userEmail={userEmail}
            onLogout={handleLogout}
            onOpenSettings={() => setShowAppSettings(true)}
            onGoHome={volverAInicio}
            showHomeButton={tandaData !== null}
            currentTandaName={tandaData?.nombre}
          />
          <div className="pb-20">
            <ConfiguracionAppView
              userData={{ nombre: userName, email: userEmail, telefono: userPhone }}
              onBack={() => setShowAppSettings(false)}
              onAccountDeleted={handleLogout}
              onGoHome={volverAInicio}
              showHomeButton={tandaData !== null}
              currentTandaName={tandaData?.nombre}
            />
          </div>
        </>
      );
    }

    // Vista de Crear Tanda
    if (activeView === 'crear') {
      return (
        <>
          <GlobalHeader 
            userName={userName}
            userEmail={userEmail}
            onLogout={handleLogout}
            onOpenSettings={() => setShowAppSettings(true)}
            onGoHome={volverAInicio}
            showHomeButton={tandaData !== null}
            currentTandaName={tandaData?.nombre}
          />
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-slate-50 pb-20">
            <div className="max-w-7xl mx-auto p-4 md:p-8 pt-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Crear Nueva Tanda</h1>
                  <p className="text-sm text-gray-600">Configura los detalles de tu nueva tanda</p>
                </div>
                <button
                  onClick={volverAInicio}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
              <CrearTandaView
                setTandaData={handleTandaCreada}
                setActiveView={setActiveView}
                setLoading={setLoading}
                setError={setError}
                loadAdminData={loadAdminData}
              />
            </div>
          </div>
        </>
      );
    }

    // Vista de Inicio (sin tanda seleccionada)
    if (!tandaData || activeView === 'inicio') {
      return (
        <>
          <GlobalHeader 
            userName={userName}
            userEmail={userEmail}
            onLogout={handleLogout}
            onOpenSettings={() => setShowAppSettings(true)}
            onGoHome={volverAInicio}
            showHomeButton={tandaData !== null}
            currentTandaName={tandaData?.nombre}
          />
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-slate-50 pb-20">
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

    // Vista principal con tanda seleccionada
    return (
      <>
        {/* Header Global */}
        <GlobalHeader 
          userName={userName}
          userEmail={userEmail}
          onLogout={handleLogout}
          onOpenSettings={() => setShowAppSettings(true)}
          onGoHome={volverAInicio}
          showHomeButton={tandaData !== null}
          currentTandaName={tandaData?.nombre}
        />

        {/* Content con padding inferior para el bottom nav */}
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-slate-50 pb-24">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            {activeView === 'dashboard' && <DashboardView tandaData={tandaData} estadisticas={estadisticas} onCrearTanda={crearNuevaTanda} />}
            {activeView === 'participantes' && <ParticipantesView tandaData={tandaData} setTandaData={setTandaData} loadAdminData={loadAdminData} />}
            {activeView === 'pagos' && <PagosView tandaData={tandaData} setTandaData={setTandaData} loadAdminData={loadAdminData} />}
            {activeView === 'configuracion' && <ConfiguracionView tandaData={tandaData} setTandaData={setTandaData} loadAdminData={loadAdminData} setActiveView={setActiveView} />}
          </div>
        </div>

        {/* Bottom Navigation - Solo visible cuando hay tanda */}
        <BottomNavigation />
      </>
    );
  };

  // ===========================================
  // RENDER PRINCIPAL
  // ===========================================

  // ========== VISTA DE REGISTRO CUMPLEAÑERO ========== 🆕
  if (currentView === 'registro-cumple') {
    return <RegistroCumpleView token={tandaData?.registroToken} />;
  }
  
  // ========== VISTA DE ELIMINACIÓN DE CUENTA ========== 🆕
  if (currentView === 'delete-account') {
    return <DeleteAccountView />;
  }
  
  // ========== VISTA DE REGISTRO PÚBLICO ==========
  if (currentView === 'registro') {
    return <RegistroPublicoView token={tandaData?.registroToken} />;
  }
  
  // ========== VISTA PÚBLICA - TABLERO ==========
  if (currentView === 'public') {
    return (
      <PublicBoard 
        tandaData={tandaData} 
        loading={loading} 
      />
    );
  }

  // ========== VISTA ADMIN ==========
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
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Sesión Expirada</h3>
                <p className="text-gray-600">
                  Tu sesión ha expirado por seguridad. ¿Deseas continuar trabajando?
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleContinueSession}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
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

  // ========== VISTA LOGIN (DEFAULT) ==========
  return <LoginView onLoginSuccess={handleLoginSuccess} />;
}

// ===========================================
// ESTILOS CSS GLOBALES
// ===========================================
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out;
    }

    /* Safe area para dispositivos con notch */
    .safe-bottom {
      padding-bottom: env(safe-area-inset-bottom);
    }

    /* Smooth scroll */
    html {
      scroll-behavior: smooth;
    }

    /* Prevenir scroll horizontal */
    body {
      overflow-x: hidden;
    }
  `;
  if (!document.querySelector('style[data-app-styles]')) {
    style.setAttribute('data-app-styles', 'true');
    document.head.appendChild(style);
  }
}