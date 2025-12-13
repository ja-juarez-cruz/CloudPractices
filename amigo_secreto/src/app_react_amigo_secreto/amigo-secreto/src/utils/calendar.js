export const generateICS = (eventData) => {
  const { title, description, location, startDate, endDate } = eventData;
  
  // Convertir fecha a formato ICS (YYYYMMDDTHHmmss)
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Amigo Secreto//ES
BEGIN:VEVENT
UID:${Date.now()}@amigosecreto.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${title}
DESCRIPTION:${description}
LOCATION:${location}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT24H
DESCRIPTION:Recordatorio: ${title}
ACTION:DISPLAY
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1H
DESCRIPTION:¡En 1 hora! ${title}
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;

  return icsContent;
};

export const downloadICS = (eventData) => {
  const icsContent = generateICS(eventData);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'amigo-secreto.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};