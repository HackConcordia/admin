import type { IFile } from './IApplication'

export interface ISubUnitItem {
  title: string
  value: string | IFile
  type: 'text' | 'link' | 'file' | 'empty'
}
