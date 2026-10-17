/**
 * Merge rules used when saving to the cloud (unchanged since v1.1).
 *
 *  - Arrays of {id} objects: items this device CHANGED take this device's
 *    version; items it did not change keep the cloud's (possibly newer)
 *    version (v1.5); items this device saw and removed are deleted; items
 *    added elsewhere that this device never saw are KEPT.
 *  - Arrays of plain values: union.
 *  - Plain objects: shallow merge.
 *  - Anything else: the new value wins.
 *
 * `lastKnownValue` is the cloud value this device based its edit on.
 */

/** True if either array contains objects that carry an `id`. */
export function isIdObjectArray(a: any[], b: any[]): boolean {
  const hasId = (arr: any[]) =>
    arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null && 'id' in arr[0];
  return hasId(a) || hasId(b);
}

/**
 * Merge one key's new local value with the value currently in the cloud.
 *  - Arrays of {id} objects: local edits win; items the user deleted are
 *    removed; items added elsewhere that this device never saw are kept.
 *  - Arrays of plain values: union.
 *  - Plain objects: shallow merge.
 *  - Anything else: the new value wins.
 */
/** Deep equality that ignores the order of object keys. */
export function sameValue(a: any, b: any): boolean {
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(v: any): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'undefined';
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
}

export function mergeValue(existingValue: any, newVal: any, lastKnownValue: any): any {
  if (existingValue === undefined) return newVal;

  if (Array.isArray(existingValue) && Array.isArray(newVal)) {
    if (!isIdObjectArray(newVal, existingValue)) {
      return Array.from(new Set([...existingValue, ...newVal]));
    }

    const lastKnownIds = new Set<string>();
    const lastKnownMap = new Map<string, any>();
    (Array.isArray(lastKnownValue) ? lastKnownValue : []).forEach((item: any) => {
      if (item && item.id) { lastKnownIds.add(item.id); lastKnownMap.set(item.id, item); }
    });

    const userNewMap = new Map<string, any>();
    newVal.forEach((item: any) => { if (item && item.id) userNewMap.set(item.id, item); });

    const mergedMap = new Map<string, any>();
    existingValue.forEach((item: any) => {
      if (!item || !item.id) return;
      if (userNewMap.has(item.id)) {
        const mine = userNewMap.get(item.id);
        const base = lastKnownMap.get(item.id);
        // v1.5: if this device did NOT change the item since it last saw the
        // cloud, keep the cloud's version — it may hold a newer change from
        // another device (e.g. the student marking a task done). Before, every
        // item in this device's copy overwrote the cloud, so a device with a
        // slightly older copy could silently undo other people's changes.
        if (base !== undefined && sameValue(mine, base)) mergedMap.set(item.id, item);
        else mergedMap.set(item.id, mine); // this device changed it — its version wins
      } else if (!lastKnownIds.has(item.id)) {
        mergedMap.set(item.id, item); // added elsewhere; user never saw it — keep
      }
      // else: user saw it and removed it — it's a deliberate delete
    });
    newVal.forEach((item: any) => {
      if (item && item.id && !mergedMap.has(item.id)) mergedMap.set(item.id, item);
    });
    return Array.from(mergedMap.values());
  }

  if (
    typeof existingValue === 'object' && existingValue !== null &&
    typeof newVal === 'object' && newVal !== null &&
    !Array.isArray(existingValue) && !Array.isArray(newVal)
  ) {
    return { ...existingValue, ...newVal };
  }

  return newVal;
}
