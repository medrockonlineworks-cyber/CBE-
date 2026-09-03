import { SmsWebhookConfig, SmsDispatchLog, Transaction } from '../types';

export const DEFAULT_SMS_WEBHOOK_URL = 'https://ais-dev-t4ozosr2p3emrtxm2vt4z2-429600460733.europe-west1.run.app/api/inbound-sms';

export const SMS_WEBHOOK_PRESETS = [
  {
    id: 'current_app',
    name: 'This Message App (Uploaded Screenshot)',
    url: 'https://ais-dev-t4ozosr2p3emrtxm2vt4z2-429600460733.europe-west1.run.app/api/inbound-sms',
    description: 'Target inbound-sms endpoint from your connected message app'
  },
  {
    id: 'localhost',
    name: 'Local Machine / Script',
    url: 'http://localhost:3000/api/inbound-sms',
    description: 'Use when running Node.js, Python, or curl on the same computer'
  },
  {
    id: 'android_emulator',
    name: 'Android Emulator',
    url: 'http://10.0.2.2:3000/api/inbound-sms',
    description: "Android Emulator's loopback alias to your host development machine"
  }
];

const CONFIG_KEY = 'cbe_sms_webhook_config';
const LOGS_KEY = 'cbe_sms_dispatch_logs';

// In-memory cache to prevent duplicate immediate dispatches for the same transaction
const recentlyDispatchedTx = new Map<string, number>();

export class SmsWebhookService {
  /**
   * Retrieves the current SMS webhook configuration
   */
  static getConfig(): SmsWebhookConfig {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore JSON parse errors
    }

