import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../components/AppHeader';
import { 
  Plus,
  Edit2,
  Trash2,
  ClipboardList,
  X,
  Check,
} from 'lucide-react-native';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';

interface MetricDefinition {
  id: number;
  name: string;
  label: string;
  minValue: number;
  maxValue: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function SchoolMetricsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { schoolId, schoolName } = useLocalSearchParams();

  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [filteredMetrics, setFilteredMetrics] = useState<MetricDefinition[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMetric, setEditingMetric] = useState<MetricDefinition | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [formLabel, setFormLabel] = useState('');

  const parsedSchoolId = Array.isArray(schoolId) ? Number(schoolId[0]) : Number(schoolId);
  const displaySchoolName = Array.isArray(schoolName) ? schoolName[0] : schoolName;

  useEffect(() => {
    fetchMetrics();
  }, [parsedSchoolId]);

  useEffect(() => {
    // Filtrar métricas baseado na tab ativa
    if (activeTab === 'active') {
      setFilteredMetrics(metrics.filter(m => m.active));
    } else if (activeTab === 'inactive') {
      setFilteredMetrics(metrics.filter(m => !m.active));
    } else {
      setFilteredMetrics(metrics);
    }
  }, [activeTab, metrics]);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<MetricDefinition[]>(`/schools/${parsedSchoolId}/metrics?activeOnly=false`);
      setMetrics(response.data ?? []);
    } catch (e: any) {
      console.log('Falha ao carregar métricas:', e);
      setError('Falha ao carregar métricas.');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingMetric(null);
    setFormLabel('');
    setIsModalVisible(true);
  };

  const openEditModal = (metric: MetricDefinition) => {
    setEditingMetric(metric);
    setFormLabel(metric.label);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingMetric(null);
    setFormLabel('');
  };

  const validateForm = (): boolean => {
    if (!formLabel.trim()) {
      toast.showToast('O rótulo da métrica é obrigatório', 'error');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);

      if (editingMetric) {
        // Update - minValue e maxValue sempre são 1-5 (não configuráveis)
        const payload = {
          label: formLabel.trim(),
        };
        await api.put(`/schools/${parsedSchoolId}/metrics/${editingMetric.id}`, payload);
        toast.showToast('Métrica atualizada com sucesso!', 'success');
      } else {
        // Create - minValue e maxValue sempre são 1-5 (não configuráveis)
        const payload = {
          name: formLabel.trim().toLowerCase().replace(/\s+/g, '_'),
          label: formLabel.trim(),
        };
        await api.post(`/schools/${parsedSchoolId}/metrics`, payload);
        toast.showToast('Métrica criada com sucesso!', 'success');
      }

      closeModal();
      fetchMetrics();
    } catch (e: any) {
      console.log('Erro ao salvar métrica:', e);
      const errorMessage = e.response?.data?.message || 'Falha ao salvar métrica';
      toast.showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = (metric: MetricDefinition) => {
    const action = metric.active ? 'desativar' : 'reativar';
    const actionPast = metric.active ? 'desativada' : 'reativada';
    
    Alert.alert(
      metric.active ? 'Desativar Métrica' : 'Reativar Métrica',
      `Tem certeza que deseja ${action} "${metric.label}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: metric.active ? 'Desativar' : 'Reativar',
          style: metric.active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const endpoint = metric.active ? 'deactivate' : 'reactivate';
              await api.patch(`/schools/${parsedSchoolId}/metrics/${metric.id}/${endpoint}`);
              toast.showToast(`Métrica ${actionPast} com sucesso!`, 'success');
              fetchMetrics();
            } catch (e: any) {
              console.log(`Erro ao ${action} métrica:`, e);
              const errorMessage = e.response?.data?.message || `Falha ao ${action} métrica`;
              toast.showToast(errorMessage, 'error');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (metric: MetricDefinition) => {
    try {
      // Verificar se pode deletar
      const checkResponse = await api.get<{ canDelete: boolean }>(`/schools/${parsedSchoolId}/metrics/${metric.id}/can-delete`);
      const canDelete = checkResponse.data?.canDelete;

      if (!canDelete) {
        Alert.alert(
          'Não é possível deletar',
          'Esta métrica está em uso em turmas e não pode ser deletada. Você pode desativá-la ao invés disso.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Deletar Métrica',
        `Tem certeza que deseja deletar permanentemente "${metric.label}"? Esta ação não pode ser desfeita.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Deletar',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.delete(`/schools/${parsedSchoolId}/metrics/${metric.id}`);
                toast.showToast('Métrica deletada com sucesso!', 'success');
                fetchMetrics();
              } catch (e: any) {
                console.log('Erro ao deletar métrica:', e);
                const errorMessage = e.response?.data?.message || 'Falha ao deletar métrica';
                toast.showToast(errorMessage, 'error');
              }
            },
          },
        ]
      );
    } catch (e: any) {
      console.log('Erro ao verificar se pode deletar:', e);
      toast.showToast('Erro ao verificar se métrica pode ser deletada', 'error');
    }
  };

  const renderMetricCard = ({ item }: { item: MetricDefinition }) => (
    <View style={[styles.metricCard, !item.active && styles.metricCardInactive]}>
      <View style={styles.metricContent}>
        {/* Título com badge INATIVA na mesma linha */}
        <View style={styles.metricTitleRow}>
          <Text style={styles.metricLabel}>{item.label}</Text>

          {/* Right side: inactive badge + action buttons */}
          <View style={styles.rightActionsRow}>
            {!item.active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inativa</Text>
              </View>
            )}

            <View style={styles.metricActions}>
              {/* Botão Editar - só para métricas ativas */}
              {item.active && (
                <TouchableOpacity
                  style={[styles.iconButton, styles.editButton]}
                  onPress={() => openEditModal(item)}
                >
                  <Edit2 size={18} color="#2563EB" />
                </TouchableOpacity>
              )}

              {/* Botão Desativar/Reativar */}
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  item.active ? styles.deactivateButton : styles.reactivateButton,
                ]}
                onPress={() => handleDeactivate(item)}
              >
                {item.active ? (
                  <X size={18} color="#D97706" />
                ) : (
                  <Check size={18} color="#059669" />
                )}
              </TouchableOpacity>

              {/* Botão Deletar */}
              <TouchableOpacity
                style={[styles.iconButton, styles.deleteButton]}
                onPress={() => handleDelete(item)}
              >
                <Trash2 size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader title="Métricas da Escola" showBack />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando métricas...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.schoolName}>{displaySchoolName}</Text>
            <Text style={styles.subtitle}>
              Gerencie as métricas de avaliação desta escola
            </Text>
          </View>

          <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Nova Métrica</Text>
          </TouchableOpacity>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.tabActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                Todas ({metrics.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'active' && styles.tabActive]}
              onPress={() => setActiveTab('active')}
            >
              <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
                Ativas ({metrics.filter(m => m.active).length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'inactive' && styles.tabActive]}
              onPress={() => setActiveTab('inactive')}
            >
              <Text style={[styles.tabText, activeTab === 'inactive' && styles.tabTextActive]}>
                Inativas ({metrics.filter(m => !m.active).length})
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredMetrics}
            renderItem={renderMetricCard}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <ClipboardList size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Nenhuma métrica cadastrada</Text>
                <Text style={styles.emptySubtitle}>
                  Crie métricas para avaliar os alunos
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* Modal para Criar/Editar Métrica */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMetric ? 'Editar Métrica' : 'Nova Métrica'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Rótulo da Métrica *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Linguagem, Matemática, Socialização"
                  placeholderTextColor="#9CA3AF"
                  value={formLabel}
                  onChangeText={setFormLabel}
                />
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Todas as métricas usam escala de 1 a 5 (fixa)
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>
                      {editingMetric ? 'Atualizar' : 'Criar'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  schoolName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#8B5CF6',
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 0,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  metricCardInactive: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    opacity: 0.8,
  },
  metricContent: {
    marginBottom: 12,
  },
  metricTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  inactiveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricActions: {
    flexDirection: 'row',
    gap: 8,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  editButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  deactivateButton: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  reactivateButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    maxHeight: '70%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  form: {
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#8B5CF6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
});
