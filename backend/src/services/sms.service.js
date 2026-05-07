import axios from 'axios';
import { normalizePhone } from '../utils/helpers.js';

/**
 * Send General SMS via SMSIndiaHub
 */
export async function sendSms(phone, text, templateId) {
  const normalized = normalizePhone(phone);
  
  if (!process.env.SMS_API_KEY) {
    console.log(`[DEV SMS LOG] To: ${normalized} | Text: ${text}`);
    return { success: true, message: 'SMS logged (dev mode)' };
  }

  try {
    const response = await axios.get('https://cloud.smsindiahub.in/api/mt/SendSMS', {
      params: {
        user:     process.env.SMS_USERNAME,
        APIKey:   process.env.SMS_API_KEY,
        senderid: process.env.SMS_SENDER_ID,
        channel:  2,
        DCS:      0,
        flashsms: 0,
        number:   `91${normalized}`,
        text:     text,
        route:    '2',
        EntityId:   process.env.SMS_ENTITY_ID || '',
        TemplateId: templateId || process.env.SMS_WELCOME_TEMPLATE_ID,
      }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('SMS Error:', error.message);
    return { success: false, message: error.message };
  }
}
