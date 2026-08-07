function smartMerge(existingValue, newValue) {
  if (Array.isArray(existingValue) && Array.isArray(newValue)) {
    // Check if it's an array of objects with an 'id' property
    const isObjectArray = (newValue.length > 0 && typeof newValue[0] === 'object' && newValue[0] !== null && 'id' in newValue[0]) ||
                          (existingValue.length > 0 && typeof existingValue[0] === 'object' && existingValue[0] !== null && 'id' in existingValue[0]);
    
    if (isObjectArray) {
      if (newValue.length < existingValue.length) {
        // Assume deletion, trust the new array
        return newValue;
      }
      
      const map = new Map();
      existingValue.forEach(item => {
        if (item && item.id) map.set(item.id, item);
      });
      newValue.forEach(item => {
        if (item && item.id) map.set(item.id, item);
      });
      return Array.from(map.values());
    }
    return Array.from(new Set([...existingValue, ...newValue]));
  }
  
  if (typeof existingValue === 'object' && existingValue !== null && typeof newValue === 'object' && newValue !== null) {
      return { ...existingValue, ...newValue };
  }
  return newValue; 
}

console.log(smartMerge([{id:1, v:'A'}, {id:2, v:'B'}], [{id:1, v:'A2'}, {id:3, v:'C'}]));
console.log(smartMerge([1, 2], [2, 3]));
console.log(smartMerge([{id:1}], []));
