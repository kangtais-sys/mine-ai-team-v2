/**
 * HappyTalk KakaoTalk Webhook Endpoint
 * POST /api/cs/happytalk-webhook
 *
 * Pipeline:
 * Customer(KakaoTalk) -> HappyTalk -> This webhook -> AI Response -> HappyTalk API -> Customer
 *                                                  -> Slack notification
 *                                                  -> Google Sheets logging
 */

function generateCSResponse(message, type) {
  if (type !== 'text') {
    return '이미지/파일을 확인했습니다! 관련 내용을 텍스트로 설명해 주시면 더 정확하게 도움 드릴게요';
  }
  const msg = message.toLowerCase();
  if (/안녕|반가|하이|헬로|hello|hi/.test(msg)) {
    return '안녕하세요! 밀리밀리입니다 500달톤 프로틴 뷰티, 궁금하신 점 편하게 물어보세요!';
  }
  if (/배송|택배|도착|언제 와|언제 오|며칠|shipping|delivery/.test(msg)) {
    return '배송 관련 문의 감사합니다!\n\n국내 배송: 결제 후 1~3일 (영업일 기준)\n해외 배송: 지역에 따라 7~14일\n배송 추적은 발송 문자에 포함된 링크로 확인 가능합니다.\n\n주문번호를 알려주시면 바로 확인해 드릴게요!';
  }
  if (/교환|환불|반품|취소|cancel|refund|return/.test(msg)) {
    return '교환/환불 문의 감사합니다!\n\n수령 후 7일 이내 교환 반품 가능합니다.\n개봉 후에도 품질 이상 시 교환 가능합니다.\n단순 변심 반품은 왕복 배송비 부담이 있습니다.\n\n주문번호와 사유를 알려주시면 바로 처리 도와드릴게요!';
  }
  if (/성분|500달톤|프로틴|콜라겐|단백질|ingredient|protein|dalton/.test(msg)) {
    return '밀리밀리는 500달톤 초저분자 프로틴 기술을 사용합니다!\n\n500달톤은 피부 깊숙이 침투할 수 있는 초저분자 크기예요.\n일반 콜라겐(30만 달톤)보다 600배 작은 크기!\n자세한 성분표는 제품 상세페이지에서 확인하실 수 있습니다.\n\n어떤 제품이 궁금하신가요?';
  }
  if (/가격|얼마|할인|쿠폰|세일|price|discount|sale/.test(msg)) {
    return '가격/할인 문의 감사합니다!\n\n현재 진행 중인 프로모션은 밀리밀리 공식몰과 인스타그램에서 확인하실 수 있어요!\n신규 가입 시 웰컴 쿠폰도 드리고 있으니 놓치지 마세요\n\n특정 제품 가격이 궁금하시면 제품명을 알려주세요!';
  }
  if (/사용법|어떻게 써|바르는|사용 방법|순서|루틴|how to use/.test(msg)) {
    return '제품 사용법 안내드릴게요!\n\n기본 루틴: 클렌저 > 토너 > 세럼 > 크림\n밀리밀리 세럼은 토너 후 2~3방울 적용해 주세요.\n\n어떤 제품의 사용법이 궁금하신가요?';
  }
  if (/트러블|여드름|건조|주름|모공|미백|acne|wrinkle|dry|pore/.test(msg)) {
    return '피부 고민 상담 감사합니다!\n\n밀리밀리는 다양한 피부 고민에 맞는 솔루션을 제공하고 있어요.\n고민을 좀 더 자세히 알려주시면 맞춤 제품을 추천해 드릴게요!';
  }
  if (/주문|결제|order|payment|입금/.test(msg)) {
    return '주문/결제 관련 문의 감사합니다!\n\n주문번호를 알려주시면 현재 상태를 확인해 드릴게요.';
  }
  return '밀리밀리에 문의해 주셔서 감사합니다!\n\n말씀해 주신 내용 확인했습니다. 좀 더 정확한 답변을 위해 담당자가 곧 연락드릴게요.\n급하신 사항이 있으시면 추가로 말씀해 주세요!';
}

