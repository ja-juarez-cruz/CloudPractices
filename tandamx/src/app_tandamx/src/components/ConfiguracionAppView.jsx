import React, { useState } from 'react';
import { User, Mail, Phone, Trash2, AlertTriangle, Shield, ChevronLeft } from 'lucide-react';

const API_BASE_URL = 'https://9l2vrevqm1.execute-api.us-east-1.amazonaws.com/dev';

export default function ConfiguracionAppView({ userData, onBack, onAccountDeleted }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmacionTexto, setConfirmacionTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleEliminarCuenta = async () => {
    if (confirmacionTexto !== 'ELIMINAR') {
      setError('Debes escribir "ELIMINAR" para confirmar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/auth/delete-account`, {
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
        // Limpiar todo el localStorage
        localStorage.clear();
        
        // Notificar al componente padre
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header con botón de regreso */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-6 font-medium"
        >
          <ChevronLeft className="w-5 h-5" />
          Volver
        </button>

        {/* Título */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-800 mb-2">Configuración de la Aplicación</h1>
          <p className="text-gray-600">Administra tu cuenta y preferencias</p>
        </div>

        {/* Información del Usuario */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-6 h-6" />
            Información de la Cuenta
          </h2>

          <div className="space-y-4">
            {/* Nombre */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <div className="text-sm text-gray-600">Nombre</div>
                <div className="text-base font-semibold text-gray-800">
                  {userData?.nombre || 'Usuario'}
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <div className="text-sm text-gray-600">Correo Electrónico</div>
                <div className="text-base font-semibold text-gray-800">
                  {userData?.email || localStorage.getItem('userEmail') || 'No disponible'}
                </div>
              </div>
            </div>

            {/* Teléfono */}
            {userData?.telefono && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-600">Teléfono</div>
                  <div className="text-base font-semibold text-gray-800">
                    {userData.telefono}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Zona de Peligro */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-red-200">
          <h2 className="text-xl font-bold text-red-600 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Zona de Peligro
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Las acciones en esta sección son permanentes e irreversibles.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-2">Eliminar Cuenta</h3>
            <p className="text-sm text-gray-700 mb-4">
              Al eliminar tu cuenta se eliminarán permanentemente:
            </p>
            <ul className="text-sm text-gray-700 space-y-1 mb-4 list-disc list-inside">
              <li>Todas tus tandas</li>
              <li>Todos los participantes</li>
              <li>Todo el historial de pagos</li>
              <li>Toda tu información personal</li>
            </ul>
            <p className="text-sm font-bold text-red-600 mb-4">
              ⚠️ Esta acción NO se puede deshacer
            </p>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Mi Cuenta
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="inline-block p-4 bg-red-100 rounded-full mb-4">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                ¿Eliminar tu cuenta?
              </h3>
              <p className="text-gray-600">
                Esta acción eliminará permanentemente toda tu información y no podrá revertirse.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-semibold mb-2">
                Se eliminarán:
              </p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>Todas tus tandas</li>
                <li>Todos los participantes</li>
                <li>Todo el historial de pagos</li>
                <li>Tu información personal</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Escribe "ELIMINAR" para confirmar
              </label>
              <input
                type="text"
                value={confirmacionTexto}
                onChange={(e) => {
                  setConfirmacionTexto(e.target.value);
                  setError(null);
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
                placeholder="ELIMINAR"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmacionTexto('');
                  setError(null);
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarCuenta}
                disabled={loading || confirmacionTexto !== 'ELIMINAR'}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar Cuenta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}