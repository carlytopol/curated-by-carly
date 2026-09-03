import "server-only";
import { createClient } from "@/lib/supabase/server";

export const PRIVATE_MEDIA_BUCKET =
  process.env.SUPABASE_PRIVATE_MEDIA_BUCKET || "curated-private-media";

export async function uploadPrivateImage(path: string, file: File) {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(PRIVATE_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error("Private image upload failed.");
}

export async function replacePrivateImage(path: string, file: File) {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(PRIVATE_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error("Private image replacement failed.");
}

export async function removePrivateImage(path: string) {
  const supabase = await createClient();
  await supabase.storage.from(PRIVATE_MEDIA_BUCKET).remove([path]);
}

export async function signPrivateImage(path: string, expiresIn = 60 * 60) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(PRIVATE_MEDIA_BUCKET)
    .createSignedUrl(path, expiresIn);
  return error ? null : data.signedUrl;
}
