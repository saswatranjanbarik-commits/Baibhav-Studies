/**
 * Merge rules used when saving to the cloud (unchanged since v1.1).
 *
 *  - Arrays of {id} objects: this device's edits win; items this device saw
 *    and removed are deleted; items added elsewhere that this device never
 *    saw are KEPT.
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
export function mergeValue(existingValue: any, newVal: any, lastKnownValue: any): any {
  if (existingValue === undefined) return newVal;

  if (Array.isArray(existingValue) && Array.isArray(newVal)) {
    if (!isIdObjectArray(newVal, existingValue)) {
      return Array.from(new Set([...existingValue, ...newVal]));
    }

    const lastKnownIds = new Set<string>();
    (Array.isArray(lastKnownValue) ? lastKnownValue : []).forEach((item: any) => {
      if (item && item.id) lastKnownIds.add(item.id);
    });

    const userNewMap = new Map<string, any>();
    newVal.forEach((item: any) => { if (item && item.id) userNewMap.set(item.id, item); });

    const mergedMap = new Map<string, any>();
    existingValue.forEach((item: any) => {
      if (!item || !item.id) return;
      if (userNewMap.has(item.id)) {
        mergedMap.set(item.id, userNewMap.get(item.id)); // user's version wins
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
