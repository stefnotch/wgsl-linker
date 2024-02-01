/** Structures for the abstract syntax tree constructed by the parser. */

export type AbstractElem =
  | ImportElem
  | ImportMergeElem
  | ExportElem
  | FnElem
  | CallElem
  | StructElem
  | StructMemberElem
  | VarElem
  | TypeRefElem;

/** 'interesting' elements found in the source */
export interface AbstractElemBase {
  kind: string;
  start: number;
  end: number;
}

export interface CallElem extends AbstractElemBase {
  kind: "call";
  name: string;
}

export interface FnElem extends AbstractElemBase {
  kind: "fn";
  name: string;
  calls: CallElem[];
  typeRefs: TypeRefElem[];
  returnType?: string;
}

export interface TypeRefElem extends AbstractElemBase {
  kind: "typeRef";
  name: string;
}

export interface StructElem extends AbstractElemBase {
  kind: "struct";
  name: string;
  members?: StructMemberElem[];
  typeRefs: TypeRefElem[];
  importMerges?: ImportMergeElem[];
}

export interface StructMemberElem extends AbstractElemBase {
  kind: "member";
  name: string;
}

export interface ExportElem extends AbstractElemBase {
  kind: "export";
  name?: string; // TODO drop this?
  args?: string[];
  importing?: ImportElem[];
}

export interface ImportElem extends AbstractElemBase {
  kind: "import";
  name: string;
  args?: string[];
  as?: string;
  from?: string;
}

export interface ImportMergeElem extends Omit<ImportElem, "kind"> {
  kind: "importMerge";
  name: string;
  args?: string[];
  as?: string;
  from?: string;
}

export interface VarElem extends AbstractElemBase {
  kind: "var";
  name: string;
  typeRefs: TypeRefElem[];
}
