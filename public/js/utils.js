export function capitalize(str){
  if (typeof str !== "string" || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatInt(num){
  return Number(num || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}