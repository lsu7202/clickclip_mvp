/**
 * 케이스 변환 — flip-flop 박멸의 핵심. (md.md §2-2, backend_spec §3)
 * 백엔드 내부 = camelCase, wire(API JSON) = snake_case.
 * 경계(요청 진입/응답 직전)에서만 이 함수로 변환한다.
 */

const toSnake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

function convertKeysDeep(value, keyFn) {
  if (Array.isArray(value)) {
    return value.map((v) => convertKeysDeep(v, keyFn));
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [keyFn(k), convertKeysDeep(v, keyFn)]),
    );
  }
  return value;
}

const toSnakeCaseDeep = (v) => convertKeysDeep(v, toSnake);
const toCamelCaseDeep = (v) => convertKeysDeep(v, toCamel);

module.exports = { toSnakeCaseDeep, toCamelCaseDeep };
