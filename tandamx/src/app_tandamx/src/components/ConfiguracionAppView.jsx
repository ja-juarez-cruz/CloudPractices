import React, { useState } from 'react';
import { User, Mail, Phone, Trash2, AlertTriangle, Shield, ChevronLeft, X, Info } from 'lucide-react';

const API_BASE_URL = 'https://9l2vrevqm1.execute-api.us-east-1.amazonaws.com/dev';

export default function ConfiguracionAppView({ userData, onBack, onAccountDeleted }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmacionTexto, setConfirmacionTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleEliminarCuenta = async () => {
    if (confirmacionTexto !== 'ELIMINAR') {
      setError('Debes escribir "ELIMINAR" en mayúsculas para confirmar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/auth/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al eliminar la cuenta');
      }

      if (data.success) {
        localStorage.clear();
        onAccountDeleted();
      }
    } catch (error) {
      console.error('Error eliminando cuenta:', error);
      setError(error.message || 'Error al eliminar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-slate-50 py-6 md:py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header con botón de regreso */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-700 hover:text-blue-600 mb-4 md:mb-6 font-semibold transition-colors text-sm md:text-base"
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          Volver
        </button>

        {/* Título Mejorado */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-6 text-white mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
              <Shield className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-bold mb-1">Configuración de Cuenta</h1>
              <p className="text-xs md:text-sm text-blue-100">Administra tu cuenta y preferencias</p>
            </div>
          </div>
        </div>

        {/* Información del Usuario */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-100 p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <User className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            </div>
            <h2 className="text-base md:text-xl font-bold text-gray-800">Información de la Cuenta</h2>
          </div>

          <div className="space-y-3">
            {/* Nombre */}
            <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
              <div className="p-2 bg-white rounded-lg flex-shrink-0">
                <User className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs md:text-sm text-gray-600 mb-1">Nombre</div>
                <div className="text-sm md:text-base font-semibold text-gray-800 truncate">
                  {userData?.nombre || 'Usuario'}
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
              <div className="p-2 bg-white rounded-lg flex-shrink-0">
                <Mail className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs md:text-sm text-gray-600 mb-1">Correo Electrónico</div>
                <div className="text-sm md:text-base font-semibold text-gray-800 truncate">
                  {userData?.email || localStorage.getItem('userEmail') || 'No disponible'}
                </div>
              </div>
            </div>

            {/* Teléfono */}
            {userData?.telefono && (
              <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                <div className="p-2 bg-white rounded-lg flex-shrink-0">
                  <Phone className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs md:text-sm text-gray-600 mb-1">Teléfono</div>
                  <div className="text-sm md:text-base font-semibold text-gray-800">
                    {userData.telefono}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nota Informativa */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs md:text-sm text-blue-800 flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Esta información se utiliza para identificarte en la aplicación y para las notificaciones de tus tandas.
              </span>
            </p>
          </div>
        </div>

        {/* Zona de Peligro */}
        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl md:rounded-2xl shadow-lg border-2 border-red-300 p-4 md:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-xl font-bold text-red-800 mb-2">Zona de Peligro</h2>
              <p className="text-xs md:text-sm text-red-700">
                Las acciones en esta sección son <strong>permanentes e irreversibles</strong>.
              </p>
            </div>
          </div>

          <div className="bg-white border-2 border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-gray-800 text-sm md:text-base">Eliminar Cuenta</h3>
            </div>
            
            <p className="text-xs md:text-sm text-gray-700 mb-3">
              Al eliminar tu cuenta se eliminarán <strong>permanentemente</strong>:
            </p>
            
            <ul className="text-xs md:text-sm text-gray-700 space-y-1 mb-4 ml-4 list-disc">
              <li>Todas tus tandas (activas e inactivas)</li>
              <li>Todos los participantes de tus tandas</li>
              <li>Todo el historial de pagos</li>
              <li>Toda tu información personal</li>
              <li>Todas las configuraciones</li>
            </ul>
            
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-xs md:text-sm font-bold text-red-600 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Esta acción NO se puede deshacer. Una vez eliminada, no podrás recuperar tu cuenta ni tu información.</span>
              </p>
            </div>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 hover:shadow-lg transition-all font-semibold text-sm md:text-base"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Mi Cuenta
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn">
            <div className="p-4 md:p-6">
              {/* Header del Modal */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-xl flex-shrink-0">
                  <AlertTriangle className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800">
                    ¿Eliminar tu cuenta?
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600">
                    Esta acción es permanente e irreversible
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmacionTexto('');
                    setError(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Advertencia Principal */}
              <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-xl">
                <p className="text-sm md:text-base text-red-800 font-bold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  ADVERTENCIA: Acción Irreversible
                </p>
                <p className="text-xs md:text-sm text-red-700 mb-3">
                  Se eliminarán <strong>permanentemente</strong>:
                </p>
                <ul className="text-xs md:text-sm text-red-700 space-y-1 ml-4 list-disc">
                  <li><strong>Tu cuenta completa</strong></li>
                  <li><strong>Todas tus tandas</strong> (activas e inactivas)</li>
                  <li><strong>Todos los participantes</strong> de tus tandas</li>
                  <li><strong>Todo el historial de pagos</strong></li>
                  <li><strong>Toda tu información personal</strong></li>
                </ul>
                <p className="text-xs md:text-sm text-red-800 font-bold mt-3">
                  NO podrás recuperar esta información después de eliminar tu cuenta.
                </p>
              </div>

              {/* Campo de Confirmación */}
              <div className="mb-4">
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">
                  Para confirmar, escribe <span className="text-red-600 font-bold">ELIMINAR</span> en mayúsculas:
                </label>
                <input
                  type="text"
                  value={confirmacionTexto}
                  onChange={(e) => {
                    setConfirmacionTexto(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition-all font-mono"
                  placeholder="Escribe ELIMINAR"
                  disabled={loading}
                />
                <p className="mt-1 text-[10px] md:text-xs text-gray-500">
                  Debe ser exactamente "ELIMINAR" en mayúsculas
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-xs md:text-sm text-red-800 font-semibold">{error}</p>
                </div>
              )}

              {/* Botones */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmacionTexto('');
                    setError(null);
                  }}
                  className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition-all text-sm md:text-base"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEliminarCuenta}
                  disabled={loading || confirmacionTexto !== 'ELIMINAR'}
                  className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      Eliminar Cuenta
                    </>
                  )}
                </button>
              </div>

              {/* Nota Final */}
              <p className="text-[10px] md:text-xs text-center text-gray-500 mt-4">
                Esta acción eliminará tu cuenta permanentemente y cerrará tu sesión.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Agregar estilos para las animaciones
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
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
  `;
  if (!document.querySelector('style[data-config-app-animations]')) {
    style.setAttribute('data-config-app-animations', 'true');
    document.head.appendChild(style);
  }
}