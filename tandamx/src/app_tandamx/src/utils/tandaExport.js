import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/* =====================================================
   🔧 Helper interno: generar imagen (canvas + blob)
===================================================== */
const generarImagenCalendario = async (elementRef) => {
  if (!elementRef?.current) {
    throw new Error('Elemento no disponible para exportar');
  }

  const contenedorScroll =
    elementRef.current.querySelector('.scroll-container');

  const estiloOriginal = {
    maxHeight: contenedorScroll?.style.maxHeight,
    overflowY: contenedorScroll?.style.overflowY
  };

  if (contenedorScroll) {
    contenedorScroll.style.maxHeight = 'none';
    contenedorScroll.style.overflowY = 'visible';
  }

  await new Promise(r => setTimeout(r, 100));

  const canvas = await html2canvas(elementRef.current, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    allowTaint: true,
    windowWidth: elementRef.current.scrollWidth,
    windowHeight: elementRef.current.scrollHeight
  });

  if (contenedorScroll) {
    contenedorScroll.style.maxHeight = estiloOriginal.maxHeight;
    contenedorScroll.style.overflowY = estiloOriginal.overflowY;
  }

  const blob = await new Promise(resolve =>
    canvas.toBlob(resolve, 'image/png', 1)
  );

  return blob;
};

/* =====================================================
   📥 EXPORTAR / DESCARGAR IMAGEN (WEB + APP)
===================================================== */
export const exportarCalendarioComoImagen = async ({
  elementRef,
  fileName
}) => {
  const blob = await generarImagenCalendario(elementRef);

  /* ---------- APP (Capacitor) ---------- */
  if (Capacitor.isNativePlatform()) {
    const base64 = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });

    await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Documents
    });

    return { success: true, platform: 'native', action: 'download' };
  }

  /* ---------- WEB / PWA ---------- */
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  await new Promise(r => setTimeout(r, 100));

  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, platform: 'web', action: 'download' };
};

/* =====================================================
   📤 ENVIAR / COMPARTIR IMAGEN (WEB + APP)
===================================================== */
export const enviarCalendarioComoImagen = async ({
  elementRef,
  fileName,
  mensaje
}) => {
  const blob = await generarImagenCalendario(elementRef);

  /* ---------- APP (Capacitor) ---------- */
  if (Capacitor.isNativePlatform()) {
    const base64 = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });

    await Share.share({
      title: fileName,
      text: mensaje,
      files: [
        {
          name: fileName,
          data: base64,
          type: 'image/png'
        }
      ],
      dialogTitle: 'Compartir calendario'
    });

    return { success: true, platform: 'native', action: 'share' };
  }

  /* ---------- WEB / PWA (Web Share API) ---------- */
  const file = new File([blob], fileName, { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: fileName,
      text: mensaje,
      files: [file]
    });

    return { success: true, platform: 'web', action: 'share' };
  }

  /* ---------- Fallback WEB: descarga + WhatsApp ---------- */
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  await new Promise(r => setTimeout(r, 100));

  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    mensaje + '\n\n📥 La imagen se descargó, adjúntala en el chat.'
  )}`;

  window.open(whatsappUrl, '_blank');

  return {
    success: true,
    platform: 'web',
    action: 'download+whatsapp'
  };
};
