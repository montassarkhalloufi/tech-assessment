/**
 * Check if a value is an object.
 * @param {any} value - The value to check.
 * @return {boolean} - True if the value is an object, otherwise false.
 */
function isObject(value) {
  return typeof value === 'object' && value !== null;
}
  
module.exports = {
  isObject,
};