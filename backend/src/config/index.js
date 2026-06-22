/** 백엔드 설정 — env 한 곳. (backend_spec §7) */
module.exports = {
  port: Number(process.env.PORT) || 4000,
  aiServerUrl: process.env.AI_SERVER_URL || 'http://ai_server:8000',
  giphyApiKey: process.env.GIPHY_API_KEY || '',
  serpapiKey: process.env.SERPAPI_KEY || '',
  workspaceDir: process.env.WORKSPACE_DIR || '/workspace',
  capcutTemplateDir: process.env.CAPCUT_TEMPLATE_DIR || '/templates/0615',

  // 사용자의 실제 CapCut 드래프트 폴더(com.lveditor.draft). 컴퓨터마다 달라 env로 관리.
  // Mac 예: /Users/<you>/Movies/CapCut/User Data/Projects/com.lveditor.draft
  capcutDraftRoot:
    process.env.CAPCUT_DRAFT_ROOT ||
    '/Users/CHANGE_ME/Movies/CapCut/User Data/Projects/com.lveditor.draft',
  // CapCut 시스템 폰트 경로 (자막 스타일). Mac 기본값.
  capcutFontPath:
    process.env.CAPCUT_FONT_PATH ||
    '/Applications/CapCut.app/Contents/Resources/Font/SystemFont/en.ttf',

  // 검색 기본값
  giphyLimit: 20,
  serpapiEngine: 'google_images',

  // export 캔버스 (capcut_export_spec §5-1)
  canvasWidth: 1080,
  canvasHeight: 1920,
};
