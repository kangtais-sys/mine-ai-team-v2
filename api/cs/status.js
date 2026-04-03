/**
 * CS Pipeline Status Endpoint
 * GET /api/cs/status
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const status = {
    service: 'MILLIMILLI CS AI Pipeline',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      happytalk_webhook: '/api/cs/happytalk-webhook',
      status: '/api/cs/status'
    },
    env_check: {
      SLACK_WEBHOOK_URL: !!process.env.SLACK_WEBHOOK_URL,
      CS_GOOGLE_SHEET_ID: !!process.env.CS_GOOGLE_SHEET_ID,
      HT_CLIENT_ID: !!process.env.HT_CLIENT_ID,
      HT_CLIENT_SECRET: !!process.env.HT_CLIENT_SECRET,
      GOOGLE_SHEETS_API_KEY: !!process.env.GOOGLE_SHEETS_API_KEY
    },
    pipeline: 'Customer(KakaoTalk) -> HappyTalk -> Vercel API -> AI Response -> HappyTalk -> Customer'
  };

  return res.status(200).json(status);
}
