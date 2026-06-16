import { Component, useEffect, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors, brandName } from "@medicontrol/brand";
import { api, extractErrorMessage } from "./src/lib/api";
import { initSentry, captureError } from "./src/lib/sentry";
import {
  useAuthStore,
  selectIsAuthenticated,
  type AuthUser,
} from "./src/stores/authStore";
import ExpedienteScreen from "./src/screens/ExpedienteScreen";
import PharmacyScreen from "./src/screens/PharmacyScreen";
import DoctorConsultScreen from "./src/screens/DoctorConsultScreen";

initSentry();

interface EBState { error: Error | null }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error, { componentStack: info.componentStack });
  }
  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.center}>
          <Text style={styles.errorTitle}>Error de inicio</Text>
          <Text style={styles.errorDetail}>{this.state.error.message}</Text>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function HydrationGate({ children }: { children: ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hydrated) {
        setHydrated();
        setTimedOut(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [hydrated, setHydrated]);

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary[500]} />
        {timedOut && (
          <Text style={{ marginTop: 12, color: colors.ink[400], fontSize: 13 }}>
            Forzando inicio...
          </Text>
        )}
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <HydrationGate>
        <AppContent />
      </HydrationGate>
    </ErrorBoundary>
  );
}

function AppContent() {
  const isAuthed = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [screen, setScreen] = useState<"home" | "agenda" | "my-appts" | "expediente" | "pharmacy" | "consult" | "view-patient-clinical">("home");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [viewingPatientId, setViewingPatientId] = useState<string | null>(null);

  if (!isAuthed) {
    return <LoginScreen onLoggedIn={setSession} />;
  }

  if (user?.mustChangePassword) {
    return <ChangePasswordScreen />;
  }

  if (showMfaSetup) {
    return <MfaSetupScreen onBack={() => setShowMfaSetup(false)} />;
  }

  if (screen === "agenda") {
    return <AgendaScreen onBack={() => setScreen("home")} onAppointmentPress={(a) => { setSelectedAppointment(a); setScreen("consult"); }} />;
  }

  if (screen === "my-appts") {
    return <PatientAppointmentsScreen onBack={() => setScreen("home")} />;
  }

  if (screen === "expediente") {
    return <ExpedienteScreen onBack={() => setScreen("home")} />;
  }

  if (screen === "consult" && selectedAppointment) {
    return <DoctorConsultScreen appointment={selectedAppointment} onBack={() => { setScreen("agenda"); setSelectedAppointment(null); }} onViewExpediente={(pid) => { setViewingPatientId(pid); setScreen("view-patient-clinical"); }} />;
  }

  if (screen === "view-patient-clinical" && viewingPatientId) {
    return <ExpedienteScreen patientId={viewingPatientId} onBack={() => { setScreen("consult"); setViewingPatientId(null); }} />;
  }

  if (screen === "pharmacy") {
    return <PharmacyScreen onBack={() => setScreen("home")} />;
  }

  return (
    <HomeScreen
      user={user!}
      onLogout={clear}
      onMfaSetup={() => setShowMfaSetup(true)}
      onAgenda={() => setScreen("agenda")}
      onMyAppointments={() => setScreen("my-appts")}
      onExpediente={() => setScreen("expediente")}
      onPharmacy={() => setScreen("pharmacy")}
    />
  );
}

