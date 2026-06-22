import client from './client';

/** 전체 작업상태 → zip 다운로드 트리거 */
export async function exportDraft(canvas, scenes) {
  const res = await client.post('/export', { canvas, scenes }, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clickclip.zip';
  a.click();
  URL.revokeObjectURL(url);
}
