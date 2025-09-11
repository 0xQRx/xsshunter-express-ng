export function copy(inputData: any) {
  return JSON.parse(JSON.stringify(inputData))
}

export function htmlEncode(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/=/g, '&#61;')
    .replace(/ /g, '&#32;')
}

export function urlsafeBase64Encode(value: string): string {
  return btoa(value).replace(/=/g, '')
}

export default {
  copy,
  htmlEncode,
  urlsafeBase64Encode
}