function LoginScreen({
  onLoggedIn,
}: {
  onLoggedIn: (data: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  }) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{
        user?: AuthUser;
        tokens?: { accessToken: string; refreshToken: string };
        mfaRequired?: boolean;
        mfaToken?: string;
      }>("/auth/login", { email, password });
      if (data.mfaRequired && data.mfaToken) {
        setMfaToken(data.mfaToken);
        return;
      }
      if (data.tokens && data.user) {
        onLoggedIn({
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
          user: data.user,
        });
      }
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const onMfaSubmit = async () => {
    if (!mfaToken) return;
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{
        user: AuthUser;
        tokens: { accessToken: string; refreshToken: string };
      }>("/auth/mfa/verify-login", { mfaToken, code: mfaCode });
      onLoggedIn({
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        user: data.user,
      });
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (mfaToken) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Codigo de verificacion</Text>
          <Text style={styles.subtitle}>
            Ingresa el codigo de 6 digitos de tu app autenticadora
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Codigo TOTP</Text>
            <TextInput
              style={[styles.input, { textAlign: "center", fontSize: 28, letterSpacing: 8 }]}
              placeholder="000000"
              placeholderTextColor={colors.ink[400]}
              keyboardType="number-pad"
              maxLength={6}
              value={mfaCode}
              onChangeText={(t) => setMfaCode(t.replace(/\D/g, ""))}
            />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, (loading || mfaCode.length !== 6) && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={onMfaSubmit}
            disabled={loading || mfaCode.length !== 6}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Verificar</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
        <Image
          source={require("./assets/icon.png")}
          style={styles.heroIcon}
          resizeMode="contain"
        />
        <Text style={styles.title}>{brandName}</Text>
        <Text style={styles.subtitle}>Inicia sesion para continuar</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Correo electronico</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@correo.com"
            placeholderTextColor={colors.ink[400]}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Contrasena</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            placeholderTextColor={colors.ink[400]}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Ingresar</Text>
          )}
        </TouchableOpacity>

        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Cuentas demo:</Text>
          <Text style={styles.demoLine}>paciente@medicontrol.mx / Paciente123!Demo</Text>
          <Text style={styles.demoLine}>doctor@medicontrol.mx / Doctor123!Demo</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChangePasswordScreen() {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  const onSubmit = async () => {
    setError(null);
    if (newPass !== confirm) {
      setError("Las contrasenas no coinciden");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: current,
        newPassword: newPass,
      });
      const fresh = await api.get<AuthUser>("/auth/me");
      useAuthStore.getState().setUser(fresh.data);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Cambiar contrasena</Text>
        <Text style={styles.subtitle}>Debes cambiar tu contrasena antes de continuar</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Contrasena actual</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.ink[400]}
            secureTextEntry
            value={current}
            onChangeText={setCurrent}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Nueva contrasena</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.ink[400]}
            secureTextEntry
            value={newPass}
            onChangeText={setNewPass}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Confirmar nueva contrasena</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.ink[400]}
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Cambiar contrasena</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MfaSetupScreen({ onBack }: { onBack: () => void }) {
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"info" | "verify" | "done">("info");

  const onSetup = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{ secret: string; uri: string }>("/auth/mfa/setup");
      setSecret(data.secret);
      setUri(data.uri);
      setStep("verify");
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/mfa/verify", { code });
      setStep("done");
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const onDisable = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/mfa/disable", { password: "", code: "" });
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const headerBack = (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={{ paddingRight: 12 }}>
        <Text style={styles.logoutText}>← Regresar</Text>
      </TouchableOpacity>
      <View style={{ width: 60 }} />
    </View>
  );

  if (step === "done") {
    return (
      <SafeAreaView style={styles.safe}>
        {headerBack}
        <View style={styles.center}>
          <Text style={styles.title}>MFA habilitado</Text>
          <Text style={[styles.subtitle, { marginBottom: 0 }]}>
            En tu proximo inicio de sesion se te pedira un codigo TOTP.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === "verify") {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        {headerBack}
        <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Configurar MFA</Text>
          <Text style={styles.subtitle}>
            Ingresa el codigo de 6 digitos de tu app autenticadora
          </Text>

          <View style={[styles.card, { marginBottom: 16 }]}>
            <Text style={styles.cardLabel}>Clave secreta</Text>
            <Text style={[styles.cardValue, { fontFamily: "monospace", fontSize: 13 }]} selectable>
              {secret}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Codigo TOTP</Text>
            <TextInput
              style={[styles.input, { textAlign: "center", fontSize: 28, letterSpacing: 8 }]}
              placeholder="000000"
              placeholderTextColor={colors.ink[400]}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ""))}
            />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, (loading || code.length !== 6) && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={onVerify}
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Verificar y habilitar</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {headerBack}
      <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Autenticacion de dos factores</Text>
        <Text style={styles.subtitle}>
          Agrega una capa extra de seguridad a tu cuenta.
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={onSetup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Configurar MFA</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeScreen({
  user,
  onLogout,
  onMfaSetup,
  onAgenda,
  onMyAppointments,
  onExpediente,
  onPharmacy,
}: {
  user: AuthUser;
  onLogout: () => void;
  onMfaSetup: () => void;
  onAgenda: () => void;
  onMyAppointments: () => void;
  onExpediente: () => void;
  onPharmacy: () => void;
}) {
  const isDoctor = user.roles.includes("DOCTOR") || user.roles.includes("ADMIN") || user.roles.includes("SUPERADMIN");
  const isPatient = user.roles.includes("PATIENT");

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Image
          source={require("./assets/logo-horizontal.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.homeContent}>
        <Text style={styles.title}>Hola, {user.fullName.split(" ")[0]}</Text>
        <Text style={styles.subtitle}>Sesion activa en {brandName}</Text>

        {isDoctor && (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={onAgenda}
            >
              <Text style={styles.primaryBtnText}>Agenda del dia</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.85}
              onPress={onPharmacy}
            >
              <Text style={styles.secondaryBtnText}>Inventario</Text>
            </TouchableOpacity>
          </>
        )}

        {isPatient && (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={onMyAppointments}
            >
              <Text style={styles.primaryBtnText}>Mis citas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={onExpediente}
            >
              <Text style={styles.primaryBtnText}>Mi expediente</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Email</Text>
          <Text style={styles.cardValue}>{user.email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Roles</Text>
          <Text style={styles.cardValue}>{user.roles.join(", ")}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Permisos ({user.permissions.length})</Text>
          <Text style={styles.cardValueSmall}>{user.permissions.join(", ")}</Text>
        </View>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.85}
          onPress={onMfaSetup}
        >
          <Text style={styles.secondaryBtnText}>Configurar MFA</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function AgendaScreen({ onBack, onAppointmentPress }: { onBack: () => void; onAppointmentPress?: (appointment: any) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({ total: 0, pending: 0, completed: 0, cancelled: 0 });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/appointments/day/${today}`);
        setAppointments(data.appointments ?? []);
        setSummary({
          total: data.total ?? 0,
          pending: data.pending ?? 0,
          completed: data.completed ?? 0,
          cancelled: data.cancelled ?? 0,
        });
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusColor = (status: string) => {
    if (["SCHEDULED", "PAYMENT_PENDING_VALIDATION", "PAID"].includes(status)) return colors.warning[500];
    if (status === "COMPLETED") return colors.success[500];
    if (status === "CANCELED" || status === "NO_SHOW") return colors.danger[500];
    return colors.ink[500];
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={{ paddingRight: 12 }}>
          <Text style={styles.logoutText}>← Regresar</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { fontSize: 18 }]}>Agenda del dia</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 8 }}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardLabel}>Total</Text>
          <Text style={[styles.cardValue, { fontSize: 20 }]}>{summary.total}</Text>
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardLabel}>Pendientes</Text>
          <Text style={[styles.cardValue, { fontSize: 20, color: colors.warning[600] }]}>{summary.pending}</Text>
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardLabel}>Atendidas</Text>
          <Text style={[styles.cardValue, { fontSize: 20, color: colors.success[600] }]}>{summary.completed}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
        {loading ? (
          <ActivityIndicator color={colors.primary[500]} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : appointments.length === 0 ? (
          <Text style={[styles.subtitle, { marginTop: 40 }]}>No hay citas para hoy</Text>
        ) : (
          appointments.map((a: any) => (
            <TouchableOpacity key={a.id} activeOpacity={0.8} onPress={() => onAppointmentPress?.(a)}>
              <View style={styles.card}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={[styles.cardLabel, { fontSize: 13 }]}>
                    {new Date(a.startsAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} - {new Date(a.endsAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  <Text style={{ fontSize: 12, color: statusColor(a.status), fontWeight: "600" }}>
                    {a.status.replace(/_/g, " ")}
                  </Text>
                </View>
                <Text style={styles.cardValue}>{a.patientName}</Text>
                {a.serviceName && <Text style={{ fontSize: 13, color: colors.ink[500] }}>{a.serviceName}</Text>}
                {a.reason && <Text style={{ fontSize: 12, color: colors.ink[400], marginTop: 4 }}>{a.reason}</Text>}
                <Text style={{ color: colors.primary[600], fontSize: 13, fontWeight: "500", marginTop: 8 }}>
                  Iniciar consulta
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PatientAppointmentsScreen({ onBack }: { onBack: () => void }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/appointments", {
          params: { limit: 50 },
        });
        const userAppts = (data?.data ?? []).filter(
          (a: any) => a.patientName?.toLowerCase().includes((user?.fullName ?? "").toLowerCase().split(" ")[0]?.toLowerCase() ?? ""),
        );
        setAppointments(userAppts.length > 0 ? userAppts : (data?.data ?? []));
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cancelAppt = async (id: string) => {
    try {
      await api.patch(`/appointments/${id}`, { status: "CANCELED" });
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "CANCELED" } : a)));
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 12 }}>
          <Text style={styles.logoutText}>← Regresar</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { fontSize: 18 }]}>Mis citas</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator color={colors.primary[500]} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : appointments.length === 0 ? (
          <Text style={[styles.subtitle, { marginTop: 40 }]}>No tienes citas registradas</Text>
        ) : (
          appointments.map((a: any) => (
            <View key={a.id} style={styles.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[styles.cardLabel, { fontSize: 13 }]}>
                  {new Date(a.startsAt).toLocaleDateString("es-MX")} - {new Date(a.startsAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                </Text>
                <Text style={{ fontSize: 12, color: a.status === "CANCELED" ? colors.danger[500] : colors.success[500], fontWeight: "600" }}>
                  {a.status.replace(/_/g, " ")}
                </Text>
              </View>
              <Text style={styles.cardValue}>{a.doctorName}</Text>
              {a.serviceName && <Text style={{ fontSize: 13, color: colors.ink[500] }}>{a.serviceName}</Text>}
              {(a.status === "SCHEDULED" || a.status === "PAYMENT_PENDING_VALIDATION") && (
                <TouchableOpacity
                  style={{ marginTop: 8 }}
                  onPress={() => cancelAppt(a.id)}
                >
                  <Text style={{ color: colors.danger[600], fontSize: 13, fontWeight: "500" }}>Cancelar cita</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 28) + 8 : 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink[100],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    height: 36,
    width: 180,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: colors.primary[700],
    fontWeight: "600",
  },
  loginContent: {
    padding: 24,
    paddingTop: 32,
  },
  homeContent: {
    padding: 24,
  },
  heroIcon: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink[900],
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: colors.ink[500],
    textAlign: "center",
    marginTop: 4,
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: colors.ink[700],
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.ink[200],
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink[900],
    backgroundColor: "#FFFFFF",
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
  },
  primaryBtn: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary[500],
    marginTop: 8,
  },
  secondaryBtnText: {
    color: colors.primary[600],
    fontSize: 15,
    fontWeight: "600",
  },
  demoBox: {
    marginTop: 24,
    padding: 12,
    backgroundColor: colors.ink[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.ink[100],
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink[700],
    marginBottom: 4,
  },
  demoLine: {
    fontSize: 11,
    color: colors.ink[500],
    fontFamily: "monospace",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.ink[100],
  },
  cardLabel: {
    fontSize: 12,
    color: colors.ink[500],
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 15,
    color: colors.ink[900],
    fontWeight: "500",
  },
  cardValueSmall: {
    fontSize: 12,
    color: colors.ink[700],
    fontFamily: "monospace",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.danger[500],
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 13,
    color: colors.ink[600],
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
