package com.medicontrol.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

@CapacitorPlugin(name = "RemoteFirebase")
public class RemoteFirebasePlugin extends Plugin {

    @PluginMethod
    public void configure(PluginCall call) {
        String projectId = call.getString("projectId");
        String appId = call.getString("appId");
        String apiKey = call.getString("apiKey");
        String messagingSenderId = call.getString("messagingSenderId");

        if (isBlank(projectId) || isBlank(appId) || isBlank(apiKey) || isBlank(messagingSenderId)) {
            call.reject("Configuracion de Firebase incompleta");
            return;
        }

        try {
            FirebaseApp existing = null;
            for (FirebaseApp app : FirebaseApp.getApps(getContext())) {
                if ("[DEFAULT]".equals(app.getName())) {
                    existing = app;
                    break;
                }
            }

            if (existing != null) {
                FirebaseOptions current = existing.getOptions();
                boolean same =
                    projectId.equals(current.getProjectId()) &&
                    appId.equals(current.getApplicationId()) &&
                    apiKey.equals(current.getApiKey()) &&
                    messagingSenderId.equals(current.getGcmSenderId());

                if (same) {
                    call.resolve();
                    return;
                }

                existing.delete();
            }

            FirebaseOptions options = new FirebaseOptions.Builder()
                .setProjectId(projectId)
                .setApplicationId(appId)
                .setApiKey(apiKey)
                .setGcmSenderId(messagingSenderId)
                .build();

            FirebaseApp.initializeApp(getContext(), options);
            call.resolve(new JSObject().put("initialized", true));
        } catch (Exception err) {
            call.reject("No se pudo inicializar Firebase: " + err.getMessage(), err);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
