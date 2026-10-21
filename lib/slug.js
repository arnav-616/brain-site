// URL-safe name for a note: "Arnav's Brain" → "arnavs-brain".
export const slug = (id) => id.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
