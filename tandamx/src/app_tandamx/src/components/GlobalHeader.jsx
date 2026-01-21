import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Settings, ChevronDown, Mail, Home, Shield, HelpCircle, List } from 'lucide-react';

// 🔴 IMPORTA TU LOGO AQUÍ
import logoTanda from '../public/assets/logos/logo-tanda-512.png';
import logoTandaSvg from '../public/assets/logos/logo-tanda.svg';

export default function GlobalHeader({ 
  userName, 
  userEmail, 
  onLogout, 
  onOpenSettings,
  onGoHome,           // ← Función para volver a inicio
  showHomeButton,     // ← Mostrar/ocultar botón Home
  currentTandaName    // ← Nombre de la tanda actual (opcional)
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const menuRef = useRef(null);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Obtener iniciales del nombre
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <>
      <div className="bg-white shadow-lg border-b-2 border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            
            {/* ========================================= */}
            {/* SECCIÓN IZQUIERDA: NAVEGACIÓN + LOGO */}
            {/* ========================================= */}
            <div className="flex items-center gap-3">
              
              {/* 🏠 BOTÓN HOME - Visible cuando hay tanda seleccionada */}
              {showHomeButton && onGoHome && (
                <>
                  <button
                    onClick={onGoHome}
                    className="group flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-blue-50 transition-all border border-transparent hover:border-blue-200"
                    title="Volver a Mis Tandas"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center group-hover:from-blue-600 group-hover:to-blue-800 transition-all shadow-sm">
                      <Home className="w-5 h-5 text-blue-700 group-hover:text-white transition-colors" />
                    </div>
                    <div className="hidden md:block">
                      <div className="text-xs text-gray-500 font-medium group-hover:text-blue-600 transition-colors">
                        Volver a
                      </div>
                      <div className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                        Mis Tandas
                      </div>
                    </div>
                  </button>
                  
                  {/* Separador vertical */}
                  <div className="w-px h-10 bg-gray-300"></div>
                </>
              )}

              {/* LOGO Y NOMBRE DE LA APP - CLICKEABLE */}
              <button
                onClick={showHomeButton && onGoHome ? onGoHome : undefined}
                className={`flex items-center gap-3 ${
                  showHomeButton && onGoHome 
                    ? 'cursor-pointer hover:opacity-80 transition-opacity' 
                    : 'cursor-default'
                }`}
                disabled={!showHomeButton || !onGoHome}
              >
                {/* Logo */}
                <div className="w-10 h-10 flex items-center justify-center">
                  <img 
                    src={logoTanda}
                    alt="Tanda App Logo" 
                    className="w-10 h-10 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = logoTandaSvg;
                    }}
                  />
                </div>
                
                {/* Nombre de la App */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-black text-gray-900">
                      Tanda App
                    </span>
                    
                    {/* Badge de tanda activa */}
                    {currentTandaName && (
                      <span className="hidden lg:inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                        <List className="w-3 h-3" />
                        {currentTandaName.length > 15 
                          ? currentTandaName.substring(0, 15) + '...' 
                          : currentTandaName
                        }
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-medium hidden sm:block">
                    Sistema Profesional de Tandas
                  </div>
                </div>
              </button>
            </div>

            {/* ========================================= */}
            {/* SECCIÓN DERECHA: USUARIO Y MENÚ */}
            {/* ========================================= */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200"
                aria-label="Menú de usuario"
              >
                {/* Información del usuario (desktop) */}
                <div className="hidden sm:block text-right mr-2">
                  <div className="text-xs text-gray-500 font-medium">Bienvenido</div>
                  <div className="text-sm font-bold text-gray-800 truncate max-w-[150px]">
                    {userName || 'Usuario'}
                  </div>
                </div>
                
                {/* Avatar con iniciales */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
                  <span className="text-white font-bold text-sm">{getInitials(userName)}</span>
                </div>
                
                {/* Icono chevron */}
                <ChevronDown 
                  className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                    showMenu ? 'rotate-180' : ''
                  }`} 
                />
              </button>

              {/* MENÚ DESPLEGABLE */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden animate-fadeIn">
                  
                  {/* Header del menú con gradiente */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/30">
                        <span className="text-white font-bold text-lg">{getInitials(userName)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{userName || 'Usuario'}</div>
                        <div className="text-xs opacity-90 truncate">{userEmail || 'usuario@email.com'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Opciones del menú */}
                  <div className="py-2">
                    
                    {/* Opción: Ir a Mis Tandas (solo si hay tanda activa) */}
                    {showHomeButton && onGoHome && (
                      <>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            onGoHome();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <Home className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-800">Mis Tandas</div>
                            <div className="text-xs text-gray-500">Ver todas las tandas</div>
                          </div>
                        </button>
                        
                        {/* Separador */}
                        <div className="h-px bg-gray-200 my-2 mx-4"></div>
                      </>
                    )}

                    {/* Opción: Configuración */}
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onOpenSettings();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <Settings className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">Configuración</div>
                        <div className="text-xs text-gray-500">Ajustes de la aplicación</div>
                      </div>
                    </button>

                    {/* Opción: Ayuda y Soporte */}
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowContactModal(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <HelpCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">Ayuda y Soporte</div>
                        <div className="text-xs text-gray-500">Contacta a servicio al cliente</div>
                      </div>
                    </button>

                    {/* Separador */}
                    <div className="h-px bg-gray-200 my-2 mx-4"></div>

                    {/* Opción: Cerrar Sesión */}
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                        <LogOut className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-red-700">Cerrar Sesión</div>
                        <div className="text-xs text-red-500">Salir de tu cuenta</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* MODAL DE CONTACTO Y SOPORTE */}
      {/* ========================================= */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60] animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scaleIn">
            
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Ayuda y Soporte</h2>
                    <p className="text-sm opacity-90">Estamos aquí para ayudarte</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Cerrar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-4">
              
              {/* Email de Soporte */}
              <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200 hover:border-blue-300 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 mb-1">Correo de Soporte</div>
                    <a 
                      href="mailto:tandamx.soporte@gmail.com"
                      className="text-blue-600 font-bold text-sm hover:text-blue-800 hover:underline break-all"
                    >
                      tandamx.soporte@gmail.com
                    </a>
                    <p className="text-xs text-gray-500 mt-1">⏱️ Tiempo de respuesta: 24-48 hrs</p>
                  </div>
                </div>
              </div>

              {/* Divider con texto */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-500">Otras opciones</span>
                </div>
              </div>

              {/* Aviso de Privacidad */}
              <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-800 mb-1">Aviso de Privacidad</div>
                    <a
                      href="https://app-tanda-mx-legal.s3.us-east-1.amazonaws.com/politica_privacidad.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 font-bold text-sm hover:text-purple-800 hover:underline"
                    >
                      Consultar documento completo →
                    </a>
                    <p className="text-xs text-gray-500 mt-1">🔒 Tu información está protegida</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowContactModal(false)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* ESTILOS CSS */}
      {/* ========================================= */}
      <style>{`
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
    </>
  );
}