// Foto de celular tem 3-12 MB: reduzimos no próprio aparelho antes de enviar,
// para caber no plano grátis do Supabase e não pesar no 4G de ninguém.

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // from-image: respeita a rotação gravada pela câmera (EXIF), senão foto em pé sai deitada.
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Navegadores mais antigos: decodifica via <img> (também respeita a rotação EXIF).
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function toJpeg(source: ImageBitmap | HTMLImageElement, maxSide: number, quality: number): Promise<Blob> {
  const width = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const height = 'naturalHeight' in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('canvas indisponível'));
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('falha ao gerar JPEG'))), 'image/jpeg', quality),
  );
}

export async function preparePhoto(file: File): Promise<{ full: Blob; thumb: Blob }> {
  const source = await decode(file);
  try {
    const full = await toJpeg(source, 1600, 0.82);
    const thumb = await toJpeg(source, 480, 0.72);
    return { full, thumb };
  } finally {
    if ('close' in source) source.close();
  }
}
