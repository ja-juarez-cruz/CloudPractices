import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  es: {
    translation: {
      // Home
      appTitle: "Amigo Secreto",
      appDescription: "Organiza tu intercambio de regalos de forma sencilla, rápida y divertida",
      start: "Empezar",
      creating: "Creando...",
      
      // Setup
      addParticipants: "Agregar Participantes",
      participantPlaceholder: "Nickname del participante",
      add: "Agregar",
      participants: "Participantes",
      remove: "Eliminar",
      startDraw: "Iniciar Sorteo",
      starting: "Iniciando...",
      minParticipants: "Se necesitan al menos 2 participantes",
      
      // Configuration
      budget: "Presupuesto sugerido",
      exchangeDate: "Fecha del intercambio",
      location: "Lugar",
      locationPlaceholder: "Casa de Juan, Restaurante...",
      
      // Join
      selectNickname: "Selecciona tu Nickname",
      session: "Sesión",
      continue: "Continuar",
      verifying: "Verificando...",
      alreadyCompleted: "Ya completaste tu sorteo",
      as: "Como",
      drawStatus: "Estado del Sorteo",
      completed: "Completaron",
      pending: "Pendientes",
      
      // Reveal
      hello: "¡Hola",
      readyToReveal: "¿Listo para descubrir a tu amigo secreto?",
      revealButton: "🎁 Descubrir a mi Amigo Secreto",
      revealing: "Revelando...",
      
      // Wishlist
      yourSecretFriend: "Tu Amigo Secreto es:",
      dontShare: "¡No compartas esta información con nadie!",
      wishlistTitle: "Tu Wishlist",
      addItem: "Agregar item",
      productName: "Nombre del producto",
      link: "Link (opcional)",
      price: "Precio aproximado",
      priority: "Prioridad",
      finalize: "Finalizar",
      saving: "Guardando...",
      
      // Completed
      processCompleted: "¡Proceso Completado!",
      assignmentComplete: "Ya tienes asignado a tu amigo secreto",
      waitingOthers: "Esperando a que todos los participantes completen el sorteo...",
      
      // Final
      drawCompleted: "¡Sorteo Completado!",
      allAssigned: "Todos los participantes tienen su amigo secreto",
      participantWishlists: "Wishlists de Participantes",
      noWishlist: "Sin wishlist",
      
      // Share
      drawCreated: "¡Sorteo Creado!",
      shareLink: "Comparte este enlace con todos los participantes",
      copyLink: "Copiar Enlace",
      linkCopied: "¡Enlace copiado!",
      shareWhatsApp: "Compartir por WhatsApp",
      
      // Calendar
      addToCalendar: "Agregar a mi calendario",
      
      // Errors
      selectNicknameError: "Selecciona tu nickname",
      nicknameInvalid: "Nickname no válido",
      alreadyClaimed: "Nickname ya reclamado",
      noParticipantsAvailable: "No hay participantes disponibles",
      sessionNotFound: "Sesión no encontrada",
      
      // Stats
      statistics: "Estadísticas",
      averageRevealTime: "Tiempo promedio de revelación",
      completionRate: "Tasa de completado",
      averageBudget: "Presupuesto promedio",
      totalParticipants: "Total de participantes"
    }
  },
  en: {
    translation: {
      appTitle: "Secret Santa",
      appDescription: "Organize your gift exchange easily, quickly and fun",
      start: "Start",
      creating: "Creating...",
      
      addParticipants: "Add Participants",
      participantPlaceholder: "Participant nickname",
      add: "Add",
      participants: "Participants",
      remove: "Remove",
      startDraw: "Start Draw",
      starting: "Starting...",
      minParticipants: "At least 2 participants needed",
      
      budget: "Suggested budget",
      exchangeDate: "Exchange date",
      location: "Location",
      locationPlaceholder: "John's house, Restaurant...",
      
      selectNickname: "Select your Nickname",
      session: "Session",
      continue: "Continue",
      verifying: "Verifying...",
      alreadyCompleted: "You already completed your draw",
      as: "As",
      drawStatus: "Draw Status",
      completed: "Completed",
      pending: "Pending",
      
      hello: "Hello",
      readyToReveal: "Ready to discover your secret santa?",
      revealButton: "🎁 Reveal my Secret Santa",
      revealing: "Revealing...",
      
      yourSecretFriend: "Your Secret Santa is:",
      dontShare: "Don't share this information with anyone!",
      wishlistTitle: "Your Wishlist",
      addItem: "Add item",
      productName: "Product name",
      link: "Link (optional)",
      price: "Approximate price",
      priority: "Priority",
      finalize: "Finalize",
      saving: "Saving...",
      
      processCompleted: "Process Completed!",
      assignmentComplete: "You have been assigned your secret santa",
      waitingOthers: "Waiting for all participants to complete the draw...",
      
      drawCompleted: "Draw Completed!",
      allAssigned: "All participants have their secret santa",
      participantWishlists: "Participant Wishlists",
      noWishlist: "No wishlist",
      
      drawCreated: "Draw Created!",
      shareLink: "Share this link with all participants",
      copyLink: "Copy Link",
      linkCopied: "Link copied!",
      shareWhatsApp: "Share via WhatsApp",
      
      addToCalendar: "Add to calendar",
      
      selectNicknameError: "Select your nickname",
      nicknameInvalid: "Invalid nickname",
      alreadyClaimed: "Nickname already claimed",
      noParticipantsAvailable: "No participants available",
      sessionNotFound: "Session not found",
      
      statistics: "Statistics",
      averageRevealTime: "Average reveal time",
      completionRate: "Completion rate",
      averageBudget: "Average budget",
      totalParticipants: "Total participants"
    }
  },
  pt: {
    translation: {
      appTitle: "Amigo Secreto",
      appDescription: "Organize sua troca de presentes de forma simples, rápida e divertida",
      start: "Começar",
      creating: "Criando...",
      
      addParticipants: "Adicionar Participantes",
      participantPlaceholder: "Apelido do participante",
      add: "Adicionar",
      participants: "Participantes",
      remove: "Remover",
      startDraw: "Iniciar Sorteio",
      starting: "Iniciando...",
      minParticipants: "São necessários pelo menos 2 participantes",
      
      budget: "Orçamento sugerido",
      exchangeDate: "Data da troca",
      location: "Local",
      locationPlaceholder: "Casa do João, Restaurante...",
      
      selectNickname: "Selecione seu Apelido",
      session: "Sessão",
      continue: "Continuar",
      verifying: "Verificando...",
      alreadyCompleted: "Você já completou seu sorteio",
      as: "Como",
      drawStatus: "Status do Sorteio",
      completed: "Completaram",
      pending: "Pendentes",
      
      hello: "Olá",
      readyToReveal: "Pronto para descobrir seu amigo secreto?",
      revealButton: "🎁 Descobrir meu Amigo Secreto",
      revealing: "Revelando...",
      
      yourSecretFriend: "Seu Amigo Secreto é:",
      dontShare: "Não compartilhe esta informação com ninguém!",
      wishlistTitle: "Sua Lista de Desejos",
      addItem: "Adicionar item",
      productName: "Nome do produto",
      link: "Link (opcional)",
      price: "Preço aproximado",
      priority: "Prioridade",
      finalize: "Finalizar",
      saving: "Salvando...",
      
      processCompleted: "Processo Completado!",
      assignmentComplete: "Você tem seu amigo secreto atribuído",
      waitingOthers: "Aguardando todos os participantes completarem o sorteio...",
      
      drawCompleted: "Sorteio Completado!",
      allAssigned: "Todos os participantes têm seu amigo secreto",
      participantWishlists: "Listas de Desejos dos Participantes",
      noWishlist: "Sem lista de desejos",
      
      drawCreated: "Sorteio Criado!",
      shareLink: "Compartilhe este link com todos os participantes",
      copyLink: "Copiar Link",
      linkCopied: "Link copiado!",
      shareWhatsApp: "Compartilhar via WhatsApp",
      
      addToCalendar: "Adicionar ao calendário",
      
      selectNicknameError: "Selecione seu apelido",
      nicknameInvalid: "Apelido inválido",
      alreadyClaimed: "Apelido já reivindicado",
      noParticipantsAvailable: "Nenhum participante disponível",
      sessionNotFound: "Sessão não encontrada",
      
      statistics: "Estatísticas",
      averageRevealTime: "Tempo médio de revelação",
      completionRate: "Taxa de conclusão",
      averageBudget: "Orçamento médio",
      totalParticipants: "Total de participantes"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'es', // idioma por defecto
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;