import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { colors } from "@medicontrol/brand";
import { api, extractErrorMessage } from "../lib/api";

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  patientName: string | null;
  patientId: string;
  serviceName: string | null;
  reason: string | null;
}

interface Props {
  appointment: Appointment;
  onBack: () => void;
  onViewExpediente?: (patientId: string) => void;
}

export default function DoctorConsultScreen({ appointment, onBack, onViewExpediente }: Props) {
  const [step, setStep] = useState<"info" | "consult" | "soap" | "diagnosis" | "prescription">("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(appointment.status);

  const statusColor = (s: string) => {
    if (["SCHEDULED", "PAYMENT_PENDING_VALIDATION", "PAID"].includes(s)) return colors.warning[500];
    if (s === "IN_CONSULT") return colors.info[500];
    if (s === "COMPLETED") return colors.success[500];
    if (s === "CANCELED" || s === "NO_SHOW") return colors.danger[500];
    return colors.ink[500];
  };

  const handleStartConsult = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.patch(`/appointments/${appointment.id}/start-consult`);
      setCurrentStatus("IN_CONSULT");
      setStep("consult");
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleNoShow = async () => {
    Alert.alert("Registrar inasistencia", "Confirmar que el paciente no asistio?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.patch(`/appointments/${appointment.id}/no-show`);
            onBack();
          } catch (e) {
            setError(extractErrorMessage(e));
          }
        },
      },
    ]);
  };

  const handleCompleteConsult = async () => {
    Alert.alert("Finalizar consulta", "Confirmar que la consulta ha terminado?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Finalizar",
        onPress: async () => {
          try {
            await api.patch(`/appointments/${appointment.id}/complete-consult`);
            setCurrentStatus("COMPLETED");
            onBack();
          } catch (e) {
            setError(extractErrorMessage(e));
          }
        },
      },
    ]);
  };

  if (step === "info" && currentStatus === "IN_CONSULT") {
    setStep("consult");
  }

  if (step === "info") {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={{ paddingRight: 12 }}>
            <Text style={styles.headerBtn}>← Regresar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cita</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Paciente</Text>
            <Text style={styles.cardValue}>{appointment.patientName}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Horario</Text>
            <Text style={styles.cardValue}>
              {new Date(appointment.startsAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              {" - "}
              {new Date(appointment.endsAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Servicio</Text>
            <Text style={styles.cardValue}>{appointment.serviceName ?? "No especificado"}</Text>
          </View>
          {appointment.reason && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Motivo</Text>
              <Text style={styles.cardValue}>{appointment.reason}</Text>
            </View>
          )}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Estado</Text>
            <Text style={[styles.cardValue, { color: statusColor(currentStatus) }]}>
              {currentStatus.replace(/_/g, " ")}
            </Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {["SCHEDULED", "PAYMENT_PENDING_VALIDATION", "PAID", "CHECKED_IN"].includes(currentStatus) && (
            <>
              <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={handleStartConsult} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Iniciar consulta</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85} onPress={handleNoShow}>
                <Text style={styles.secondaryBtnText}>Registrar inasistencia</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === "consult") {
    return <ConsultActions appointment={appointment} onBack={() => setStep("info")} onComplete={handleCompleteConsult} onViewExpediente={onViewExpediente} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep("consult")} style={{ paddingRight: 12 }}>
          <Text style={styles.headerBtn}>← Regresar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consulta</Text>
        <View style={{ width: 60 }} />
      </View>
      <Text>Paso: {step}</Text>
    </SafeAreaView>
  );
}

function ConsultActions({ appointment, onBack, onComplete, onViewExpediente }: {
  appointment: Appointment;
  onBack: () => void;
  onComplete: () => void;
  onViewExpediente?: (patientId: string) => void;
}) {
  const [showSoap, setShowSoap] = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [showPrescription, setShowPrescription] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 12 }}>
          <Text style={styles.headerBtn}>← Finalizar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consulta activa</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Paciente</Text>
          <Text style={[styles.cardValue, { fontSize: 18 }]}>{appointment.patientName}</Text>
        </View>

        {showSoap ? (
          <SoapForm appointmentId={appointment.id} patientId={appointment.patientId} onBack={() => setShowSoap(false)} />
        ) : (
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => setShowSoap(true)}>
            <Text style={styles.primaryBtnText}>Nota SOAP</Text>
          </TouchableOpacity>
        )}

        {showDiagnosis ? (
          <DiagnosisForm appointmentId={appointment.id} patientId={appointment.patientId} onBack={() => setShowDiagnosis(false)} />
        ) : (
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => setShowDiagnosis(true)}>
            <Text style={styles.primaryBtnText}>Agregar diagnostico</Text>
          </TouchableOpacity>
        )}

        {showPrescription ? (
          <PrescriptionForm patientId={appointment.patientId} onBack={() => setShowPrescription(false)} />
        ) : (
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => setShowPrescription(true)}>
            <Text style={styles.primaryBtnText}>Recetar medicamento</Text>
          </TouchableOpacity>
        )}

        {onViewExpediente && (
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85} onPress={() => onViewExpediente(appointment.patientId)}>
            <Text style={styles.secondaryBtnText}>Ver expediente del paciente</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.completeBtn} activeOpacity={0.85} onPress={onComplete}>
          <Text style={styles.completeBtnText}>Finalizar consulta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SoapForm({ appointmentId, patientId, onBack }: { appointmentId: string; patientId: string; onBack: () => void }) {
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    if (!subjective && !objective && !assessment && !plan) return;
    setError(null);
    setLoading(true);
    try {
      await api.post(`/clinical-records/${patientId}/notes`, {
        appointmentId,
        noteDate: new Date().toISOString(),
        subjective: subjective || undefined,
        objective: objective || undefined,
        assessment: assessment || undefined,
        plan: plan || undefined,
      });
      setDone(true);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Nota SOAP guardada</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
          <Text style={styles.secondaryBtnText}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Nota SOAP</Text>

      <Text style={styles.fieldLabel}>Subjetivo (S)</Text>
      <TextInput style={styles.textArea} multiline value={subjective} onChangeText={setSubjective} placeholder="Sintomas, motivo de consulta..." placeholderTextColor={colors.ink[400]} />

      <Text style={styles.fieldLabel}>Objetivo (O)</Text>
      <TextInput style={styles.textArea} multiline value={objective} onChangeText={setObjective} placeholder="Signos vitales, hallazgos..." placeholderTextColor={colors.ink[400]} />

      <Text style={styles.fieldLabel}>Evaluacion (A)</Text>
      <TextInput style={styles.textArea} multiline value={assessment} onChangeText={setAssessment} placeholder="Diagnostico, impresion clinica..." placeholderTextColor={colors.ink[400]} />

      <Text style={styles.fieldLabel}>Plan (P)</Text>
      <TextInput style={styles.textArea} multiline value={plan} onChangeText={setPlan} placeholder="Tratamiento, estudios, seguimiento..." placeholderTextColor={colors.ink[400]} />

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

      <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.6 }]} onPress={onSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Guardar nota</Text>}
      </TouchableOpacity>
    </View>
  );
}

