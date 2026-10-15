import * as ImagePicker from 'expo-image-picker';

/**
 * Permite ao utilizador selecionar uma foto ou captura de ecrã e enviá-la
 * diretamente para o JARVIS no PC para análise por IA multimodal.
 */
export async function pickAndUploadImage(
  host: string,
  port: number,
  token: string,
): Promise<{ ok: boolean; name?: string; error?: string }> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return { ok: false, error: 'Permissão de acesso às fotos necessária.' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { ok: false };
    }

    const asset = result.assets[0];
    const uri = asset.uri;
    const filename = asset.fileName || `iphone_screenshot_${Date.now()}.jpg`;

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type: asset.mimeType || 'image/jpeg',
    } as any);

    const uploadUrl = `http://${host}:${port}/api/upload`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      let detail = '';
      try {
        const body = (await res.json()) as { error?: string; detail?: string };
        detail = body?.error || body?.detail || '';
      } catch {
        // corpo não-JSON (ignorado)
      }
      if (res.status === 401) {
        return { ok: false, error: 'Sessão expirada — volta a emparelhar com o JARVIS.' };
      }
      if (res.status === 503) {
        return {
          ok: false,
          error: detail || 'Uploads desativados no PC: instala python-multipart no servidor.',
        };
      }
      return {
        ok: false,
        error: detail || 'Falha ao carregar a imagem no servidor do JARVIS.',
      };
    }

    const data = (await res.json()) as { ok?: boolean; name?: string };
    return { ok: true, name: data.name || filename };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro ao carregar imagem.' };
  }
}