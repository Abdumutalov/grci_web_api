/**
 * Порт public/helpers/collectionFactory.js (`deep`) и public/refer/action.js.
 *
 * Рекурсивно копирует объект/массив, заменяя null → "" в объектах и
 * преобразуя ключи согласно action:
 *   1 — lowerCase, 2 — upperCase, 3 — camelCase (lower + словарь objType).
 * Как и в оригинале, action применяется только к объектам верхнего уровня
 * (элементам массива): вложенные значения копируются без преобразования ключей.
 */
export const objAction = {
  lowerCase: 1,
  upperCase: 2,
  camelCase: 3,
} as const;

export const objType: Record<string, string> = {
  user_: 'user',
  fullname: 'fullName',
  typename: 'typeName',
  bankname: 'bankName',
  branchname: 'branchName',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deep(value: any, action?: number): any {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deep(item, action));
  }
  return deepObject(value, action);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepObject(source: Record<string, any>, action?: number): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  Object.keys(source).forEach((key) => {
    let value = source[key];
    if (value === null) {
      value = '';
    }
    if (action === 1) {
      result[key.toLowerCase()] = deep(value);
    } else if (action === 2) {
      result[key.toUpperCase()] = deep(value);
    } else if (action === 3) {
      const jsKey = key.toLowerCase();
      result[objType[jsKey] || jsKey] = deep(value);
    } else {
      result[key] = deep(value);
    }
  });
  return result;
}
