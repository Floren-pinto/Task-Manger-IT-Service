export const ATTACHMENT_BUCKET = "task_attachments";

// Signed URL berlaku 1 hari (24 jam)
export const ATTACHMENT_URL_TTL_SECONDS = 60 * 60 * 24;

// Path wajib tepat "<taskId>/<namaFile>": satu folder, tanpa ".." atau backslash.
export function isValidAttachmentPath(filePath, taskId) {
  if (typeof filePath !== "string") return false;
  const [folder, fileName, ...rest] = filePath.split("/");
  return (
    folder === String(taskId) &&
    rest.length === 0 &&
    Boolean(fileName) &&
    fileName !== "." &&
    fileName !== ".." &&
    !fileName.includes("\\")
  );
}

const isAbsoluteUrl = (value) =>
  typeof value === "string" && /^https?:\/\//i.test(value);

/**
 * Menambahkan signed_url ke setiap attachment.
 * - `file_url` tetap path asli di database.
 * - `signed_url` adalah URL siap pakai dari Supabase Storage.
 * - URL lama yang sudah berupa http(s) tetap dipakai.
 */
export async function attachSignedAttachmentUrls(
  supabase,
  attachments = [],
  expiresIn = ATTACHMENT_URL_TTL_SECONDS,
) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return [];
  }

  const paths = [
    ...new Set(
      attachments
        .map((attachment) => attachment?.file_url)
        .filter(
          (path) =>
            typeof path === "string" &&
            path.length > 0 &&
            !isAbsoluteUrl(path),
        ),
    ),
  ];

  let signedUrlByPath = new Map();

  if (paths.length > 0) {
    try {
      const { data, error } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrls(paths, expiresIn);

      if (error) {
        console.error("Gagal membuat signed URL attachment:", error.message);
      } else {
        signedUrlByPath = new Map(
          (data ?? [])
            .filter((item) => item?.path && item?.signedUrl)
            .map((item) => [item.path, item.signedUrl]),
        );
      }
    } catch (error) {
      console.error(
        "Gagal membuat signed URL attachment:",
        error?.message || error,
      );
    }
  }

  return attachments.map((attachment) => {
    const path = attachment?.file_url;
    const signedUrl = isAbsoluteUrl(path)
      ? path
      : signedUrlByPath.get(path) ?? null;

    return {
      ...attachment,
      signed_url: signedUrl,
    };
  });
}
