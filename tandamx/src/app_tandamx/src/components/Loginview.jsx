import React, { useState, useCallback } from 'react';
import { Users, Eye, EyeOff, Shield, CheckCircle } from 'lucide-react';

const API_BASE_URL = 'https://9l2vrevqm1.execute-api.us-east-1.amazonaws.com/dev';

const api = {
  getHeaders: () => ({
    'Content-Type': 'application/json',
  }),
  
  handleResponse: async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error en la operación');
    }
    return data;
  },
  
  auth: {
    login: async (email, password) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: api.getHeaders(),
        body: JSON.stringify({ email, password })
      });
      const data = await api.handleResponse(response);
      
      console.log('📥 [LOGIN] Respuesta completa:', JSON.stringify(data, null, 2));
      
      // El token está anidado en data.data.token
      const token = data.data?.token || data.token;
      const userId = data.data?.id || data.userId;
      const userName = data.data?.nombre || data.nombre;
      
      console.log('🔑 [LOGIN] Token encontrado:', token ? `Sí (${token.substring(0, 20)}...)` : 'NO');
      
      if (token) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('userId', userId);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', userName);
        console.log('✅ Token guardado en localStorage');
      } else {
        console.error('❌ No se encontró token en la respuesta');
        console.error('📋 Estructura de data:', data);
      }
      
      return { ...data, token, userId, nombre: userName };
    },
    
    register: async (email, password, nombre, telefono) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: api.getHeaders(),
        body: JSON.stringify({ email, password, nombre, telefono })
      });
      const data = await api.handleResponse(response);
      
      console.log('📥 Respuesta de registro:', data);
      
      // El registro no retorna token, solo confirma que el usuario fue creado
      // No intentamos guardar token aquí
      return data;
    }
  }
};

export default function LoginView({ onLoginSuccess }) {
  const [currentView, setCurrentView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFormSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (currentView === 'login') {
        // LOGIN normal
        const result = await api.auth.login(email, password);
        
        if (result.success && result.token) {
          console.log('✅ Login exitoso');
          onLoginSuccess({ nombre: result.nombre || nombre, email });
        } else {
          throw new Error('No se pudo iniciar sesión. Verifica tus credenciales.');
        }
      } else {
        // REGISTRO + LOGIN automático
        console.log('📝 Registrando usuario...');
        const registerResult = await api.auth.register(email, password, nombre, telefono);
        
        if (registerResult.success) {
          console.log('✅ Usuario registrado');
          console.log('🔐 Iniciando sesión automática...');
          
          const loginResult = await api.auth.login(email, password);
          
          if (loginResult.success && loginResult.token) {
            console.log('✅ Login automático exitoso');
            onLoginSuccess({ nombre: loginResult.nombre || nombre, email });
          } else {
            throw new Error('Tu cuenta fue creada exitosamente. Por favor, inicia sesión manualmente.');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setError(error.message || 'Error en la operación');
    } finally {
      setLoading(false);
    }
  }, [currentView, email, password, nombre, telefono, onLoginSuccess]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-br from-orange-500 to-rose-500 rounded-3xl shadow-2xl mb-4">
            <Users className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black text-gray-800 mb-2">TandasMX</h1>
          <p className="text-gray-600">Gestiona tu tanda de forma sencilla y profesional</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="mb-6">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                  currentView === 'login'
                    ? 'bg-white shadow-md text-orange-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('register')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                  currentView === 'register'
                    ? 'bg-white shadow-md text-orange-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Registrarse
              </button>
            </div>
          </div>

          <form onSubmit={handleFormSubmit}>
            {currentView === 'register' && (
              <>
                <div className="mb-4">
                  <label htmlFor="nombre-input" className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre Completo
                  </label>
                  <input
                    id="nombre-input"
                    name="nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    autoComplete="name"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="Tu nombre"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="telefono-input" className="block text-sm font-semibold text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    id="telefono-input"
                    name="telefono"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    autoComplete="tel"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="5512345678"
                    pattern="[0-9]{10}"
                    title="Ingresa un teléfono válido de 10 dígitos"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    10 dígitos sin espacios ni guiones
                  </p>
                </div>
              </>
            )}

            <div className="mb-4">
              <label htmlFor="email-input" className="block text-sm font-semibold text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <input
                id="email-input"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password-input" className="block text-sm font-semibold text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={currentView === 'login' ? 'current-password' : 'new-password'}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cargando...' : currentView === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>
          </form>
        </div>

        <div className="mt-8 bg-gradient-to-r from-orange-500 to-rose-500 rounded-3xl p-6 text-white shadow-xl">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Sistema Profesional de Tandas
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Control total de participantes y pagos
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Tablero público compartible
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Estadísticas en tiempo real
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}