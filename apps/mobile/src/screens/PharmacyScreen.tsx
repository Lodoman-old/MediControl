import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

interface Medication {
  id: string; name: string; sku: string; presentation: string;
  activeIngredient?: string; concentration?: string;
  requiresPrescription: boolean; price: number; isActive: boolean;
}

interface Batch {
  id: string; batchNumber: string; currentStock: number;
  expiryDate: string; medicationId: string;
  medication?: Medication;
}

export default function PharmacyScreen({ onBack }: { onBack: () => void }) {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMed, setExpandedMed] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [medsRes, batchesRes] = await Promise.all([
          api.get<Medication[]>("/pharmacy/medications?active=true"),
          api.get<Batch[]>("/pharmacy/batches"),
        ]);
        setMeds(medsRes.data ?? []);
        setBatches(batchesRes.data ?? []);
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getStock = (medId: string) => {
    const medBatches = batches.filter((b) => b.medicationId === medId);
    const total = medBatches.reduce((s, b) => s + b.currentStock, 0);
    const minDate = medBatches
      .filter((b) => b.currentStock > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0];
    return { total, batchCount: medBatches.length, nearestExpiry: minDate?.expiryDate ?? null };
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 12 }}>
          <Text style={styles.logoutText}>← Regresar</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { fontSize: 18 }]}>Inventario</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator color={colors.primary[500]} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : meds.length === 0 ? (
          <Text style={[styles.subtitle, { marginTop: 40 }]}>No hay medicamentos registrados</Text>
        ) : (
          meds.map((m) => {
            const stock = getStock(m.id);
            const isExpanded = expandedMed === m.id;
            const medBatches = batches.filter((b) => b.medicationId === m.id);
            return (
              <TouchableOpacity
                key={m.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => setExpandedMed(isExpanded ? null : m.id)}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{m.name}</Text>
                    <Text style={styles.medDetail}>{m.presentation}{m.concentration ? ` ${m.concentration}` : ""}</Text>
                    {m.activeIngredient && (
                      <Text style={styles.medDetail}>Principio activo: {m.activeIngredient}</Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.stockValue, { color: stock.total > 0 ? colors.success[600] : colors.danger[600] }]}>
                      {stock.total} uds
                    </Text>
                    <Text style={styles.medDetail}>${Number(m.price).toLocaleString("es-MX")}</Text>
                    {m.requiresPrescription && (
                      <Text style={{ fontSize: 10, color: colors.warning[600], fontWeight: "600", marginTop: 2 }}>Rx</Text>
                    )}
                  </View>
                </View>

                {isExpanded && medBatches.length > 0 && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.ink[100] }}>
                    <Text style={styles.batchHeader}>Lotes ({medBatches.length})</Text>
                    {medBatches.map((b) => (
                      <View key={b.id} style={styles.batchRow}>
                        <Text style={styles.batchText}>Lote: {b.batchNumber}</Text>
                        <Text style={[styles.batchText, { color: b.currentStock > 0 ? colors.success[600] : colors.danger[600] }]}>
                          Stock: {b.currentStock}
                        </Text>
                        <Text style={styles.batchText}>Vence: {formatDate(b.expiryDate)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {isExpanded && stock.nearestExpiry && (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.ink[100] }}>
                    <Text style={{ fontSize: 12, color: colors.ink[500] }}>
                      Proximo vencimiento: {formatDate(stock.nearestExpiry)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
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
  logoutText: {
    color: colors.primary[700],
    fontWeight: "600",
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.ink[100],
  },
  medName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink[900],
  },
  medDetail: {
    fontSize: 12,
    color: colors.ink[500],
    marginTop: 2,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  batchHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink[700],
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  batchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  batchText: {
    fontSize: 12,
    color: colors.ink[600],
  },
});
