const arr1 = [{id: 1, v: 'A'}, {id: 2, v: 'B'}];
const arr2 = [{id: 2, v: 'B2'}, {id: 3, v: 'C'}];

function smartMerge(existingArr, newArr) {
  if (!Array.isArray(existingArr) || !Array.isArray(newArr)) return newArr;
  if (newArr.length > 0 && newArr[0] && typeof newArr[0] === 'object' && 'id' in newArr[0]) {
    // Both are arrays of objects with 'id'.
    // We should keep all items from existingArr that are NOT in newArr, 
    // EXCEPT if the newArr represents a state where those items were explicitly deleted?
    // Wait, if an item is deleted in newArr, it's GONE. If we just merge, it comes back!
    // We need a better way.
  }
  return newArr;
}
