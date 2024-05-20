const { isObject } = require('./utils');

class InvalidCriteriaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidCriteriaError';
  }
}

class EligibilityService {
  constructor() {
    /**
     * Map of operations to their respective functions.
     * @type {Object.<string, Function>}
     */
    this.operations = {
      'gt': (a, b) => this._compareValues(a, b, (x, y) => x > y),
      'lt': (a, b) => this._compareValues(a, b, (x, y) => x < y),
      'gte': (a, b) => this._compareValues(a, b, (x, y) => x >= y),
      'lte': (a, b) => this._compareValues(a, b, (x, y) => x <= y),
      'in': (a, b) => Array.isArray(b) && b.includes(a),
      'and': (a, b) => this._evaluateLogicalOperation('and', a, b),
      'or': (a, b) => this._evaluateLogicalOperation('or', a, b)
    };
  }

  /**
   * Determine if a cart is eligible based on given criteria.
   * @param {Object} cart - The cart data.
   * @param {Object} criteria - The criteria to evaluate against.
   * @return {boolean} - True if the cart meets all criteria, otherwise false.
   * @throws {InvalidCriteriaError} - If cart or criteria are not objects.
   */
  isEligible(cart, criteria) {
    if (!isObject(cart) || !isObject(criteria)) {
      throw new InvalidCriteriaError('Both cart and criteria should be objects');
    }
    return Object.entries(criteria).every(([key, condition]) =>
      this._evaluateCondition(this._getValueByKey(cart, key), condition)
    );
  }

  /**
   * Evaluate if a cart value meets the condition.
   * @param {any} cartValue - The value from the cart.
   * @param {any} condition - The condition to evaluate against.
   * @return {boolean} - True if the condition is met, otherwise false.
   */
  _evaluateCondition(cartValue, condition) {
    if (!isObject(condition) && !isObject(cartValue)) {
      return this._comparePrimitiveValues(cartValue, condition);
    }

    if (Array.isArray(cartValue)) {
      return cartValue.some(value => this._evaluateCondition(value, condition));
    }

    if (isObject(cartValue)) {
      return Object.entries(condition).every(([key, value]) => {
        const subCondition = condition[key];
        if (Array.isArray(value)) {
          return value.some(subValue => this._evaluateCondition(cartValue[key], subValue));
        } else {
          return this._evaluateCondition(cartValue[key], subCondition);
        }
      });
    }

    return Object.entries(condition).every(([op, value]) => this._evaluateOperation(op, cartValue, value));
  }

  /**
   * Compare primitive values, including special handling for dates.
   * @param {any} a - The first value to compare.
   * @param {any} b - The second value to compare.
   * @return {boolean} - The result of the comparison.
   */
  _comparePrimitiveValues(a, b) {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    return a == b;
  }

  /**
   * Compare values with a specified comparison function.
   * @param {any} a - The first value to compare.
   * @param {any} b - The second value to compare.
   * @param {Function} compareFn - The comparison function.
   * @return {boolean} - The result of the comparison.
   */
  _compareValues(a, b, compareFn) {
    if (a instanceof Date && b instanceof Date) {
      return compareFn(a.getTime(), b.getTime());
    }
    return compareFn(a, b);
  }

  /**
   * Evaluate an operation on a cart value and condition value.
   * @param {string} op - The operation to perform.
   * @param {any} cartValue - The value from the cart.
   * @param {any} value - The condition value.
   * @return {boolean} - The result of the operation.
   * @throws {InvalidCriteriaError} - If the operation is unsupported.
   */
  _evaluateOperation(op, cartValue, value) {
    const operation = this.operations[op];
    if (!operation) {
      throw new InvalidCriteriaError(`Unsupported operation: ${op}`);
    }
    return operation(cartValue, value);
  }

  /**
   * Evaluate logical operations (and/or).
   * @param {string} logicalOp - The logical operation ('and' or 'or').
   * @param {any} cartValue - The value from the cart.
   * @param {Object} conditions - The conditions to evaluate.
   * @return {boolean} - The result of the logical operation.
   * @throws {InvalidCriteriaError} - If conditions are not an object.
   */
  _evaluateLogicalOperation(logicalOp, cartValue, conditions) {
    if (!isObject(conditions)) {
      throw new InvalidCriteriaError(`Conditions for logical operation '${logicalOp}' must be an object`);
    }
  
    const logicalOperations = {
      and: 'every',
      or: 'some'
    };
  
    const entries = Object.entries(conditions);
    const method = logicalOperations[logicalOp];
    
    if (!method) {
      return false;
    }
  
    return entries[method](([op, value]) => this._evaluateOperation(op, cartValue, value));
  }

  /**
   * Retrieve the value from the cart based on a dot-notated key.
   * @param {Object} cart - The cart data.
   * @param {string} key - The dot-notated key (e.g., 'products.quantity').
   * @return {any} - The retrieved value or undefined if the key is not found.
   */
  _getValueByKey(cart, key) {
    return key.split('.').reduce((acc, part) => {
      if (Array.isArray(acc)) {
        return acc.map(item => this._getValueByKey(item, part)).flat();
      } else if (acc && typeof acc === 'object') {
        return acc[part];
      } else {
        return undefined;
      }
    }, cart);
  }
}

module.exports = {
  EligibilityService,
};
