// "Ana Júlia" -> "ana-julia" (para nome de arquivo).
export function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// No Android, o download vai para Downloads e aparece na galeria. No iPhone, iria para o app
// Arquivos; o menu de compartilhar tem "Salvar Imagem", que manda direto para o app Fotos.
export async function saveImage(file: File): Promise<void> {
  if (isIOS() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return; // fechou o menu
      // NotAllowedError (o toque "expirou") e afins: cai no download comum.
    }
  }
  download(file);
}
