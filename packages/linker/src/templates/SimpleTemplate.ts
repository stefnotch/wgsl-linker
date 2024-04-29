import { Template } from "../ModuleRegistry.js";
import { sliceReplace2, sliceWords } from "../Slicer.js";

export const simpleTemplate: Template = {
  name: "simple",
  apply: (src, extParams) => {
    const slices = sliceWords(src, extParams);
    const srcMap = sliceReplace2(src, slices);
    return { text: srcMap.dest, srcMap };
  },
};
