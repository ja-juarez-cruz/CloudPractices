import React, { useState, useEffect } from 'react';
import { Gift, Users, Sparkles, Check, Clock, Loader2, Moon, Sun, Calendar, Share2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import Snowfall from './components/Snowfall';
import FlipCard from './components/FlipCard';
import { downloadICS } from './utils/calendar';

// Configuración del API
const API_BASE = 'https://iixr5ftgmd.execute-api.us-east-1.amazonaws.com/dev';
const USE_MOCK = false;

// Avatares disponibles (#15)
const AVATARS = ['🧑', '🤶', '🧞', '🧙', '🧘', '👨‍🏫', '🎅', '👨‍💻', '👩‍🎨', '👨‍🚀', '👨‍🚒', '👨‍🍳'];

// API Functions con mejoras
const mockAPI = {
  createSession: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { sessionId: Math.floor(1000000000 + Math.random() * 9000000000).toString() };
  },

  addParticipants: async (sessionId, participants, config) => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const sessions = JSON.parse(localStorage.getItem('sessions') || '{}');
      sessions[sessionId] = {
        sessionId,
        participants,
        config, // Guardar configuración (#5)
        status: 'SETUP',
        assignments: {},
        wishlists: {},
        avatars: {},
        claimTimeouts: {}, // Para timeout (#3)
        revealTimes: {}, // Para estadísticas (#22)
        createdAt: Date.now()
      };
      localStorage.setItem('sessions', JSON.stringify(sessions));
      return { success: true };
    }

    try {
      const url = `${API_BASE}/amigo-secreto/session/${sessionId}/participants`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants, config })
      });

      if (!response.ok) throw new Error(await response.text());
      return await response.json();
    } catch (err) {
      console.error('Network error:', err);
      return { success: false, error: err.message };
    }
  },

  startSession: async (sessionId) => {
    if (USE_MOCK) {
      return { url: `${window.location.origin}${window.location.pathname}#/session/${sessionId}` };
    }

    try {
      return { url: `${window.location.origin}${window.location.pathname}#/session/${sessionId}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  claimNickname: async (sessionId, nickname, avatar) => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const sessions = JSON.parse(localStorage.getItem('sessions') || '{}');
      const session = sessions[sessionId];

      if (!session || !session.participants.includes(nickname)) {
        return { success: false, error: 'Nickname no válido' };
      }

      // Verificar timeout (#3)
      const timeout = session.claimTimeouts[nickname];
      if (timeout && Date.now() - timeout > 300000) { // 5 minutos
        delete session.assignments[nickname];
        delete session.claimTimeouts[nickname];
      }

      if (session.assignments[nickname]) {
        return { success: false, error: 'Nickname ya reclamado' };
      }

      // Marcar tiempo de reclamo
      session.claimTimeouts[nickname] = Date.now();
      session.avatars[nickname] = avatar;
      localStorage.setItem('sessions', JSON.stringify(sessions));

      return { success: true };
    }

    try {
      const response = await fetch(`${API_BASE}/amigo-secreto/session/${sessionId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, avatar })
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Error reclamando nickname' };
      }

      return await response.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  revealFriend: async (sessionId, nickname) => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const sessions = JSON.parse(localStorage.getItem('sessions') || '{}');
      const session = sessions[sessionId];

      if (!session) return { success: false, error: 'Sesión no encontrada' };

      // Implementar algoritmo para evitar auto-asignación (#8)
      const available = session.participants.filter(p =>
        p !== nickname && !Object.values(session.assignments).includes(p)
      );

      if (available.length === 0) {
        return { success: false, error: 'No hay participantes disponibles' };
      }

      const assignedTo = available[Math.floor(Math.random() * available.length)];
      session.assignments[nickname] = assignedTo;
      session.wishlists[nickname] = [];
      session.revealTimes[nickname] = Date.now(); // Para estadísticas (#22)
      localStorage.setItem('sessions', JSON.stringify(sessions));

      return { success: true, assignedTo };
    }

    try {
      const response = await fetch(`${API_BASE}/amigo-secreto/session/${sessionId}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname })
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Error revelando amigo' };
      }

      return await response.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  updateWishlist: async (sessionId, nickname, wishlist) => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const sessions = JSON.parse(localStorage.getItem('sessions') || '{}');
      const session = sessions[sessionId];

      if (session && session.assignments[nickname]) {
        session.wishlists[nickname] = wishlist;
        localStorage.setItem('sessions', JSON.stringify(sessions));
        return { success: true };
      }

      return { success: false };
    }

    try {
      const response = await fetch(`${API_BASE}/amigo-secreto/session/${sessionId}/wishlist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, wishlist })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getStatus: async (sessionId) => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const sessions = JSON.parse(localStorage.getItem('sessions') || '{}');
      const session = sessions[sessionId];

      if (!session) return { success: false, error: 'Sesión no encontrada' };

      const revealed = Object.keys(session.assignments);
      const pending = session.participants.filter(p => !revealed.includes(p));
      const allRevealed = pending.length === 0;

      return {
        success: true,
        status: session.status,
        participants: session.participants,
        revealed,
        pending,
        allRevealed,
        config: session.config,
        avatars: session.avatars
      };
    }

    try {
      const response = await fetch(`${API_BASE}/amigo-secreto/session/${sessionId}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getSummary: async (sessionId) => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const sessions = JSON.parse(localStorage.getItem('sessions') || '{}');
      const session = sessions[sessionId];

      if (!session) return { success: false };

      const summary = session.participants.map(p => ({
        nickname: p,
        avatar: session.avatars[p] || '🎁',
        wishlist: session.wishlists[p] || []
      }));

      return { success: true, summary, config: session.config };
    }

    try {
      const response = await fetch(`${API_BASE}/amigo-secreto/session/${sessionId}/summary`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Obtener estadísticas (#22)
  getStatistics: async (sessionId) => {
    if (USE_MOCK) {
      const sessions = JSON.parse(localStorage.getItem('sessions') || '{}');
      const session = sessions[sessionId];

      if (!session) return { success: false };

      const revealTimes = Object.values(session.revealTimes);
      const avgTime = revealTimes.length > 0
        ? revealTimes.reduce((a, b) => a + b, 0) / revealTimes.length
        : 0;

      const completionRate = (Object.keys(session.assignments).length / session.participants.length) * 100;

      const wishlists = Object.values(session.wishlists);
      const totalBudget = wishlists.flat().reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
      const avgBudget = wishlists.length > 0 ? totalBudget / wishlists.length : 0;

      return {
        success: true,
        stats: {
          averageRevealTime: Math.round((Date.now() - session.createdAt) / 1000 / 60), // minutos
          completionRate: Math.round(completionRate),
          averageBudget: Math.round(avgBudget),
          totalParticipants: session.participants.length
        }
      };
    }

    return { success: false };
  }
};

function App() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState('home');
  const [sessionId, setSessionId] = useState('');
  const [participants, setParticipants] = useState([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [selectedNickname, setSelectedNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🎅'); // Avatar por defecto
  const [showAvatarModal, setShowAvatarModal] = useState(false); // ← AGREGAR ESTE ESTADO
  const [assignedFriend, setAssignedFriend] = useState('');
  const [wishlist, setWishlist] = useState([]);
  const [newWishlistItem, setNewWishlistItem] = useState({
    name: '',
    link: '',
    priority: 1
  });
  const [hoveredStar, setHoveredStar] = useState(0); // ← AGREGAR ESTE ESTADO
  const [status, setStatus] = useState(null);
  const [summary, setSummary] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showSnow, setShowSnow] = useState(true);

  // 👇 TEMPORAL: Para debugging
  console.log('🎬 Current view:', view);
  console.log('🆔 Current sessionId:', sessionId);
  console.log('📊 Current status:', status);

  // Configuración del sorteo (#5)
  const [config, setConfig] = useState({
    budget: '',
    exchangeDate: '',
    location: ''
  });

  // Wishlist mejorado (#9)
  //const [newWishlistItem, setNewWishlistItem] = useState({
  //  name: '',
  //  link: '',
  //  priority: 1
  //});

  useEffect(() => {
    console.log('🚀 App mounted');
    console.log('📍 Current hash:', window.location.hash);
    const hash = window.location.hash;
    if (hash.startsWith('#/session/')) {
      const id = hash.split('/')[2];
      setSessionId(id);
      setView('join');
      loadStatus(id);
    }

    // Cargar preferencia de modo oscuro (#14)
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);

    // Cargar idioma guardado
    const savedLang = localStorage.getItem('language') || 'es';
    i18n.changeLanguage(savedLang);
  }, []);

  const loadStatus = async (id) => {
    const result = await mockAPI.getStatus(id);
    console.log('✅ Status loaded successfully:', result);
    if (result.success) {
      setStatus(result);
      setConfig(result.config || {});

      if (result.allRevealed) {
        const summaryResult = await mockAPI.getSummary(id);
        if (summaryResult.success) {
          setSummary(summaryResult.summary);
          setView('final');

          // Cargar estadísticas
          //const statsResult = await mockAPI.getStatistics(id);
          //if (statsResult.success) {
          //  setStatistics(statsResult.stats);
         // }
        }
      }
    }
  };

  const handleCreateSession = async () => {
    setLoading(true);
    const result = await mockAPI.createSession();
    setSessionId(result.sessionId);
    setView('setup');
    setLoading(false);
  };

  const handleAddParticipant = () => {
    if (newParticipant.trim() && !participants.includes(newParticipant.trim())) {
      setParticipants([...participants, newParticipant.trim()]);
      setNewParticipant('');
      setError('');
    }
  };

  const handleRemoveParticipant = (nickname) => {
    setParticipants(participants.filter(p => p !== nickname));
  };

  const handleStartSession = async () => {
    if (participants.length < 2) {
      setError(t('minParticipants'));
      return;
    }

    setLoading(true);
    await mockAPI.addParticipants(sessionId, participants, config);
    const result = await mockAPI.startSession(sessionId);
    setShareUrl(result.url);
    setView('share');
    setLoading(false);
  };

  const handleClaimNickname = async () => {
    if (!selectedNickname) {
      setError(t('selectNicknameError'));
      return;
    }

    setLoading(true);
    const result = await mockAPI.claimNickname(sessionId, selectedNickname, selectedAvatar);

    if (result.success) {
      localStorage.setItem(`session_${sessionId}_claimed`, selectedNickname);
      localStorage.setItem(`session_${sessionId}_avatar`, selectedAvatar);
      setView('reveal');
      setError('');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleRevealFriend = async () => {
    setLoading(true);
    const result = await mockAPI.revealFriend(sessionId, selectedNickname);

    if (result.success) {
      setAssignedFriend(result.assignedTo);
      setView('wishlist');

      // Lanzar confetti (#13)
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  // Agregar item a wishlist (#9)
  const handleAddWishlistItem = () => {
    if (newWishlistItem.name.trim()) {
      setWishlist([...wishlist, { ...newWishlistItem, id: Date.now() }]);
      setNewWishlistItem({ name: '', link: '', priority: 1 });
    }
  };

  const handleRemoveWishlistItem = (id) => {
    setWishlist(wishlist.filter(item => item.id !== id));
  };

  const handleSaveWishlist = async () => {
    setLoading(true);
    await mockAPI.updateWishlist(sessionId, selectedNickname, wishlist);
    setView('completed');
    setLoading(false);

    // Más confetti
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 }
    });

    setTimeout(() => {
      loadStatus(sessionId);
    }, 1000);
  };

  // Compartir por WhatsApp (#25)
  const shareWhatsApp = () => {
    const text = `¡Únete a mi Amigo Secreto! ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Agregar a calendario (#20)
  const addToCalendar = () => {
    if (!config.exchangeDate) {
      alert('No hay fecha configurada');
      return;
    }

    const eventData = {
      title: '🎁 Intercambio Amigo Secreto',
      description: `Intercambio de regalos - Presupuesto: ${config.budget || 'No definido'}`,
      location: config.location || 'Por definir',
      startDate: new Date(config.exchangeDate + 'T18:00:00'),
      endDate: new Date(config.exchangeDate + 'T20:00:00')
    };

    downloadICS(eventData);
  };

  // Cambiar idioma (#23)
  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  // Toggle modo oscuro (#14)
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', (!darkMode).toString());
  };

  // HOME VIEW
  if (view === 'home') {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-red-100 via-white to-green-100'} flex flex-col items-center p-0 m-0`}>
        {showSnow && <Snowfall snowflakeCount={30} />}

        {/* Header */}
        <header className="w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-md fixed top-0 left-0 z-40 py-4 px-6 flex justify-between items-center border-b border-white/40">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
            🎁 {t('appTitle')}
          </h1>

          <div className="flex gap-2">
            {/* Selector de idioma */}
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="es">🇪🇸 ES</option>
              <option value="en">🇺🇸 EN</option>
              <option value="pt">🇧🇷 PT</option>
            </select>

            {/* Toggle modo oscuro */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>

            {/* Toggle nieve */}
            <button
              onClick={() => setShowSnow(!showSnow)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              ❄️
            </button>
          </div>
        </header>

        {/* Contenido centrado */}
        <div className="flex-1 w-full flex items-center justify-center p-6 pt-28">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-xl p-8 w-full max-w-sm text-center border border-white/40"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-full shadow-inner">
                <Gift className="w-16 h-16 text-red-500" />
              </div>

              <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
                {t('appTitle')}
              </h2>

              <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed px-2">
                {t('appDescription')}
              </p>

              <button
                onClick={handleCreateSession}
                disabled={loading}
                className="w-full bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-semibold py-3 rounded-2xl text-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    {t('creating')}
                  </>
                ) : (
                  t('start')
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // SETUP VIEW con configuración (#5)
  if (view === 'setup') {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-red-50 to-green-50'} p-4`}>
        {showSnow && <Snowfall snowflakeCount={20} />}
        
        {/* Header con controles */}
        <div className="max-w-2xl mx-auto mb-4 flex justify-between items-center">
          <div className="flex gap-2">
            {/* Selector de idioma */}
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 dark:text-white text-sm border border-gray-300 dark:border-gray-600"
            >
              <option value="es">🇪🇸 ES</option>
              <option value="en">🇺🇸 EN</option>
              <option value="pt">🇧🇷 PT</option>
            </select>
            
            {/* Toggle modo oscuro */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-300 dark:border-gray-600"
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
            
            {/* Toggle nieve */}
            <button
              onClick={() => setShowSnow(!showSnow)}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-300 dark:border-gray-600"
            >
              {showSnow ? '❄️' : '🌨️'}
            </button>
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
              {t('addParticipants')}
            </h2>
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-full font-mono text-sm w-fit">
              #{sessionId}
            </div>
          </div>
          
          {/* Configuración del sorteo (#5) */}
          <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-700 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-500 dark:bg-blue-600 p-2 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base sm:text-lg">
                Configuración del Sorteo
              </h3>
            </div>
            
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-4">
              Define los detalles importantes para tu intercambio de regalos
            </p>
            
            <div className="space-y-4">
              {/* Presupuesto */}
              <div className="bg-white dark:bg-gray-800/70 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  <span className="text-xl">💰</span>
                  {t('budget')}
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={config.budget}
                  onChange={(e) => setConfig({...config, budget: e.target.value})}
                  placeholder="Ej: $500 MXN, €50, $30 USD"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base transition-all"
                />
              </div>
              
              {/* Fecha del intercambio */}
              <div className="bg-white dark:bg-gray-800/70 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  <span className="text-xl">📅</span>
                  {t('exchangeDate')}
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="date"
                  value={config.exchangeDate}
                  onChange={(e) => setConfig({...config, exchangeDate: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base transition-all"
                />
              </div>
              
              {/* Lugar */}
              <div className="bg-white dark:bg-gray-800/70 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  <span className="text-xl">📍</span>
                  {t('location')}
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={config.location}
                  onChange={(e) => setConfig({...config, location: e.target.value})}
                  placeholder={t('locationPlaceholder')}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base transition-all"
                />
              </div>
            </div>
            
            {/* Info tooltip */}
            <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                💡 <strong>Tip:</strong> Esta información será visible para todos los participantes
              </p>
            </div>
          </div>
          
          {/* Agregar participantes - RESPONSIVE MEJORADO */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              👥 Agregar Participantes
            </label>
            
            {/* Input y botón - Layout responsivo */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
              <input
                type="text"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddParticipant()}
                placeholder={t('participantPlaceholder')}
                className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-red-500 focus:outline-none dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base transition-all"
              />
              <button
                onClick={handleAddParticipant}
                className="w-full sm:w-auto bg-green-500 hover:bg-green-600 active:scale-95 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="whitespace-nowrap">{t('add')}</span>
              </button>
            </div>
            
            {error && (
              <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-300 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              </div>
            )}
          </div>

          {/* Lista de participantes */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t('participants')} ({participants.length})
              </h3>
              {participants.length >= 2 && (
                <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-3 py-1 rounded-full font-semibold">
                  ✓ Listo para sortear
                </span>
              )}
            </div>
            
            {participants.length === 0 ? (
              <div className="text-center py-8 sm:py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <Users className="w-12 sm:w-16 h-12 sm:h-16 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm px-4">
                  Aún no hay participantes. Agrega al menos 2 para comenzar.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2 scrollbar-thin">
                {participants.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-700/50 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-full flex-shrink-0">
                        <span className="text-base sm:text-xl">👤</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm sm:text-base block truncate">
                          {p}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Participante #{i + 1}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveParticipant(p)}
                      className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold px-2 sm:px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-1 flex-shrink-0 text-xs sm:text-sm"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{t('remove')}</span>
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Botón de iniciar sorteo */}
          <motion.button
            onClick={handleStartSession}
            disabled={loading || participants.length < 2}
            whileHover={{ scale: participants.length >= 2 ? 1.02 : 1 }}
            whileTap={{ scale: participants.length >= 2 ? 0.98 : 1 }}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-3 sm:py-4 rounded-xl text-base sm:text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 sm:w-6 h-5 sm:h-6 animate-spin" />
                {t('starting')}
              </>
            ) : (
              <>
                <Sparkles className="w-5 sm:w-6 h-5 sm:h-6" />
                {t('startDraw')}
              </>
            )}
          </motion.button>
          
          {participants.length < 2 && (
            <p className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-3">
              Se necesitan al menos 2 participantes para iniciar el sorteo
            </p>
          )}
        </div>
      </div>
    );
  }

  // SHARE VIEW con QR y WhatsApp (#21, #25)
  if (view === 'share') {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-red-50 to-green-50'} flex items-center justify-center p-4`}>
        {showSnow && <Snowfall snowflakeCount={30} />}
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-lg w-full"
        >
          {/* Header de éxito */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg"
            >
              <Check className="w-14 h-14 text-white" />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-gray-800 dark:text-white mb-2"
            >
              {t('drawCreated')}
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 dark:text-gray-400"
            >
              {t('shareLink')}
            </motion.p>
          </div>
          
          {/* Información del sorteo */}
          {(config.budget || config.exchangeDate || config.location) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800"
            >
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 text-sm">📋 Detalles del sorteo:</h3>
              <div className="space-y-2 text-sm">
                {config.budget && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span>💰</span>
                    <span><strong>Presupuesto:</strong> {config.budget}</span>
                  </div>
                )}
                {config.exchangeDate && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span>📅</span>
                    <span><strong>Fecha:</strong> {new Date(config.exchangeDate).toLocaleDateString()}</span>
                  </div>
                )}
                {config.location && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span>📍</span>
                    <span><strong>Lugar:</strong> {config.location}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          
          {/* QR Code (#21) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="qr-container mx-auto mb-6 w-fit p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-lg"
          >
            <QRCodeSVG 
              value={shareUrl} 
              size={220}
              level="H"
              includeMargin={true}
              className="mx-auto"
              bgColor={darkMode ? "#111827" : "#ffffff"}
              fgColor={darkMode ? "#ffffff" : "#000000"}
            />
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
              Escanea para unirte
            </p>
          </motion.div>
          
          {/* URL del sorteo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-gray-100 dark:bg-gray-700 p-4 rounded-xl mb-6 break-all border-2 border-gray-200 dark:border-gray-600"
          >
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300 text-center">
              {shareUrl}
            </p>
          </motion.div>
          
          {/* Botones de compartir */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-3"
          >
            {/* Copiar enlace */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                confetti({
                  particleCount: 50,
                  spread: 60,
                  origin: { y: 0.7 }
                });
                
                // Feedback visual
                const button = event.currentTarget;
                const originalText = button.innerHTML;
                button.innerHTML = '<svg class="w-5 h-5 inline" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg> ¡Copiado!';
                setTimeout(() => {
                  button.innerHTML = originalText;
                }, 2000);
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
            >
              <Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              {t('copyLink')}
            </button>
            
            {/* Compartir por WhatsApp (#25) */}
            <button
              onClick={shareWhatsApp}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              {t('shareWhatsApp')}
            </button>
            
            {/* Agregar a calendario (#20) */}
            {config.exchangeDate && (
              <button
                onClick={addToCalendar}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                {t('addToCalendar')}
              </button>
            )}
            
            {/* Botón para volver */}
            <button
              onClick={() => {
                window.location.hash = '';
                window.location.reload();
              }}
              className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-3 rounded-xl transition-all"
            >
              🏠 Crear otro sorteo
            </button>
          </motion.div>
          
          {/* Footer info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800"
          >
            <p className="text-xs text-yellow-800 dark:text-yellow-300 text-center">
              💡 <strong>Importante:</strong> Guarda este enlace. Los participantes lo necesitarán para unirse al sorteo.
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // JOIN VIEW con selector de avatar flotante
  if (view === 'join') {
    const claimed = localStorage.getItem(`session_${sessionId}_claimed`);
    const savedAvatar = localStorage.getItem(`session_${sessionId}_avatar`);
    
    console.log('👀 JOIN VIEW - claimed:', claimed);
    console.log('👀 JOIN VIEW - status:', status);
    console.log('👀 JOIN VIEW - sessionId:', sessionId);
    
    // Estado para modal de avatares
    //const [showAvatarModal, setShowAvatarModal] = useState(false);
    
    // Mostrar loading mientras carga el status
    if (!status) {
      return (
        <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-red-50 to-green-50'} flex items-center justify-center p-4`}>
          {showSnow && <Snowfall snowflakeCount={20} />}
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <Loader2 className="w-16 h-16 mx-auto text-red-500 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Cargando sesión...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Sesión #{sessionId}
            </p>
          </div>
        </div>
      );
    }
    
    // Ya reclamado
    if (claimed) {
      return (
        <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-red-50 to-green-50'} flex items-center justify-center p-4`}>
          {showSnow && <Snowfall snowflakeCount={20} />}
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">{savedAvatar || '🎁'}</div>
            <Check className="w-20 h-20 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              {t('alreadyCompleted')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('as')} <span className="font-bold text-red-500">{claimed}</span>
            </p>
            
            {status && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('drawStatus')}
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="text-green-600">✓ {t('completed')}: {status.revealed.length}</p>
                  <p className="text-orange-600">⏳ {t('pending')}: {status.pending.length}</p>
                </div>
                
                {/* Mostrar configuración */}
                {status.config && Object.keys(status.config).length > 0 && (
                  <div className="mt-4 text-left text-sm space-y-1 border-t border-gray-200 dark:border-gray-600 pt-3">
                    {status.config.budget && (
                      <p className="text-gray-600 dark:text-gray-400">
                        💰 {t('budget')}: {status.config.budget}
                      </p>
                    )}
                    {status.config.exchangeDate && (
                      <p className="text-gray-600 dark:text-gray-400">
                        📅 {t('exchangeDate')}: {new Date(status.config.exchangeDate).toLocaleDateString()}
                      </p>
                    )}
                    {status.config.location && (
                      <p className="text-gray-600 dark:text-gray-400">
                        📍 {status.config.location}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Seleccionar nickname
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-red-50 to-green-50'} flex items-center justify-center p-4`}>
        {showSnow && <Snowfall snowflakeCount={20} />}
        
        {/* Modal de selección de avatar */}
        {showAvatarModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  Elige tu avatar
                </h3>
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Selecciona un emoji que te represente en el sorteo
              </p>
              
              <div className="grid grid-cols-6 gap-3 mb-4 max-h-[400px] overflow-y-auto scrollbar-thin">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar}
                    onClick={() => {
                      setSelectedAvatar(avatar);
                      setShowAvatarModal(false);
                    }}
                    className={`avatar-option text-4xl p-3 rounded-xl transition-all hover:scale-110 ${
                      selectedAvatar === avatar 
                        ? 'bg-red-100 dark:bg-red-900/30 ring-4 ring-red-500 shadow-lg' 
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowAvatarModal(false)}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition-all"
              >
                Confirmar
              </button>
            </motion.div>
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center">
            {t('selectNickname')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
            {t('session')} #{sessionId}
          </p>
          
          {/* Avatar seleccionado con botón para cambiar */}
          <div className="mb-6 text-center">
            <div className="relative inline-block">
              <div className="text-7xl mb-2">{selectedAvatar}</div>
              <button
                onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-2 -right-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Click en el lápiz para cambiar tu avatar
            </p>
          </div>
          
          {/* Mostrar configuración del sorteo */}
          {status.config && Object.keys(status.config).length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm">
                📋 Información del sorteo
              </h3>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {status.config.budget && <p>💰 {t('budget')}: {status.config.budget}</p>}
                {status.config.exchangeDate && (
                  <p>📅 {t('exchangeDate')}: {new Date(status.config.exchangeDate).toLocaleDateString()}</p>
                )}
                {status.config.location && <p>📍 {status.config.location}</p>}
              </div>
            </div>
          )}
          
          {/* Lista de participantes */}
          {status.participants && status.participants.length > 0 ? (
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto scrollbar-thin">
              {status.participants.map((p, i) => {
                const participantAvatar = status.avatars?.[p] || '🎁';
                const isRevealed = status.revealed.includes(p);
                
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedNickname(p)}
                    disabled={isRevealed}
                    className={`w-full p-4 rounded-lg text-left font-semibold transition-all ${
                      selectedNickname === p
                        ? 'bg-red-500 text-white shadow-lg scale-105'
                        : isRevealed
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{participantAvatar}</span>
                        <span>{p}</span>
                      </div>
                      {isRevealed && <Check className="w-5 h-5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                ⚠️ No hay participantes en esta sesión
              </p>
            </div>
          )}
          
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          
          <button
            onClick={handleClaimNickname}
            disabled={loading || !selectedNickname}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('verifying')}
              </>
            ) : (
              t('continue')
            )}
          </button>
          
          {/* Barra de timeout visual (#3) */}
          {selectedNickname && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">
                ⏱️ Tienes 5 minutos para completar el proceso
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="timeout-bar bg-red-500 h-full"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // REVEAL VIEW con FlipCard (#12)
  if (view === 'reveal') {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-red-50 to-green-50'} flex items-center justify-center p-4`}>
        {showSnow && <Snowfall snowflakeCount={20} />}
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="text-6xl mb-4">{selectedAvatar}</div>
          <Sparkles className="w-20 h-20 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            {t('hello')} {selectedNickname}!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">{t('readyToReveal')}</p>
          
          <button
            onClick={handleRevealFriend}
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-4 rounded-lg text-lg transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                {t('revealing')}
              </>
            ) : (
              <>
                <Gift className="w-6 h-6" />
                {t('revealButton')}
              </>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  // WISHLIST VIEW mejorado (#9)
  if (view === 'wishlist') {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-red-50 to-green-50'} p-4`}>
        {showSnow && <Snowfall snowflakeCount={20} />}
        
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 mt-8">
          {/* Header con avatar y amigo secreto */}
          <div className="text-center mb-6">
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <Gift className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-700 rounded-full p-2 shadow-lg">
                <span className="text-2xl">{selectedAvatar}</span>
              </div>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Tu Amigo Secreto es:
            </h2>
            <div className="inline-block bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-full text-2xl sm:text-3xl font-bold shadow-lg">
              {assignedFriend}
            </div>
          </div>
          
          {/* Advertencia */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
            <p className="text-sm text-yellow-800 dark:text-yellow-300 font-semibold text-center flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              ¡No compartas esta información con nadie!
            </p>
          </div>
          
          {/* Tu Wishlist */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="text-2xl">🎁</span>
                Tu Wishlist
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            
            {/* Lista de items agregados */}
            {wishlist.length > 0 ? (
              <div className="space-y-3 mb-4">
                {wishlist.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="group bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-700/50 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-700 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      {/* Número de item */}
                      <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-sm">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Nombre */}
                        <h4 className="font-semibold text-gray-800 dark:text-white break-words mb-2">
                          {item.name}
                        </h4>
                        
                        {/* Estrellas de prioridad - MOSTRAR SOLO LAS SELECCIONADAS */}
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(item.priority)].map((_, idx) => (
                            <span key={idx} className="text-xl text-yellow-500 drop-shadow-sm">
                              ⭐
                            </span>
                          ))}
                        </div>
                        
                        {/* Link si existe */}
                        {item.link && (
                          <a 
                            href={item.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 hover:underline"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Ver producto
                          </a>
                        )}
                      </div>
                      
                      {/* Botón eliminar */}
                      <button
                        onClick={() => handleRemoveWishlistItem(item.id)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-100 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                        title="Eliminar item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 mb-4">
                <div className="text-5xl mb-3">📭</div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Tu wishlist está vacío. Agrega algunos regalos que te gustaría recibir.
                </p>
              </div>
            )}
            
            {/* Formulario para agregar item - RESPONSIVE */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 sm:p-5 rounded-xl border-2 border-blue-200 dark:border-blue-800">
              <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">+</span>
                Agregar nuevo item
              </h4>
              
              <div className="space-y-4">
                {/* Nombre del producto */}
                <div>
                  <input
                    type="text"
                    value={newWishlistItem.name}
                    onChange={(e) => setNewWishlistItem({...newWishlistItem, name: e.target.value})}
                    placeholder="¿Qué te gustaría recibir? Ej: Libro, Perfume, Audífonos..."
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 focus:outline-none dark:bg-gray-700 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
                
                {/* Link del producto */}
                <div>
                  <div className="relative">
                    <input
                      type="url"
                      value={newWishlistItem.link}
                      onChange={(e) => setNewWishlistItem({...newWishlistItem, link: e.target.value})}
                      placeholder="Link del producto (opcional)"
                      className="w-full px-4 py-3 pl-10 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 focus:outline-none dark:bg-gray-700 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                </div>
                
                {/* Selector de prioridad estilo Google Maps - RESPONSIVE */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    ¿Qué tanto lo deseas?
                  </label>
                  
                  {/* Layout responsive: columna en móvil, fila en desktop */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600">
                    {/* Estrellas interactivas - estilo Google Maps */}
                    <div className="flex justify-center sm:justify-start gap-1">
                      {[1, 2, 3].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewWishlistItem({...newWishlistItem, priority: star})}
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(0)}
                          className="transition-transform hover:scale-110 focus:outline-none focus:scale-110 cursor-pointer relative"
                        >
                          {/* Estrella de fondo (blanca/gris) */}
                          <span className="text-4xl sm:text-5xl text-gray-300 dark:text-gray-600 absolute inset-0 flex items-center justify-center">
                            ★
                          </span>
                          
                          {/* Estrella de relleno (amarilla) - solo visible si está seleccionada o hover */}
                          <span 
                            className={`text-4xl sm:text-5xl transition-all duration-150 relative ${
                              star <= (hoveredStar || newWishlistItem.priority)
                                ? 'text-yellow-500 drop-shadow-lg' 
                                : 'text-transparent'
                            }`}
                          >
                            ★
                          </span>
                        </button>
                      ))}
                    </div>
                    
                    {/* Descripción de la prioridad - responsive */}
                    <div className="flex-1 text-sm text-center sm:text-left">
                      {(hoveredStar || newWishlistItem.priority) === 1 && (
                        <div className="flex flex-col sm:flex-row items-center gap-2 text-gray-700 dark:text-gray-300">
                          <span className="text-2xl">😊</span>
                          <div>
                            <p className="font-semibold">Me gustaría</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Estaría bien recibirlo</p>
                          </div>
                        </div>
                      )}
                      {(hoveredStar || newWishlistItem.priority) === 2 && (
                        <div className="flex flex-col sm:flex-row items-center gap-2 text-gray-700 dark:text-gray-300">
                          <span className="text-2xl">😍</span>
                          <div>
                            <p className="font-semibold">Me encantaría</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Realmente lo quiero</p>
                          </div>
                        </div>
                      )}
                      {(hoveredStar || newWishlistItem.priority) === 3 && (
                        <div className="flex flex-col sm:flex-row items-center gap-2 text-gray-700 dark:text-gray-300">
                          <span className="text-2xl">🤩</span>
                          <div>
                            <p className="font-semibold">¡Lo deseo mucho!</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Sería el regalo perfecto</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Botón agregar */}
                <button
                  onClick={handleAddWishlistItem}
                  disabled={!newWishlistItem.name.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-98 group"
                >
                  <svg className="w-6 h-6 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Agregar a mi wishlist</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Botón finalizar */}
          <div className="space-y-3">
            <button
              onClick={handleSaveWishlist}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  Finalizar y guardar wishlist
                </>
              )}
            </button>
            
            {/* Nota informativa */}
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 Puedes agregar varios items. Tu amigo secreto verá tu lista completa.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // COMPLETED VIEW
  if (view === 'completed') {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-red-50 to-green-50'} flex items-center justify-center p-4`}>
        {showSnow && <Snowfall snowflakeCount={20} />}
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <Check className="w-24 h-24 mx-auto text-green-500 mb-4" />
          </motion.div>
          
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            {t('processCompleted')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('assignmentComplete')}
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
            <Clock className="w-12 h-12 mx-auto text-blue-500 mb-3" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              {t('waitingOthers')}
            </p>
          </div>
          
          {/* Opción para agregar a calendario (#20) */}
          {config.exchangeDate && (
            <button
              onClick={addToCalendar}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Calendar className="w-5 h-5" />
              {t('addToCalendar')}
            </button>
          )}
          
          {/* Auto-reload cada 5 segundos para ver si todos completaron */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Actualizando estado automáticamente...
          </p>
        </motion.div>
      </div>
    );
  }

  // FINAL VIEW con estadísticas (#22)
  if (view === 'final') {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-red-50 to-green-50'} p-4`}>
        {showSnow && <Snowfall snowflakeCount={30} />}
        
        {/* Header con controles */}
        <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center">
          <div className="flex gap-2">
            {/* Selector de idioma */}
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 dark:text-white text-sm border border-gray-300 dark:border-gray-600"
            >
              <option value="es">🇪🇸 ES</option>
              <option value="en">🇺🇸 EN</option>
              <option value="pt">🇧🇷 PT</option>
            </select>
            
            {/* Toggle modo oscuro */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-300 dark:border-gray-600"
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
            
            {/* Toggle nieve */}
            <button
              onClick={() => setShowSnow(!showSnow)}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-300 dark:border-gray-600"
            >
              {showSnow ? '❄️' : '🌨️'}
            </button>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 overflow-hidden">
          {/* Header animado */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <Gift className="w-24 h-24 mx-auto text-red-500 mb-4" />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-3"
            >
              {t('drawCompleted')}
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-600 dark:text-gray-400 text-lg"
            >
              {t('allAssigned')}
            </motion.p>
            
            {/* Confetti visual (solo decorativo) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 text-4xl"
            >
              🎉 🎊 ✨
            </motion.div>
          </div>
          
          {/* Estadísticas (#22) */}
          {statistics && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-8"
            >
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                {t('statistics')}
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-5 rounded-2xl text-center border-2 border-blue-200 dark:border-blue-700 hover:scale-105 transition-transform"
                >
                  <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {statistics.totalParticipants}
                  </div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('totalParticipants')}
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                  className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 p-5 rounded-2xl text-center border-2 border-green-200 dark:border-green-700 hover:scale-105 transition-transform"
                >
                  <div className="text-5xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {statistics.completionRate}%
                  </div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('completionRate')}
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                  className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 p-5 rounded-2xl text-center border-2 border-purple-200 dark:border-purple-700 hover:scale-105 transition-transform"
                >
                  <div className="text-5xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                    {statistics.averageRevealTime}
                    <span className="text-2xl">m</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('averageRevealTime')}
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 }}
                  className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 p-5 rounded-2xl text-center border-2 border-yellow-200 dark:border-yellow-700 hover:scale-105 transition-transform"
                >
                  <div className="text-5xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                    ${statistics.averageBudget}
                  </div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('averageBudget')}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
          
          {/* Información del sorteo */}
          {config && Object.keys(config).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800"
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Detalles del Intercambio
              </h3>
              
              <div className="grid md:grid-cols-3 gap-4">
                {config.budget && (
                  <div className="flex items-center gap-3 bg-white dark:bg-gray-800/70 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                      <span className="text-2xl">💰</span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">
                        Presupuesto
                      </div>
                      <div className="text-lg font-bold text-gray-800 dark:text-white">
                        {config.budget}
                      </div>
                    </div>
                  </div>
                )}
                
                {config.exchangeDate && (
                  <div className="flex items-center gap-3 bg-white dark:bg-gray-800/70 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                      <span className="text-2xl">📅</span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">
                        Fecha
                      </div>
                      <div className="text-lg font-bold text-gray-800 dark:text-white">
                        {new Date(config.exchangeDate).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {config.location && (
                  <div className="flex items-center gap-3 bg-white dark:bg-gray-800/70 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                      <span className="text-2xl">📍</span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">
                        Lugar
                      </div>
                      <div className="text-lg font-bold text-gray-800 dark:text-white">
                        {config.location}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          
          {/* Wishlists de participantes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
              <span className="text-3xl">🎁</span>
              {t('participantWishlists')}
            </h3>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
              {summary.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + i * 0.1 }}
                  className="bg-gradient-to-r from-red-50 via-pink-50 to-red-50 dark:from-red-900/20 dark:via-pink-900/20 dark:to-red-900/20 p-6 rounded-2xl border-2 border-red-200 dark:border-red-800 hover:shadow-xl transition-all group"
                >
                  {/* Header del participante */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-red-200 dark:border-red-800">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-md group-hover:scale-110 transition-transform">
                      <span className="text-4xl">{s.avatar}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-2xl font-bold text-red-700 dark:text-red-400">
                        {s.nickname}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {Array.isArray(s.wishlist) && s.wishlist.length > 0 
                          ? `${s.wishlist.length} ${s.wishlist.length === 1 ? 'item' : 'items'} en wishlist`
                          : 'Sin wishlist'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Wishlist items */}
                  {Array.isArray(s.wishlist) && s.wishlist.length > 0 ? (
                    <div className="space-y-3">
                      {s.wishlist.map((item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.3 + i * 0.1 + idx * 0.05 }}
                          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              {/* Nombre del producto */}
                              <h5 className="font-semibold text-gray-800 dark:text-white text-lg mb-2">
                                {item.name}
                              </h5>
                              
                              {/* Prioridad - SOLO MOSTRAR LAS ESTRELLAS SELECCIONADAS */}
                              <div className="flex items-center gap-1 mb-2">
                                {[...Array(item.priority)].map((_, starIdx) => (
                                  <span key={starIdx} className="text-xl text-yellow-500 drop-shadow-sm">
                                    ⭐
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            {/* Link del producto */}
                            {item.link && (
                              <a 
                                href={item.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-shrink-0 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-2"
                              >
                                🔗 Ver
                              </a>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-3 opacity-50">📭</div>
                      <p className="text-gray-500 dark:text-gray-400 italic">
                        {t('noWishlist')}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* Botones de acción */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="mt-8 space-y-3"
          >
            {/* Agregar a calendario */}
            {config.exchangeDate && (
              <button
                onClick={addToCalendar}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                <Calendar className="w-6 h-6" />
                {t('addToCalendar')}
              </button>
            )}
            
            {/* Compartir nuevamente */}
            <button
              onClick={() => {
                const url = `${window.location.origin}${window.location.pathname}#/session/${sessionId}`;
                navigator.clipboard.writeText(url);
                confetti({
                  particleCount: 50,
                  spread: 60,
                  origin: { y: 0.7 }
                });
                alert('¡Enlace copiado al portapapeles!');
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              <Share2 className="w-6 h-6" />
              Compartir enlace del sorteo
            </button>
            
            {/* Crear nuevo sorteo */}
            <button
              onClick={() => {
                window.location.hash = '';
                window.location.reload();
              }}
              className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3"
            >
              <Gift className="w-6 h-6" />
              🏠 Crear otro sorteo
            </button>
          </motion.div>
          
          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ¡Que disfruten su intercambio de regalos! 🎄✨
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
