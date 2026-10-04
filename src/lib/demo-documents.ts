// Only this public illustration can be opened from a sample document record.
export function sampleDocumentUrl(id: string): string | null {
  return id === 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    ? '/demo/washing-machine-receipt.svg'
    : null;
}
