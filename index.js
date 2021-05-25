const toStringProto = Object.prototype.toString;

export const isUndefined = (x) =>
  toStringProto.call(x) === '[object Undefined]';

/**
 * @template P
 * @param {P} x
 * @returns {P}
 */
export const identity = (x) => x;

/**
 * @template T
 * @typedef {object} Option
 * @property {string} [operator]
 * @property {string} name
 * @property {(o: T) => T} [handler]
 *
 * @param {string|Option<any>} option
 * @returns {Option<any>}
 */
const getMapper = (option) => {
  if (typeof option === 'string') {
    const [operator, name] = option.split(':');
    if (name) {
      return { operator, name };
    }
    return { operator: null, name: operator };
  }
  if (typeof option === 'number') {
    return { operator: null, name: option };
  }
  const { name, operator } = option;
  return { name, operator };
};

const mapValue =
  (value) =>
  (...args) => {
    if (typeof value === 'function') {
      return value(...args);
    }
    return value;
  };

export function setNamepathValue(object, namepath, value) {
  if (!namepath || !namepath.length) {
    return object;
  }

  const name = namepath[0];
  const nextValue =
    namepath.length === 1
      ? mapValue(value)(object)
      : setNamepathValue(object?.[name], namepath.slice(1), value);

  if (object) {
    if (Array.isArray(object)) {
      const copiedArray = [...object];
      copiedArray[name] = nextValue;
      return copiedArray;
    }
    if (typeof object === 'object') {
      return { ...object, [name]: nextValue };
    }
    return object;
  }

  if (typeof name === 'number') {
    const array = [];
    array[name] = nextValue;
    return array;
  }

  return { [name]: nextValue };
}

const defaultFalse = (x) => x === undefined;

export function getNamepathValue(
  object,
  namepath,
  defaultValue,
  isFalse = defaultFalse
) {
  if (!object) {
    return defaultValue;
  }
  const current = object[namepath[0]];
  if (namepath.length === 1) {
    return isFalse(current) ? defaultValue : current;
  }
  return getNamepathValue(current, namepath.slice(1), defaultValue, isFalse);
}

/**
 * @template T, I
 * @param {T} object
 * @param {Array<string|number>} namepath
 * @param {I|(item: I, index?: number) => I} value
 * @returns {T}
 */
export function mapNamepathValue(object, namepath, value) {
  if (!namepath || !namepath.length || !object) {
    return object;
  }

  const { name, operator } = getMapper(namepath[0]);
  const isFinalName = namepath.length === 1;
  let nextValue = null;

  if (!operator) {
    if (isFinalName) {
      nextValue = mapValue(value)(object);
    } else {
      nextValue = mapNamepathValue(object?.[name], namepath.slice(1), value);
    }
  }

  if (operator === 'map') {
    if (isFinalName) {
      nextValue = object?.[name]?.map(mapValue(value));
    } else {
      nextValue = object?.[name]?.map((item) =>
        mapNamepathValue(item, namepath.slice(1), value)
      );
    }
  }

  if (isUndefined(nextValue)) {
    return object;
  }
  return setNamepathValue(object, [name], nextValue);
}

export const mapIn = (array, namepath, factory) =>
  array.map((item) => mapNamepathValue(item, namepath, factory));

export const stringPath =
  (fn) =>
  (...args) =>
    fn(...args.map(([path, value]) => [path.split('.'), value]));

export const flatArgs =
  (fn) =>
  (...args) =>
    fn(...args.flat());

const composeFn =
  (fn) =>
  (...args) =>
  (context) =>
    args.reduceRight(fn, context);

export const composeMap = composeFn(flatArgs(mapNamepathValue));

export const composeSet = composeFn(flatArgs(setNamepathValue));

export const stringComposeMap = stringPath(composeMap);

export const stringComposeSet = stringPath(composeSet);

