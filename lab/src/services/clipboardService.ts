export async function copyToClipboard(text: string) {
  if (!navigator.clipboard) {
    throw new Error('Clipboard API not available')
  }

  await navigator.clipboard.writeText(text)
}
