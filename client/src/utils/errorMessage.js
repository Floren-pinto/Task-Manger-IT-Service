// Pesan untuk ditampilkan ke user: pesan dari server bila ada; pesan bawaan axios
// ("Request failed with status code 403") diganti fallback berbahasa Indonesia.
export function getErrorMessage(error, fallback) {
  const serverMessage = error?.response?.data?.message;
  if (serverMessage) return serverMessage;
  if (error?.isAxiosError) return fallback;
  return error?.message || fallback;
}
