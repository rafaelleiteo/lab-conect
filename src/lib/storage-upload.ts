import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

export const MAX_FILE_MB = 50;
export const ALLOWED_EXTENSIONS = ["stl", "ply", "obj", "zip", "jpg", "jpeg", "png", "pdf"];

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadOrderFile({
  bucket,
  path,
  file,
  onProgress,
}: {
  bucket: string;
  path: string;
  file: File;
  onProgress?: (percent: number) => void;
}): Promise<void> {
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Extensão .${ext || "desconhecida"} não permitida. Extensões aceitas: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
  }

  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`Arquivo excede o limite máximo permitido de ${MAX_FILE_MB}MB.`);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("Sessão expirada ou usuário não autenticado.");
  }

  const isResumable = file.size > 6 * 1024 * 1024; // > 6MB

  if (isResumable) {
    // Supabase URL & Key
    const supabaseUrl =
      (import.meta.env.VITE_SUPABASE_URL as string) || "https://mcgivujpelsyscqwqohu.supabase.co";
    const anonKey =
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
      (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
      (supabase as any).supabaseKey ||
      "";

    const endpoint = `${supabaseUrl}/storage/v1/upload/resumable`;

    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: bucket,
          objectName: path,
          contentType: file.type || "application/octet-stream",
        },
        chunkSize: 6 * 1024 * 1024, // 6MB chunks
        onError: (err) => {
          reject(err);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const pct = Math.round((bytesUploaded / bytesTotal) * 100);
          onProgress?.(pct);
        },
        onSuccess: () => {
          onProgress?.(100);
          resolve();
        },
      });

      upload.start();
    });
  } else {
    // Standard upload for files <= 6MB
    onProgress?.(25);
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (error) throw error;
    onProgress?.(100);
  }
}
