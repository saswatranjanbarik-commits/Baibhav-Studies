let originalSetItem = typeof window !== 'undefined' ? window.localStorage.setItem : null;
console.log(originalSetItem ? "Exists" : "Not browser env");
