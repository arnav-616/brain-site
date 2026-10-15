// Note titles a body links to — used to light up the notes the briefing mentions.
export const linkedTitles = (body) =>
  [...body.matchAll(/\[\[([^\]|#]+)/g)].map(m => m[1].split('/').pop().trim())