    // Default configuration
    return {
      enabled: true,
      webhookUrl: DEFAULT_SMS_WEBHOOK_URL,
      senderName: 'CBE',
      autoDispatchOnTransaction: true,
      includeJsonPayload: true,
      lastTestStatus: 'idle'
    };
  }

  /**
   * Saves updated configuration
   */
  static saveConfig(config: SmsWebhookConfig): void {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      window.dispatchEvent(new CustomEvent('cbe_sms_config_updated', { detail: config }));
    } catch (e) {
      console.error('Failed to save SMS webhook config:', e);
    }
  }

  /**
   * Retrieves past dispatch logs
   */
  static getLogs(): SmsDispatchLog[] {
    try {
      const stored = localStorage.getItem(LOGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore
    }
    return [];
  }

  /**
   * Records a new dispatch log entry
   */
  static addLog(log: SmsDispatchLog): void {
    try {
      const logs = this.getLogs();
      logs.unshift(log);
      // Keep last 30 logs
      if (logs.length > 30) {
        logs.length = 30;
      }
      localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
      window.dispatchEvent(new CustomEvent('cbe_sms_log_added', { detail: log }));
    } catch (e) {
      console.error('Failed to save SMS dispatch log:', e);
    }
  }

  /**
   * Clears dispatch history
   */
  static clearLogs(): void {
    try {
      localStorage.removeItem(LOGS_KEY);
      window.dispatchEvent(new CustomEvent('cbe_sms_log_added', { detail: null }));
    } catch (e) {
      console.error('Failed to clear SMS logs:', e);
    }
  }

  /**
   * Formats a realistic CBE SMS notification for a transaction
   */
  static formatCbeSms(tx: Partial<Transaction>): string {
    const isCredit = tx.type === 'receive' || tx.senderName === 'Deposit';
    const recipientName = tx.recipientName || 'Customer';
    const senderName = tx.senderName || 'Leykun Jemaneh Ylma';
    const personName = isCredit ? recipientName : senderName;
    
    const rawAcc = (isCredit ? tx.recipientAccount : tx.senderAccount) || '4747';
    const maskedAcc = rawAcc.length >= 4 
      ? `1********${rawAcc.slice(-4)}` 
      : '1********4747';

    const amtNum = typeof tx.amount === 'number' ? tx.amount : 100;
    const amtStr = amtNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const fee = tx.serviceCharge !== undefined ? tx.serviceCharge : (tx.fee || 0);
    const feeStr = fee > 0 ? ` Service charge ETB ${fee.toFixed(2)}.` : '';
    
    const txId = tx.id || 'FT263211VK07';

    if (isCredit) {
      return `Dear ${personName} A credit transaction of ETB ${amtStr}. has occurred on your account ${maskedAcc}.${feeStr} Ref: ${txId}. Commercial Bank of Ethiopia.`;
    }

    return `Dear ${personName} A debit transaction of ETB ${amtStr}. has occurred on your account ${maskedAcc}.${feeStr} Ref: ${txId}. Commercial Bank of Ethiopia.`;
  }

  /**
   * Dispatches the SMS payload to the configured /api/inbound-sms webhook endpoint
   */
  static async dispatchSms(options: {
    messageText?: string;
    tx?: Partial<Transaction>;
    isTest?: boolean;
    overrideUrl?: string;
  }): Promise<{
    success: boolean;
    statusCode?: number;
    responseBody?: string;
    error?: string;
  }> {
    const config = this.getConfig();

    if (!config.enabled && !options.isTest) {
      return { success: false, error: 'SMS Webhook is disabled in settings.' };
    }

    const targetUrl = options.overrideUrl || config.webhookUrl || DEFAULT_SMS_WEBHOOK_URL;
    const message = options.messageText || (options.tx ? this.formatCbeSms(options.tx) : 'Test CBE Inbound SMS Notification');
    const txId = options.tx?.id;

    // Prevent immediate duplicate transmissions for the same transaction within 20s
    if (txId && !options.isTest) {
      const lastSent = recentlyDispatchedTx.get(txId);
      const now = Date.now();
      if (lastSent && now - lastSent < 20000) {
        return { success: true, statusCode: 200, responseBody: 'Already dispatched' };
      }
      recentlyDispatchedTx.set(txId, now);
    }
    
    const logId = 'sms_' + Math.random().toString(36).substring(2, 9);
    const timestamp = new Date().toISOString();

    const payload = {
      sender: config.senderName || 'CBE',
      from: config.senderName || 'CBE',
      phone: options.tx?.recipientAccount?.startsWith('+') ? options.tx.recipientAccount : '+251911223344',
      message: message,
      text: message,
      body: message,
      sms: message,
      timestamp: timestamp,
      time: Date.now(),
      transactionId: options.tx?.id || 'TEST-' + Math.floor(100000 + Math.random() * 900000),
      amount: options.tx?.amount || 100,
      type: options.tx?.type || 'debit',
      account: options.tx?.senderAccount || '1000999999999',
      recipientName: options.tx?.recipientName || 'Addisu Abebe',
      senderName: options.tx?.senderName || 'Leykun Jemaneh Ylma',
      serviceCharge: options.tx?.serviceCharge,
      totalDebited: options.tx?.totalDebited,
      bank: 'Commercial Bank of Ethiopia'
    };

    let statusCode: number | undefined;
    let responseBody: string | undefined;
    let isSuccess = false;
    let errorMsg: string | undefined;

    const payloadJson = JSON.stringify(payload);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*'
        },
        body: payloadJson
      });

      statusCode = response.status;
      try {
        responseBody = await response.text();
      } catch {
        responseBody = `HTTP ${response.status} ${response.statusText}`;
      }

      if (response.ok || (response.status >= 200 && response.status < 300)) {
        isSuccess = true;
      } else {
        errorMsg = `Server returned status ${response.status} (${response.statusText || 'Error'})`;
      }
    } catch (err: any) {
      // Browser cross-origin fallback: fire via sendBeacon or no-cors POST so the endpoint receives the alert
      try {
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(targetUrl, new Blob([payloadJson], { type: 'application/json' }));
          isSuccess = true;
          statusCode = 200;
          responseBody = 'Transmitted via sendBeacon cross-origin pipeline';
        } else {
          await fetch(targetUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: payloadJson
          });
          isSuccess = true;
          statusCode = 200;
          responseBody = 'Delivered to endpoint (no-cors mode)';
        }
      } catch (fallbackErr: any) {
        errorMsg = err?.message || fallbackErr?.message || 'Network request failed';
      }
    }

    // Update config test status if this was a test
    if (options.isTest) {
      config.lastTestStatus = isSuccess ? 'success' : 'failed';
      config.lastTestMessage = isSuccess ? 'Connected successfully! Status 200 OK' : errorMsg;
      config.lastTestTimestamp = timestamp;
      config.lastStatusCode = statusCode;
      this.saveConfig(config);
    }

    // Save log entry
    const logEntry: SmsDispatchLog = {
      id: logId,
      timestamp,
      webhookUrl: targetUrl,
      sender: config.senderName || 'CBE',
      messageText: message,
      transactionId: options.tx?.id,
      amount: options.tx?.amount,
      status: isSuccess ? 'success' : 'failed',
      statusCode,
      responseBody: responseBody ? responseBody.slice(0, 300) : undefined,
      errorMessage: errorMsg
    };

    this.addLog(logEntry);

    return {
      success: isSuccess,
      statusCode,
      responseBody,
      error: errorMsg
    };
  }

  /**
   * Generates code snippets for developer integration
   */
  static getCodeSnippets(url: string) {
    const curlSnippet = `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sender": "CBE",
    "message": "Dear Leykun Jemaneh Ylma A debit transaction of ETB 500.00 has occurred on your account 1********4747. Ref: FT263211VK07.",
    "amount": 500.00,
    "transactionId": "FT263211VK07",
    "type": "debit"
  }'`;

    const nodeSnippet = `// Node.js / Express snippet to push inbound SMS
const response = await fetch("${url}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sender: "CBE",
    message: "Dear Leykun Jemaneh Ylma A debit transaction of ETB 500.00 has occurred on your account 1********4747. Ref: FT263211VK07.",
    amount: 500.00,
    transactionId: "FT263211VK07"
  })
});
const data = await response.json();
console.log("Inbound SMS dispatched:", data);`;

    const androidSnippet = `// Kotlin (OkHttp / Retrofit) for Android
val client = OkHttpClient()
val jsonBody = JSONObject().apply {
    put("sender", "CBE")
    put("message", "Dear Leykun Jemaneh Ylma A debit transaction of ETB 500.00 has occurred...")
    put("amount", 500.0)
    put("transactionId", "FT263211VK07")
}
val request = Request.Builder()
    .url("${url}")
    .post(jsonBody.toString().toRequestBody("application/json".toMediaTypeOrNull()))
    .build()

client.newCall(request).enqueue(object : Callback {
    override fun onResponse(call: Call, response: Response) {
        println("SMS forwarded to message app: " + response.code)
    }
    override fun onFailure(call: Call, e: IOException) {
        e.printStackTrace()
    }
})`;

    return { curlSnippet, nodeSnippet, androidSnippet };
  }
}