async function sendSlackNotification(data) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;
  const payload = {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: 'KakaoTalk CS Alert', emoji: true } },
      { type: 'section', fields: [
        { type: 'mrkdwn', text: '*Customer:*\n' + data.user_key },
        { type: 'mrkdwn', text: '*Type:*\n' + data.type },
        { type: 'mrkdwn', text: '*Time:*\n' + data.time_str },
        { type: 'mrkdwn', text: '*Session:*\n' + data.session_id }
      ]},
      { type: 'section', text: { type: 'mrkdwn', text: '*Message:*\n> ' + data.customer_message } },
      { type: 'section', text: { type: 'mrkdwn', text: '*AI Response:*\n' + data.ai_response.substring(0, 500) } },
      { type: 'divider' }
    ]
  };
  try {
    await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } catch (e) { console.error('Slack failed:', e); }
}

async function logToGoogleSheets(data) {
  const sheetId = process.env.CS_GOOGLE_SHEET_ID;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!sheetId) return;
  const now = new Date(data.timestamp);
  const dateStr = now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
  const timeStr = now.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' });
  const row = [dateStr, timeStr, data.user_key || '', '', '', '', detectCategory(data.customer_message), data.customer_message.substring(0, 200), 'AI 자동응답', 'Y', needsHumanReview(data.customer_message) ? 'Y' : 'N', '', 'AI: ' + data.ai_response.substring(0, 100)];
  try {
    const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheetId + '/values/Sheet1!A:M:append?valueInputOption=USER_ENTERED&key=' + apiKey;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [row] }) });
  } catch (e) { console.error('Sheets failed:', e); }
}

function detectCategory(msg) {
  if (/배송|택배|도착/.test(msg)) return '배송문의';
  if (/교환|환불|반품|취소/.test(msg)) return '교환/환불';
  if (/성분|500달톤|프로틴/.test(msg)) return '제품문의';
  if (/가격|할인|쿠폰|세일/.test(msg)) return '가격/프로모션';
  if (/주문|결제|입금/.test(msg)) return '주문/결제';
  if (/트러블|여드름|건조|주름|모공/.test(msg)) return '피부상담';
  if (/사용법|사용 방법|루틴/.test(msg)) return '사용법';
  return '일반문의';
}

function needsHumanReview(msg) {
  return /불만|클레임|소비자원|법적|고소|불량|파손|알러지|알레르기|피해/.test(msg);
}

async function sendHappytalkResponse(userKey, senderKey, message) {
  const clientId = process.env.HT_CLIENT_ID;
  const clientSecret = process.env.HT_CLIENT_SECRET;
  const apiBase = process.env.HT_API_BASE || 'https://kakao-api.happytalk.io';
  if (!clientId || !clientSecret) { console.error('HT credentials missing'); return null; }
  const serialNumber = 'milli-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  const body = { user_key: userKey, sender_key: senderKey, serial_number: serialNumber, chat_bubble_type: 'TEXT', message: message.substring(0, 1000) };
  try {
    const response = await fetch(apiBase + '/kakaoWebhook/v3/bzc/chat/send/plain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'HT-Client-Id': clientId, 'HT-Client-Secret': clientSecret },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    console.log('HT send result:', result);
    return result;
  } catch (e) { console.error('HT send failed:', e); return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const data = req.body;
    console.log('Webhook received:', JSON.stringify(data));
    const userKey = data.user_key;
    const senderKey = data.sender_key;
    const sessionId = data.session_id;
    const messageType = data.type || 'text';
    const timestamp = data.time || Date.now();
    let customerMessage = '';
    if (data.contents && Array.isArray(data.contents)) {
      if (messageType === 'text') { customerMessage = data.contents.join('\n'); }
      else { customerMessage = '[' + messageType + ' file]'; }
    }
    if (!userKey || !senderKey) return res.status(400).json({ error: 'Missing user_key or sender_key' });
    const aiResponse = generateCSResponse(customerMessage, messageType);
    const timeStr = new Date(timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    await Promise.allSettled([
      sendHappytalkResponse(userKey, senderKey, aiResponse),
      sendSlackNotification({ user_key: userKey, type: messageType, time_str: timeStr, session_id: sessionId, customer_message: customerMessage, ai_response: aiResponse }),
      logToGoogleSheets({ timestamp, user_key: userKey, customer_message: customerMessage, ai_response: aiResponse })
    ]);
    return res.status(200).json({ status: 'ok', message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
