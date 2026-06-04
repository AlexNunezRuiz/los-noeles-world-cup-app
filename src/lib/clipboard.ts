export interface ClipboardWriter {
  writeText(text: string): Promise<void>;
}

export async function copyTextToClipboard(
  text: string,
  clipboard: ClipboardWriter | undefined
): Promise<boolean> {
  if (!clipboard) return false;

  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
