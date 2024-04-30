import { dlog } from "berry-pretty";

export interface SrcMapEntry {
  src: string;
  srcStart: number;
  srcEnd: number;
  destStart: number;
  destEnd: number;
}

export interface SrcPosition {
  src: string;
  position: number;
}

/** map text ranges in multiple src texts to a single dest text */
export class SrcMap {
  entries: SrcMapEntry[];
  dest: string;

  constructor(dest: string, entries: SrcMapEntry[] = []) {
    this.dest = dest;
    this.entries = entries;
  }

  /** add a new mapping from src to dest ranges.
   * entries must be non-overlapping in the destination
   */
  addEntries(newEntries: SrcMapEntry[]): void {
    this.entries.push(...newEntries);
  }

  /** given positions in the dest string,
   * @return corresponding positions in the src strings */
  mapPositions(...positions: number[]): SrcPosition[] {
    return positions.map((p) => destToSrc(p, this.entries));
  }

  /** internally compress adjacent entries where possible */
  compact(): void {
    if (!this.entries.length) return;
    let prev = this.entries[0];
    const newEntries: SrcMapEntry[] = [prev];

    for (let i = 1; i < this.entries.length; i++) {
      const e = this.entries[i];
      if (
        e.src === prev.src &&
        prev.destEnd === e.destStart &&
        prev.srcEnd === e.srcStart
      ) {
        // combine adjacent range entries into one
        prev.destEnd = e.destEnd;
        prev.srcEnd = e.srcEnd;
      } else {
        newEntries.push(e);
        prev = e;
      }
    }
    this.entries = newEntries;
  }

  /** sort in destination order */
  sort(): void {
    this.entries.sort((a, b) => a.destStart - b.destStart);
  }

  /** This SrcMap's destination is a src for the other srcmap,
   * so combine the two and return the result.
   *
   */
  merge(other: SrcMap): SrcMap {
    if (other === this) return this;

    const mappedEntries = other.entries.filter((e) => e.src === this.dest);
    if (mappedEntries.length === 0) {
      console.log("other source map does not link to this one");
      // dlog({ this: this });
      // dlog({ other });
      return other;
    }
    sortSrc(mappedEntries);
    const newEntries = mappedEntries.map((e) => {
      const entries = this.entries;
      const { src, position: srcStart } = destToSrc(e.srcStart, entries);
      const { src: endSrc, position: srcEnd } = destToSrc(e.srcEnd, entries);
      if (endSrc !== src) throw new Error("NYI, need to split");
      const newEntry: SrcMapEntry = {
        src,
        srcStart,
        srcEnd,
        destStart: e.destStart,
        destEnd: e.destEnd,
      };
      // dlog({ newEntry });
      return newEntry;
    });

    const otherSources = other.entries.filter((e) => e.src !== this.dest);

    const newMap = new SrcMap(other.dest, [...otherSources, ...newEntries]);
    newMap.sort();
    return newMap;
  }
}

/** sort entries in place by src start position */
function sortSrc(entries: SrcMapEntry[]): void {
  entries.sort((a, b) => a.srcStart - b.srcStart);
}

/**
 * @param entries should be sorted in destStart order
 * @return the source position corresponding to a provided destination position
 *
 */
function destToSrc(destPos: number, entries: SrcMapEntry[]): SrcPosition {
  const entry = entries.find(
    (e) => e.destStart <= destPos && e.destEnd >= destPos
  );
  if (!entry) throw new Error(`no SrcMapEntry for dest position: ${destPos}`);
  return {
    src: entry.src,
    position: entry.srcStart + destPos - entry.destStart,
  };
}

/**
 * @param entries should be sorted in srcStart order
 * @return the dest position corresponding to a provided src position
 *
 */
function srcToDest(pos: number, entries: SrcMapEntry[]): SrcPosition {
  const entry = entries.find((e) => e.srcStart <= pos && e.srcEnd >= pos);
  // dlog({pos, entry})
  if (!entry) throw new Error(`no SrcMapEntry for src pos: ${pos}`);
  return {
    src: entry.src,
    position: entry.destStart + pos - entry.srcStart,
  };
}
