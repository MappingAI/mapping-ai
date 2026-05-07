export function createFieldNoteEditor(container: HTMLElement): {
  getText(): string
  getHTML(): string
  state: {
    doc: {
      descendants(callback: (node: { type: { name: string }; attrs: Record<string, unknown> }) => void): void
    }
  }
  commands: { focus(): void }
  destroy(): void
}
