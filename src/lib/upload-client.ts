// ─────────────────────────────────────────────────────────────────────────
// upload-client.ts — orchestration réseau de l'upload (client uniquement).
// Deux étapes : (1) demander une URL présignée à /api/upload-url, puis
// (2) PUT le fichier directement sur S3 avec suivi de progression (XHR, car
// fetch() n'expose pas la progression d'upload).
// ─────────────────────────────────────────────────────────────────────────

export type PresignedUpload = {
  uploadUrl: string;
  key: string;
  publicUrl: string;
};

export type RequestUploadUrlResult =
  | { status: "ok"; data: PresignedUpload }
  | { status: "not_configured"; message: string }
  | { status: "error"; message: string };

export async function requestUploadUrl(file: {
  name: string;
  type: string;
  size: number;
}): Promise<RequestUploadUrlResult> {
  let res: Response;
  try {
    res = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });
  } catch {
    return { status: "error", message: "Réseau indisponible. Réessaie." };
  }

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    uploadUrl?: string;
    key?: string;
    publicUrl?: string;
  };

  // 503 = S3 non configuré (dev sans AWS) → ce n'est pas une erreur bloquante.
  if (res.status === 503) {
    return { status: "not_configured", message: body.error ?? "Upload S3 non configuré." };
  }
  if (!res.ok || !body.uploadUrl || !body.publicUrl || !body.key) {
    return { status: "error", message: body.error ?? "Échec de la préparation de l'upload." };
  }
  return {
    status: "ok",
    data: { uploadUrl: body.uploadUrl, key: body.key, publicUrl: body.publicUrl },
  };
}

/** PUT le fichier sur l'URL présignée, en rapportant la progression 0→1. */
export function uploadToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload S3 échoué (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Upload S3 interrompu (réseau)."));
    xhr.send(file);
  });
}
