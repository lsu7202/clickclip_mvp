/**
 * API 클라이언트 — snake↔camel 변환 단 한 곳. (frontend_spec §2)
 * 컴포넌트/스토어는 camelCase만 본다.
 */
import axios from 'axios';

const toSnake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

function convertKeys(value, keyFn) {
  if (Array.isArray(value)) return value.map((v) => convertKeys(v, keyFn));
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [keyFn(k), convertKeys(v, keyFn)]),
    );
  }
  return value;
}
export const toSnakeDeep = (v) => convertKeys(v, toSnake);
export const toCamelDeep = (v) => convertKeys(v, toCamel);

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// 백엔드가 정적 서빙하는 에셋/TTS 파일 URL (localPath → /files/<localPath>)
const ORIGIN = BASE_URL.replace(/\/api\/?$/, '');
export const assetUrl = (localPath) => `${ORIGIN}/files/${localPath}`;

const client = axios.create({ baseURL: BASE_URL });

// 요청: camel → snake / 응답: snake → camel
client.interceptors.request.use((cfg) => {
  // FormData(업로드)는 변환하지 않음
  if (cfg.data && !(cfg.data instanceof FormData)) cfg.data = toSnakeDeep(cfg.data);
  if (cfg.params) cfg.params = toSnakeDeep(cfg.params);
  return cfg;
});
client.interceptors.response.use((res) => {
  if (res.data && res.config.responseType !== 'blob') res.data = toCamelDeep(res.data);
  return res;
});

export default client;
