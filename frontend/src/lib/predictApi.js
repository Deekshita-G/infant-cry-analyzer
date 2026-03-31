/**
 * POST multipart to Flask /predict (proxied in dev via Vite).
 */
export async function predictAudio(file) {
  const form = new FormData()
  form.append('file', file, file.name || 'audio.webm')

  const res = await fetch('/predict', {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    throw new Error(`Server returned ${res.status}`)
  }

  return res.json()
}
