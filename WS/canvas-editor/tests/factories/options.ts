import type { IEditorOption } from '@/editor/interface/Editor'

export function createOptions(override: Partial<IEditorOption> = {}): Partial<IEditorOption> {
  return {
    locale: override.locale ?? 'zhCN',
    width: 794,
    height: 1123,
    margins: [100, 120, 100, 120],
    ...override
  }
}
