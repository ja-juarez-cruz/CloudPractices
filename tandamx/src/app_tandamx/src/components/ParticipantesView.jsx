import React, { useState } from 'react';
import { Users, Plus, Edit, Trash2, X, Save, Phone, Mail, MessageCircle, Link as LinkIcon, Copy, Check } from 'lucide-react';

const API_BASE_URL = 'https://9l2vrevqm1.execute-api.us-east-1.amazonaws.com/dev';

export default function ParticipantesView({ tandaData, setTandaData, loadAdminData }) {
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [participanteAEliminar, setParticipanteAEliminar] = useState(null);
  const [editingParticipante, setEditingParticipante] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [linkRegistro, setLinkRegistro] = useState(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    numeroAsignado: ''
  });

  const numerosDisponibles = () => {
    if (!tandaData) return [];
    const numerosOcupados = tandaData.participantes?.map(p => p.numeroAsignado) || [];
    const todos = Array.from({ length: tandaData.totalRondas }, (_, i) => i + 1);
    return todos.filter(n => !numerosOcupados.includes(n));
  };

  const calcularFechaPago = (numeroAsignado) => {
    if (!tandaData.fechaInicio || !numeroAsignado) return null;
    
    const fechaInicio = new Date(tandaData.fechaInicio);
    let diasPorRonda = 7; // semanal
    if (tandaData.frecuencia === 'quincenal') diasPorRonda = 15;
    else if (tandaData.frecuencia === 'mensual') diasPorRonda = 30;
    
    // Calcular fecha de inicio de la ronda del participante
    const diasHastaRonda = (numeroAsignado - 1) * diasPorRonda;
    const fechaInicioRonda = new Date(fechaInicio);
    fechaInicioRonda.setDate(fechaInicioRonda.getDate() + diasHastaRonda);
    
    // Fecha de siguiente ronda
    const fechaSiguienteRonda = new Date(fechaInicioRonda);
    fechaSiguienteRonda.setDate(fechaSiguienteRonda.getDate() + diasPorRonda);
    
    // Fecha de pago: 1 día antes de que empiece la siguiente ronda
    const fechaPago = new Date(fechaSiguienteRonda);
    fechaPago.setDate(fechaPago.getDate() - 1);
    
    return fechaPago;
  };

  // Función para verificar si existe un link vigente
  const verificarLinkVigente = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/tandas/${tandaData.tandaId}/registro-link/activo`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success && data.data) {
        // Hay un link vigente
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/index.html#/registro/${data.data.token}`;
        setLinkRegistro({
          url: link,
          token: data.data.token,
          expiracion: data.data.expiracion,
          duracionHoras: data.data.duracionHoras
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error verificando link:', error);
      return false;
    }
  };

  // Función para generar link temporal de registro
  const generarLinkRegistro = async (duracionHoras) => {
    setLoading(true);
    setError(null);
    
    try {
      // Primero verificar si existe un link vigente
      const hayLinkVigente = await verificarLinkVigente();
      
      if (hayLinkVigente) {
        setLoading(false);
        return; // Ya tenemos un link vigente, no generamos uno nuevo
      }

      // Si no hay link vigente, generar uno nuevo
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/tandas/${tandaData.tandaId}/registro-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            duracionHoras
          })
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al generar link');
      }

      if (data.success) {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/index.html#/registro/${data.data.token}`;
        setLinkRegistro({
          url: link,
          token: data.data.token,
          expiracion: data.data.expiracion,
          duracionHoras
        });
      }
    } catch (error) {
      console.error('Error generando link:', error);
      setError(error.message || 'Error al generar link de registro');
    } finally {
      setLoading(false);
    }
  };

  // Función para copiar link al portapapeles
  const copiarLink = () => {
    if (linkRegistro?.url) {
      navigator.clipboard.writeText(linkRegistro.url);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    }
  };

  // Función para compartir por WhatsApp
  const compartirWhatsApp = () => {
    if (!linkRegistro?.url) return;
    
    const mensaje = `🎉 *¡Únete a nuestra Tanda!*

📋 *${tandaData.nombre}*

💰 Monto por ronda: $${tandaData.montoPorRonda?.toLocaleString()}
📅 Total de rondas: ${tandaData.totalRondas}
⏰ Frecuencia: ${tandaData.frecuencia}

🔗 *Regístrate aquí:*
${linkRegistro.url}

✨ *Instrucciones:*
1. Haz clic en el link
2. Ingresa tu nombre y teléfono
3. Selecciona tu(s) número(s) favorito(s)
4. ¡Listo! Serás parte de la tanda

⏱️ *Link válido por ${linkRegistro.duracionHoras} horas*`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Función para generar el link público de la tanda
  const generarLinkPublico = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}index.html#?tanda=${tandaData.tandaId}`;
  };

  // Función para enviar mensaje de pago realizado
  const enviarMensajePagoRealizado = (participante) => {
    const linkPublico = generarLinkPublico();
    const fechaPago = calcularFechaPago(participante.numeroAsignado);
    const fechaTexto = fechaPago 
      ? fechaPago.toLocaleDateString('es-MX', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })
      : 'pronto';
    
    const mensaje = `¡Hola ${participante.nombre}! 👋

✅ *Confirmación de Pago*

Tu pago de la tanda *${tandaData.nombre}* ha sido registrado correctamente.

📅 *Recibirás tu pago el:* ${fechaTexto}
💰 *Monto a recibir:* $${(tandaData.montoPorRonda * tandaData.totalRondas).toLocaleString()}

Puedes ver el detalle completo de la tanda en:
${linkPublico}

¡Gracias por tu puntualidad! 🎉`;

    const telefono = participante.telefono.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/521${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Función para enviar recordatorio de pago pendiente
  const enviarMensajePagoPendiente = (participante) => {
    const linkPublico = generarLinkPublico();
    const rondaActual = calcularRondaActual();
    
    const mensaje = `¡Hola ${participante.nombre}! 👋

📢 *Recordatorio de Pago*

Te recordamos que tienes un pago pendiente en la tanda *${tandaData.nombre}*.

📋 *Detalles:*
• Ronda actual: ${rondaActual}
• Monto por ronda: $${tandaData.montoPorRonda.toLocaleString()}
• Tu número: ${participante.numeroAsignado}

Por favor, realiza tu pago lo antes posible para mantenernos al día.

Puedes ver más detalles en:
${linkPublico}

¡Gracias por tu atención! 🙏`;

    const telefono = participante.telefono.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/521${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Función para calcular ronda actual
  const calcularRondaActual = () => {
    if (!tandaData.fechaInicio) return 1;
    
    const fechaInicio = new Date(tandaData.fechaInicio);
    const fechaActual = new Date();
    const diasTranscurridos = Math.floor((fechaActual - fechaInicio) / (1000 * 60 * 60 * 24));
    
    let diasPorRonda = 7;
    if (tandaData.frecuencia === 'quincenal') diasPorRonda = 15;
    else if (tandaData.frecuencia === 'mensual') diasPorRonda = 30;
    
    const rondaCalculada = Math.floor(diasTranscurridos / diasPorRonda) + 1;
    return Math.min(Math.max(1, rondaCalculada), tandaData.totalRondas);
  };

  const openModal = (participante = null) => {
    if (participante) {
      setEditingParticipante(participante);
      setFormData({
        nombre: participante.nombre,
        telefono: participante.telefono,
        email: participante.email || '',
        numeroAsignado: participante.numeroAsignado
      });
    } else {
      setEditingParticipante(null);
      const disponibles = numerosDisponibles();
      setFormData({
        nombre: '',
        telefono: '',
        email: '',
        numeroAsignado: disponibles.length > 0 ? disponibles[0] : ''
      });
    }
    setShowModal(true);
    setError(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingParticipante(null);
    setFormData({
      nombre: '',
      telefono: '',
      email: '',
      numeroAsignado: ''
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const url = editingParticipante
        ? `${API_BASE_URL}/tandas/${tandaData.tandaId}/participantes/${editingParticipante.participanteId}`
        : `${API_BASE_URL}/tandas/${tandaData.tandaId}/participantes`;
      
      const method = editingParticipante ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          telefono: formData.telefono,
          email: formData.email || undefined,
          numeroAsignado: parseInt(formData.numeroAsignado)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al guardar participante');
      }

      if (data.success) {
        await loadAdminData();
        closeModal();
      }
    } catch (error) {
      console.error('Error guardando participante:', error);
      setError(error.message || 'Error al guardar participante');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!participanteAEliminar) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/tandas/${tandaData.tandaId}/participantes/${participanteAEliminar.participanteId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al eliminar participante');
      }

      if (data.success) {
        setShowDeleteModal(false);
        setParticipanteAEliminar(null);
        await loadAdminData();
      }
    } catch (error) {
      console.error('Error eliminando participante:', error);
      setError(error.message || 'Error al eliminar participante');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (participante) => {
    setParticipanteAEliminar(participante);
    setShowDeleteModal(true);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!tandaData) return null;

  const participantes = tandaData.participantes || [];
  const disponibles = numerosDisponibles();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-7 h-7" />
            Participantes
          </h2>
          <p className="text-gray-600 mt-1 text-xs">
            {participantes.length} de {tandaData.totalRondas} participantes registrados
          </p>
        </div>
        {/* Botón Agregar - Solo este en el header */}
        <button
          onClick={() => openModal()}
          disabled={disponibles.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Participante</span>
        </button>
      </div>

      {/* Error Global */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Lista de Participantes */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header de la tabla con botón Link de Registro */}
        {participantes.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b-2 border-purple-200 px-6 py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    Lista de Participantes
                  </h3>
                  <p className="text-xs text-gray-600">
                    {disponibles.length > 0 
                      ? `${disponibles.length} número${disponibles.length !== 1 ? 's' : ''} disponible${disponibles.length !== 1 ? 's' : ''}`
                      : 'Tanda completa'}
                  </p>
                </div>
              </div>
              
              {/* Botón Link de Registro - Solo visible si hay números disponibles */}
              {disponibles.length > 0 && (
                <button
                  onClick={async () => {
                    setShowLinkModal(true);
                    await verificarLinkVigente();
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all text-sm"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>Generar Link de Registro</span>
                  <div className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {disponibles.length}
                  </div>
                </button>
              )}
            </div>
            
            {/* Mensaje informativo cuando hay números disponibles */}
            {disponibles.length > 0 && (
              <div className="mt-3 flex items-start gap-2 bg-white/60 rounded-lg p-3">
                <div className="p-1 bg-purple-100 rounded">
                  <LinkIcon className="w-3 h-3 text-purple-600" />
                </div>
                <p className="text-xs text-gray-700">
                  <strong>Tip:</strong> Comparte el link de registro para que los participantes se inscriban automáticamente sin necesidad de agregarlos manualmente.
                </p>
              </div>
            )}
          </div>
        )}
        
        {participantes.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No hay participantes aún
            </h3>
            <p className="text-gray-500 mb-6">
              Agrega participantes manualmente o genera un link de registro
            </p>
            
            {/* Botones cuando no hay participantes */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto">
              <button
                onClick={async () => {
                  setShowLinkModal(true);
                  await verificarLinkVigente();
                }}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm"
              >
                <LinkIcon className="w-5 h-5" />
                <span>Generar Link de Registro</span>
              </button>
              
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {participantes
                  .sort((a, b) => a.numeroAsignado - b.numeroAsignado)
                  .map((participante) => {
                    const estadoPagos = participante.estadoPagos || { estado: 'pendiente' };
                    const esProximo = participante.numeroAsignado === tandaData.rondaActual;

                    return (
                      <tr 
                        key={participante.participanteId}
                        className={`hover:bg-gray-50 transition-colors ${
                          esProximo ? 'bg-green-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                            esProximo 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {participante.numeroAsignado}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-800">
                            {participante.nombre}
                          </div>
                          {esProximo && (
                            <span className="text-xs text-green-600 font-semibold">
                              ← Turno actual
                            </span>
                          )}
                          {(() => {
                            const fechaPago = calcularFechaPago(participante.numeroAsignado);
                            if (fechaPago) {
                              return (
                                <div className="text-xs text-blue-600 font-semibold mt-1">
                                  📅 Recibe: {fechaPago.toLocaleDateString('es-MX', { 
                                    weekday: 'short', 
                                    day: 'numeric', 
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                              );
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              {participante.telefono}
                            </div>
                            {participante.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail className="w-4 h-4" />
                                {participante.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Botones de WhatsApp */}
                            <button
                              onClick={() => enviarMensajePagoRealizado(participante)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors group relative"
                              title="Confirmar pago realizado"
                            >
                              <MessageCircle className="w-5 h-5" />
                              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                ✅ Pago realizado
                              </span>
                            </button>
                            <button
                              onClick={() => enviarMensajePagoPendiente(participante)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors group relative"
                              title="Recordar pago pendiente"
                            >
                              <MessageCircle className="w-5 h-5" />
                              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                📢 Recordar pago
                              </span>
                            </button>
                            
                            {/* Separador visual */}
                            <div className="h-6 w-px bg-gray-300"></div>
                            
                            {/* Botones de editar y eliminar */}
                            <button
                              onClick={() => openModal(participante)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(participante)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                {editingParticipante ? 'Editar Participante' : 'Agregar Participante'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label htmlFor="modal-nombre" className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre Completo *
                </label>
                <input
                  id="modal-nombre"
                  name="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="Juan Pérez"
                  required
                />
              </div>

              {/* Teléfono */}
              <div>
                <label htmlFor="modal-telefono" className="block text-sm font-semibold text-gray-700 mb-2">
                  Teléfono *
                </label>
                <input
                  id="modal-telefono"
                  name="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={handleChange}
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

              {/* Email */}
              <div>
                <label htmlFor="modal-email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email (opcional)
                </label>
                <input
                  id="modal-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="juan@email.com"
                />
              </div>

              {/* Número Asignado */}
              <div>
                <label htmlFor="modal-numero" className="block text-sm font-semibold text-gray-700 mb-2">
                  Número Asignado *
                </label>
                <select
                  id="modal-numero"
                  name="numeroAsignado"
                  value={formData.numeroAsignado}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                  required
                >
                  {editingParticipante && (
                    <option value={editingParticipante.numeroAsignado}>
                      {editingParticipante.numeroAsignado} (actual)
                    </option>
                  )}
                  {disponibles.map(num => (
                    <option key={num} value={num}>
                      Número {num}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {disponibles.length} números disponibles
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && participanteAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            {/* Header del modal */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Eliminar Participante</h2>
                <p className="text-sm text-gray-600">Esta acción no se puede deshacer</p>
              </div>
            </div>

            {/* Información del participante */}
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-rose-500 text-white rounded-lg flex items-center justify-center font-bold">
                  {participanteAEliminar.numeroAsignado}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{participanteAEliminar.nombre}</p>
                  <p className="text-sm text-gray-600">{participanteAEliminar.telefono}</p>
                </div>
              </div>
            </div>

            {/* Advertencia */}
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-800 font-semibold mb-2">
                ⚠️ Al eliminar este participante:
              </p>
              <ul className="text-sm text-red-700 space-y-1 ml-4 list-disc">
                <li>Se liberará el número {participanteAEliminar.numeroAsignado}</li>
                <li>Se eliminarán sus registros de pagos</li>
                <li>No podrá recibir notificaciones</li>
              </ul>
            </div>

            {/* Error en el modal */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-xl">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setParticipanteAEliminar(null);
                  setError(null);
                }}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Link de Registro */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm sm:max-w-md p-4 sm:p-5 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-800">Link de Registro</h3>
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkRegistro(null);
                  setLinkCopiado(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!linkRegistro ? (
              <>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  Genera un link temporal para que los participantes se registren.
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => generarLinkRegistro(24)}
                    disabled={loading}
                    className="w-full py-2.5 px-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm"
                  >
                    {loading ? 'Generando...' : '⏰ Válido por 24 horas'}
                  </button>

                  <button
                    onClick={() => generarLinkRegistro(12)}
                    disabled={loading}
                    className="w-full py-2.5 px-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm"
                  >
                    {loading ? 'Generando...' : '⏰ Válido por 12 horas'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 mb-3">
                  <p className="text-xs font-semibold text-green-800 mb-0.5">
                    ✅ Link generado
                  </p>
                  <p className="text-[10px] text-green-700">
                    Válido por {linkRegistro.duracionHoras} horas
                  </p>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Link:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={linkRegistro.url}
                      readOnly
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-xs"
                    />
                    <button
                      onClick={copiarLink}
                      className="px-2.5 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0"
                      title="Copiar"
                    >
                      {linkCopiado ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {linkCopiado && (
                    <p className="text-[10px] text-green-600 mt-1">¡Copiado!</p>
                  )}
                </div>

                {/* Botón de WhatsApp */}
                <button
                  onClick={compartirWhatsApp}
                  className="w-full py-2.5 px-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 mb-3 text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Compartir por WhatsApp
                </button>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-blue-800 mb-1.5">
                    📋 Instrucciones:
                  </p>
                  <ul className="text-[10px] text-blue-700 space-y-0.5 ml-3 list-disc">
                    <li>Los participantes podrán registrarse</li>
                    <li>Elegirán sus números disponibles</li>
                    <li>Máximo 50% de números por persona</li>
                    <li>Expira en {linkRegistro.duracionHoras} horas</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Agregar estilos para la animación del modal
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
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
  `;
  if (!document.querySelector('style[data-modal-animations]')) {
    style.setAttribute('data-modal-animations', 'true');
    document.head.appendChild(style);
  }
}