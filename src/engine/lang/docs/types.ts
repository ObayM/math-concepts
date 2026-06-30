export interface DocProp {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}

export interface DocEntry {
  keyword: string;
  syntax: string;
  description: string;
  props?: DocProp[];
  example?: string;
}

export interface DocSection {
  id: string;
  title: string;
  description: string;
  entries: DocEntry[];
}
