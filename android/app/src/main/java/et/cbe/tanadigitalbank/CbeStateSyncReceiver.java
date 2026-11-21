package et.cbe.tanadigitalbank;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Receives real-time state sync notifications from sibling APKs (CBE, Messages, Truecaller, Phone)
 * and wakes the active WebView to immediately pull the latest shared state from CbeSyncContentProvider.
 */
public class CbeStateSyncReceiver extends BroadcastReceiver {

    public static final String ACTION_STATE_SYNCED = "et.cbe.ACTION_STATE_SYNCED";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        if (!ACTION_STATE_SYNCED.equals(intent.getAction())) return;
        MainActivity.notifyNativeStateSynced();
    }
}