function DiagnosisForm({ appointmentId, patientId, onBack }: { appointmentId: string; patientId: string; onBack: () => void }) {
  const [icd10Code, setIcd10Code] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    if (!icd10Code || !description) return;
    setError(null);
    setLoading(true);
    try {
      await api.post(`/clinical-records/${patientId}/diagnoses`, {
        appointmentId,
        icd10Code,
        description,
        type: "PRINCIPAL",
        status: "ACTIVE",
      });
      setDone(true);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Diagnostico guardado</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
          <Text style={styles.secondaryBtnText}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Diagnostico</Text>
      <Text style={styles.fieldLabel}>Codigo ICD-10</Text>
      <TextInput style={styles.input} value={icd10Code} onChangeText={setIcd10Code} placeholder="Ej: J45.0" placeholderTextColor={colors.ink[400]} />
      <Text style={styles.fieldLabel}>Descripcion</Text>
      <TextInput style={styles.textArea} multiline value={description} onChangeText={setDescription} placeholder="Descripcion del diagnostico..." placeholderTextColor={colors.ink[400]} />
      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
      <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.6 }]} onPress={onSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Guardar diagnostico</Text>}
      </TouchableOpacity>
    </View>
  );
}

function PrescriptionForm({ patientId, onBack }: { patientId: string; onBack: () => void }) {
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [indications, setIndications] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!medication || !dosage || !frequency) return;
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/prescriptions", {
        patientId,
        medication,
        dosage,
        frequency,
        duration: duration || undefined,
        indications: indications || undefined,
        quantity: 1,
      });
      setCreatedId(data.id);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (createdId) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Receta creada</Text>
        <Text style={styles.cardValue}>{medication} - {dosage}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }]} onPress={onBack}>
            <Text style={styles.secondaryBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Receta</Text>
      <Text style={styles.fieldLabel}>Medicamento</Text>
      <TextInput style={styles.input} value={medication} onChangeText={setMedication} placeholder="Nombre del medicamento" placeholderTextColor={colors.ink[400]} />
      <Text style={styles.fieldLabel}>Dosis</Text>
      <TextInput style={styles.input} value={dosage} onChangeText={setDosage} placeholder="Ej: 400mg" placeholderTextColor={colors.ink[400]} />
      <Text style={styles.fieldLabel}>Frecuencia</Text>
      <TextInput style={styles.input} value={frequency} onChangeText={setFrequency} placeholder="Ej: Cada 8 horas" placeholderTextColor={colors.ink[400]} />
      <Text style={styles.fieldLabel}>Duracion</Text>
      <TextInput style={styles.input} value={duration} onChangeText={setDuration} placeholder="Ej: 7 dias" placeholderTextColor={colors.ink[400]} />
      <Text style={styles.fieldLabel}>Indicaciones</Text>
      <TextInput style={styles.textArea} multiline value={indications} onChangeText={setIndications} placeholder="Indicaciones adicionales..." placeholderTextColor={colors.ink[400]} />
      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
      <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.6 }]} onPress={onSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Crear receta</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { paddingVertical: 16, paddingHorizontal: 24, paddingTop: Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 28) + 8 : 16, borderBottomWidth: 1, borderBottomColor: colors.ink[100], flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerBtn: { color: colors.primary[700], fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.ink[900] },
  card: { backgroundColor: "#FFF", borderRadius: 10, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.ink[100] },
  cardLabel: { fontSize: 12, color: colors.ink[500], marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  cardValue: { fontSize: 15, color: colors.ink[900], fontWeight: "500" },
  input: { borderWidth: 1, borderColor: colors.ink[200], borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.ink[900], backgroundColor: "#FFF", marginBottom: 8 },
  textArea: { borderWidth: 1, borderColor: colors.ink[200], borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.ink[900], backgroundColor: "#FFF", minHeight: 80, marginBottom: 8, textAlignVertical: "top" },
  fieldLabel: { fontSize: 13, color: colors.ink[700], marginBottom: 4, fontWeight: "500" },
  primaryBtn: { backgroundColor: colors.primary[500], paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  secondaryBtn: { paddingVertical: 14, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: colors.primary[500], marginTop: 8 },
  secondaryBtnText: { color: colors.primary[600], fontSize: 15, fontWeight: "600" },
  completeBtn: { backgroundColor: colors.success[600], paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 16 },
  completeBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  errorBox: { backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: "#B91C1C", fontSize: 13 },
});
