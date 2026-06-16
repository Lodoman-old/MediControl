import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@medicontrol/brand";
import { api, extractErrorMessage } from "../lib/api";

type Tab = "notes" | "diagnoses" | "treatments";

interface PatientInfo {
  id: string;
  mrn: string;
  fullName: string;
  bloodType: string | null;
}

interface Note {
  id: string;
  noteDate: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  vitalSigns: Record<string, unknown> | null;
}

interface Diagnosis {
  id: string;
  icd10Code: string;
  description: string;
  type: string;
  status: string;
}

interface Treatment {
  id: string;
  description: string;
  type: string;
  startDate: string;
  endDate: string | null;
  status: string;
}

interface Props {
  onBack: () => void;
  patientId?: string;
}

export default function ExpedienteScreen({ onBack, patientId }: Props) {
  const [tab, setTab] = useState<Tab>("notes");
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const endpoint = patientId ? `/patients/${patientId}` : "/patients/me";
        const { data: p } = await api.get(endpoint);
        const [notesRes, diagRes, treatRes] = await Promise.all([
          api.get(`/clinical-records/${p.id}/notes`).catch(() => ({ data: [] })),
          api.get(`/clinical-records/${p.id}/diagnoses`).catch(() => ({ data: [] })),
          api.get(`/clinical-records/${p.id}/treatments`).catch(() => ({ data: [] })),
        ]);
        setNotes(notesRes.data ?? []);
        setDiagnoses(diagRes.data ?? []);
        setTreatments(treatRes.data ?? []);
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("es-MX", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.primary[500]} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 12 }}>
          <Text style={styles.backText}>← Regresar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{patientId ? "Expediente del paciente" : "Mi expediente"}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {patient && (
              <View style={styles.patientCard}>
                <Text style={styles.patientName}>{patient.fullName}</Text>
                <Text style={styles.patientMeta}>Exp: {patient.mrn}</Text>
                {patient.bloodType && (
                  <Text style={styles.patientMeta}>Sangre: {patient.bloodType}</Text>
                )}
              </View>
            )}

            <View style={styles.tabBar}>
              {(["notes", "diagnoses", "treatments"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tab, tab === t && styles.tabActive]}
                  onPress={() => setTab(t)}
                >
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                    {t === "notes" ? "Notas" : t === "diagnoses" ? "Diagnosticos" : "Tratamientos"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === "notes" && (
              notes.length === 0 ? (
                <Text style={styles.empty}>No hay notas de evolucion</Text>
              ) : (
                notes.map((n) => (
                  <View key={n.id} style={styles.card}>
                    <Text style={styles.cardDate}>{fmtDate(n.noteDate)}</Text>
                    {n.subjective && (
                      <View style={styles.soapBlock}>
                        <Text style={styles.soapLabel}>S</Text>
                        <Text style={styles.soapText}>{n.subjective}</Text>
                      </View>
                    )}
                    {n.objective && (
                      <View style={styles.soapBlock}>
                        <Text style={styles.soapLabel}>O</Text>
                        <Text style={styles.soapText}>{n.objective}</Text>
                      </View>
                    )}
                    {n.assessment && (
                      <View style={styles.soapBlock}>
                        <Text style={styles.soapLabel}>A</Text>
                        <Text style={styles.soapText}>{n.assessment}</Text>
                      </View>
                    )}
                    {n.plan && (
                      <View style={styles.soapBlock}>
                        <Text style={styles.soapLabel}>P</Text>
                        <Text style={styles.soapText}>{n.plan}</Text>
                      </View>
                    )}
                  </View>
                ))
              )
            )}

            {tab === "diagnoses" && (
              diagnoses.length === 0 ? (
                <Text style={styles.empty}>No hay diagnosticos registrados</Text>
              ) : (
                diagnoses.map((d) => (
                  <View key={d.id} style={styles.card}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={styles.diagCode}>{d.icd10Code}</Text>
                      <Text style={styles.diagType}>{d.type}</Text>
                      <Text style={styles.diagStatus}>{d.status}</Text>
                    </View>
                    <Text style={styles.diagDesc}>{d.description}</Text>
                  </View>
                ))
              )
            )}

            {tab === "treatments" && (
              treatments.length === 0 ? (
                <Text style={styles.empty}>No hay tratamientos registrados</Text>
              ) : (
                treatments.map((t) => (
                  <View key={t.id} style={styles.card}>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                      <Text style={styles.badge}>{t.type}</Text>
                      <Text style={styles.badge}>{t.status}</Text>
                    </View>
                    <Text style={{ color: colors.ink[900], fontSize: 14 }}>{t.description}</Text>
                    <Text style={{ color: colors.ink[500], fontSize: 12, marginTop: 4 }}>
                      Inicio: {fmtDate(t.startDate)}
                      {t.endDate ? `  Fin: ${fmtDate(t.endDate)}` : ""}
                    </Text>
                  </View>
                ))
              )
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingVertical: 16, paddingHorizontal: 24,
    paddingTop: Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 28) + 8 : 16,
    borderBottomWidth: 1, borderBottomColor: colors.ink[100],
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  backText: { color: colors.primary[700], fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.ink[900] },
  content: { padding: 16 },
  errorBox: {
    backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1,
    borderRadius: 8, padding: 12, marginBottom: 16,
  },
  errorText: { color: "#B91C1C", fontSize: 13 },
  patientCard: {
    backgroundColor: "#FFFFFF", borderRadius: 10, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.ink[100],
  },
  patientName: { fontSize: 18, fontWeight: "700", color: colors.ink[900] },
  patientMeta: { fontSize: 13, color: colors.ink[500], marginTop: 2 },
  tabBar: {
    flexDirection: "row", marginBottom: 16, borderRadius: 8,
    backgroundColor: colors.ink[50], padding: 2,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 6 },
  tabActive: { backgroundColor: "#FFFFFF" },
  tabText: { fontSize: 13, color: colors.ink[500], fontWeight: "500" },
  tabTextActive: { color: colors.primary[700], fontWeight: "600" },
  empty: { textAlign: "center", color: colors.ink[500], fontSize: 14, marginTop: 40 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 10, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.ink[100],
  },
  cardDate: { fontSize: 11, color: colors.ink[400], marginBottom: 8 },
  soapBlock: { marginBottom: 6 },
  soapLabel: {
    fontWeight: "700", fontSize: 12, color: colors.primary[700],
    marginBottom: 2,
  },
  soapText: { fontSize: 14, color: colors.ink[900] },
  diagCode: { fontFamily: "monospace", fontWeight: "700", color: colors.primary[700], fontSize: 13 },
  diagType: { fontSize: 11, color: colors.ink[600], backgroundColor: colors.ink[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  diagStatus: { fontSize: 11, color: colors.warning[600], backgroundColor: colors.warning[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  diagDesc: { fontSize: 14, color: colors.ink[900], marginTop: 6 },
  badge: {
    fontSize: 11, color: colors.ink[600], backgroundColor: colors.ink[50],
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden",
  },
});
