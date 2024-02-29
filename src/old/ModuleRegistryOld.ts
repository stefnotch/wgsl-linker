import {
  CodeGenFn,
  GeneratorExport,
  GeneratorModuleOld,
  TextExportOld,
  TextModuleOld
} from "./LinkerOld.js";
import { parseModuleOld } from "./ParseModuleOld.js";

/** A named function to transform code fragments (e.g. by inserting parameters) */
export interface TemplateOld {
  name: string;
  applyTemplate: ApplyTemplateOld;
}
export type ApplyTemplateOld = (
  src: string,
  params: Record<string, string>
) => string;

/** a single export from a module */
type ModuleExportOld = TextModuleExportOld | GeneratorModuleExportOld;

export interface TextModuleExportOld {
  module: TextModuleOld;
  export: TextExportOld;
  kind: "text";
}
export interface GeneratorModuleExportOld {
  module: GeneratorModuleOld;
  export: GeneratorExport;
  kind: "function";
}

/** unique index for naming otherwise unnamed generator modules */
let unnamedCodeDex = 0;

/**
 * A ModuleRegistry collects exportable code fragments, code generator functions,
 * and template processors.
 *
 * The ModuleRegistry provides everything required for linkWgsl to process
 * #import statements and generate a complete wgsl shader.
 */
export class ModuleRegistryOld {
  // map from export names to a map of module names to exports
  private exports = new Map<string, ModuleExportOld[]>();
  private templates = new Map<string, ApplyTemplateOld>();

  constructor(...src: string[]) {
    this.registerModules(...src);
  }

  /** register modules' exports */
  registerModules(...sources: string[]): void {
    sources.forEach((src) => this.registerOneModule(src));
  }

  /** register one module's exports  */
  registerOneModule(src: string, moduleName?: string): void {
    const m = parseModuleOld(src, moduleName);
    this.addTextModule(m);
  }

  /** register a function that generates code on demand */
  registerGenerator(
    exportName: string,
    fn: CodeGenFn,
    params?: string[],
    moduleName?: string
  ): void {
    const exp = { name: exportName, params: params ?? [], generate: fn };
    const module = {
      name: moduleName ?? `funModule${unnamedCodeDex++}`,
      exports: [exp]
    };
    const moduleExport: GeneratorModuleExportOld = {
      module,
      export: exp,
      kind: "function"
    };
    this.addModuleExport(moduleExport);
  }

  /** register a template processor  */
  registerTemplate(...templates: TemplateOld[]): void {
    templates.forEach((t) => this.templates.set(t.name, t.applyTemplate));
  }

  /** fetch a template processor */
  getTemplate(name: string): ApplyTemplateOld | undefined {
    return this.templates.get(name);
  }

  /** return a reference to an exported text fragment or code generator (i.e. in response to an #import request) */
  getModuleExport(
    exportName: string,
    moduleName?: string
  ): ModuleExportOld | undefined {
    const exports = this.exports.get(exportName);
    if (!exports) {
      return undefined;
    } else if (moduleName) {
      return exports.find((e) => e.module.name === moduleName);
    } else if (exports.length === 1) {
      return exports[0];
    } else {
      const moduleNames = exports.map((e) => e.module.name).join(", ");
      console.warn(
        `Multiple modules export "${exportName}". (${moduleNames}) ` +
          `Use "#import ${exportName} from <moduleName>" to select which one import`
      );
    }
  }

  private addTextModule(module: TextModuleOld): void {
    module.exports.forEach((e) => {
      const moduleExport: TextModuleExportOld = {
        module,
        export: e,
        kind: "text"
      };
      this.addModuleExport(moduleExport);
    });
  }

  private addModuleExport(moduleExport: ModuleExportOld): void {
    const exportName = moduleExport.export.name;
    const existing = this.exports.get(exportName);
    if (existing) {
      existing.push(moduleExport);
    } else {
      this.exports.set(exportName, [moduleExport]);
    }
  }
}
