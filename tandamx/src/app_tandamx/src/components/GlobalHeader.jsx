import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';

export default function GlobalHeader({ userName, onLogout, onOpenSettings }) {
  const [showMenu, setShowMenu] = useState(false);
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

  return (
    <div className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-rose-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="text-lg font-bold text-gray-800">TandasMX</span>
        </div>

        {/* Usuario y Menú */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="hidden sm:block text-right mr-2">
              <div className="text-sm text-gray-600">Bienvenido</div>
              <div className="text-sm font-semibold text-gray-800">{userName}</div>
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-rose-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Menú Desplegable */}
          {showMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 animate-fadeIn">
              {/* Nombre en móvil */}
              <div className="sm:hidden px-4 py-2 border-b border-gray-100">
                <div className="text-xs text-gray-500">Bienvenido</div>
                <div className="text-sm font-semibold text-gray-800">{userName}</div>
              </div>

              {/* Opción: Configuración */}
              <button
                onClick={() => {
                  setShowMenu(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <Settings className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-sm font-medium text-gray-800">Configuración</div>
                  <div className="text-xs text-gray-500">Ajustes de la aplicación</div>
                </div>
              </button>

              {/* Separador */}
              <div className="h-px bg-gray-200 my-2"></div>

              {/* Opción: Cerrar Sesión */}
              <button
                onClick={() => {
                  setShowMenu(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left text-red-600"
              >
                <LogOut className="w-5 h-5" />
                <div>
                  <div className="text-sm font-medium">Cerrar Sesión</div>
                  <div className="text-xs text-red-500">Salir de tu cuenta</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

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
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}