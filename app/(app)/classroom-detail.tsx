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
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../components/AppHeader';
import { 
  User, 
  ClipboardList,
  Calendar,
  TrendingUp,
  Settings as SettingsIcon,
  X,
  Plus,
  Minus,
  CheckCircle2,
} from 'lucide-react-native';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';

interface StudentDTO {
  id: number;
  name: string;
  birthDate?: string;
  guardianName?: string;
  guardianPhone?: string;
  photoUrl?: string;
}

interface MetricDefinition {
  id: number;
  name: string;
  label: string;
  description?: string;
  minValue: number;
  maxValue: number;
  active: boolean;
}

export default function ClassroomDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { classroomId, classroomName } = useLocalSearchParams();

  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [availableMetrics, setAvailableMetrics] = useState<MetricDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAddingMetric, setIsAddingMetric] = useState<number | null>(null);
  const [isRemovingMetric, setIsRemovingMetric] = useState<number | null>(null);

  const parsedClassroomId = Array.isArray(classroomId) ? Number(classroomId[0]) : Number(classroomId);
  const displayName = Array.isArray(classroomName) ? classroomName[0] : classroomName;

  // Carrega alunos e métricas da turma
  useEffect(() => {
    if (!parsedClassroomId || !Number.isFinite(parsedClassroomId)) {
      setError('ID da turma inválido.');
      setIsLoading(false);
      return;
    }

    const fetchClassroomData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [studentsResponse, metricsResponse] = await Promise.all([
          api.get<StudentDTO[]>(`/classrooms/${parsedClassroomId}/students`),
          api.get<MetricDefinition[]>(`/classrooms/${parsedClassroomId}/metrics`),
        ]);

        setStudents(studentsResponse.data ?? []);
        setMetrics(metricsResponse.data ?? []);
      } catch (e: any) {
        console.error('Falha ao carregar dados da turma:', e);
        setError('Falha ao carregar dados da turma.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassroomData();
  }, [parsedClassroomId]);

  const handleEvaluateStudent = (student: StudentDTO) => {
    if (metrics.length === 0) {
      Alert.alert(
        'Sem Métricas',
        'Esta turma não possui métricas ativas. Configure as métricas antes de avaliar.',
        [{ text: 'OK' }]
      );
      return;
    }

    router.push({
      pathname: '/(app)/student-evaluation' as any,
      params: {
        studentId: student.id,
        studentName: student.name,
        classroomId: parsedClassroomId,
        classroomName: displayName,
      },
    });
  };

  const handleManageMetrics = async () => {
    try {
      // Buscar métricas disponíveis da escola
      const url = `/classrooms/${parsedClassroomId}/metrics/available`;
      console.log('🔍 Buscando métricas disponíveis:', url);
      console.log('📍 ClassroomId:', parsedClassroomId);
      
      const response = await api.get<MetricDefinition[]>(url);
      console.log('✅ Métricas disponíveis:', response.data);
      
      setAvailableMetrics(response.data ?? []);
      setIsModalVisible(true);
    } catch (e: any) {
      console.error('❌ Erro ao buscar métricas disponíveis:', e);
      console.error('Status:', e.response?.status);
      console.error('Data:', e.response?.data);
      toast.showToast('Não foi possível carregar as métricas disponíveis', 'error');
    }
  };

  const handleAddMetric = async (metricId: number) => {
    try {
      setIsAddingMetric(metricId);
      console.log('➕ Adicionando métrica:', metricId, 'à turma:', parsedClassroomId);
      
      await api.post(`/classrooms/${parsedClassroomId}/metrics`, {
        metricDefinitionId: metricId
      });
      
      // Atualizar as listas
      const addedMetric = availableMetrics.find(m => m.id === metricId);
      if (addedMetric) {
        setMetrics([...metrics, addedMetric]);
        setAvailableMetrics(availableMetrics.filter(m => m.id !== metricId));
      }
      
      toast.showToast('Métrica adicionada com sucesso!', 'success');
    } catch (e: any) {
      console.error('❌ Erro ao adicionar métrica:', e);
      console.error('Status:', e.response?.status);
      console.error('Data:', e.response?.data);
      const errorMessage = e.response?.data?.message || 'Falha ao adicionar métrica';
      toast.showToast(errorMessage, 'error');
    } finally {
      setIsAddingMetric(null);
    }
  };

  const handleRemoveMetric = async (metricId: number) => {
    try {
      setIsRemovingMetric(metricId);
      console.log('➖ Removendo métrica:', metricId, 'da turma:', parsedClassroomId);
      
      await api.delete(`/classrooms/${parsedClassroomId}/metrics/${metricId}`);
      
      // Atualizar as listas
      const removedMetric = metrics.find(m => m.id === metricId);
      if (removedMetric) {
        setMetrics(metrics.filter(m => m.id !== metricId));
        setAvailableMetrics([...availableMetrics, removedMetric]);
      }
      
      toast.showToast('Métrica removida com sucesso!', 'success');
    } catch (e: any) {
      console.error('❌ Erro ao remover métrica:', e);
      console.error('Status:', e.response?.status);
      console.error('Data:', e.response?.data);
      const errorMessage = e.response?.data?.message || 'Falha ao remover métrica';
      toast.showToast(errorMessage, 'error');
    } finally {
      setIsRemovingMetric(null);
    }
  };

  const handleViewHistory = (student: StudentDTO) => {
    router.push({
      pathname: '/(app)/student-history' as any,
      params: {
        studentId: student.id,
        studentName: student.name,
        classroomId: parsedClassroomId,
      },
    });
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      { bg: '#DBEAFE', text: '#1E40AF' },
      { bg: '#FCE7F3', text: '#BE185D' },
      { bg: '#D1FAE5', text: '#065F46' },
      { bg: '#FEF3C7', text: '#92400E' },
      { bg: '#EDE9FE', text: '#5B21B6' },
    ];
    return colors[index % colors.length];
  };

  const renderStudentCard = ({ item, index }: { item: StudentDTO; index: number }) => {
    const avatarColor = getAvatarColor(index);

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentInfo}>
          <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
            <Text style={[styles.avatarText, { color: avatarColor.text }]}>
              {getInitials(item.name)}
            </Text>
          </View>
          <View style={styles.studentDetails}>
            <Text style={styles.studentName}>{item.name}</Text>
            {item.guardianName && (
              <Text style={styles.guardianName}>Responsável: {item.guardianName}</Text>
            )}
          </View>
        </View>

        <View style={styles.studentActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EFF6FF' }]}
            onPress={() => handleViewHistory(item)}
          >
            <TrendingUp size={18} color="#2563EB" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F0FDF4' }]}
            onPress={() => handleEvaluateStudent(item)}
          >
            <ClipboardList size={18} color="#16A34A" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <User size={20} color="#8B5CF6" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{students.length}</Text>
            <Text style={styles.statLabel}>Alunos</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <ClipboardList size={20} color="#8B5CF6" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{metrics.length}</Text>
            <Text style={styles.statLabel}>Métricas</Text>
          </View>
        </View>
      </View>

      {/* Metrics Section */}
      <View style={styles.metricsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Métricas Ativas</Text>
          <TouchableOpacity onPress={handleManageMetrics}>
            <SettingsIcon size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        {metrics.length > 0 ? (
          <View style={styles.metricsContainer}>
            {metrics.map((metric) => (
              <View key={metric.id} style={styles.metricTag}>
                <Text style={styles.metricTagText}>{metric.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noMetricsContainer}>
            <ClipboardList size={32} color="#D1D5DB" />
            <Text style={styles.noMetricsText}>Nenhuma métrica ativa</Text>
            <TouchableOpacity style={styles.addMetricsButton} onPress={handleManageMetrics}>
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addMetricsButtonText}>Adicionar Métricas</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Students Header */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Alunos</Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader title={displayName as string || 'Turma'} showBack />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          renderItem={renderStudentCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <User size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Nenhum aluno encontrado</Text>
              <Text style={styles.emptySubtitle}>
                Esta turma ainda não possui alunos cadastrados.
              </Text>
            </View>
          }
        />
      )}

      {/* Modal de Gerenciamento de Métricas */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gerenciar Métricas</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Métricas Ativas na Turma */}
              <View style={styles.modalSection}>
                <View style={styles.sectionHeaderRow}>
                  <CheckCircle2 size={20} color="#16A34A" />
                  <Text style={styles.modalSectionTitle}>
                    Métricas Ativas ({metrics.length})
                  </Text>
                </View>
                
                {metrics.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      Nenhuma métrica ativa nesta turma
                    </Text>
                  </View>
                ) : (
                  metrics.map((metric) => (
                    <View key={metric.id} style={styles.metricItem}>
                      <View style={styles.metricItemContent}>
                        <View style={styles.metricDot} />
                        <View style={styles.metricItemDetails}>
                          <Text style={styles.metricItemLabel}>{metric.label}</Text>
                          <Text style={styles.metricItemRange}>
                            Escala: {metric.minValue} - {metric.maxValue}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.metricActionButton, styles.removeButton]}
                        onPress={() => handleRemoveMetric(metric.id)}
                        disabled={isRemovingMetric === metric.id}
                      >
                        {isRemovingMetric === metric.id ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <Minus size={18} color="#DC2626" />
                        )}
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* Métricas Disponíveis */}
              <View style={styles.modalSection}>
                <View style={styles.sectionHeaderRow}>
                  <ClipboardList size={20} color="#8B5CF6" />
                  <Text style={styles.modalSectionTitle}>
                    Métricas Disponíveis ({availableMetrics.length})
                  </Text>
                </View>
                
                {availableMetrics.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      Todas as métricas da escola já estão ativas
                    </Text>
                  </View>
                ) : (
                  availableMetrics.map((metric) => (
                    <View key={metric.id} style={styles.metricItem}>
                      <View style={styles.metricItemContent}>
                        <View style={[styles.metricDot, { backgroundColor: '#D1D5DB' }]} />
                        <View style={styles.metricItemDetails}>
                          <Text style={styles.metricItemLabel}>{metric.label}</Text>
                          <Text style={styles.metricItemRange}>
                            Escala: {metric.minValue} - {metric.maxValue}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.metricActionButton, styles.addButton]}
                        onPress={() => handleAddMetric(metric.id)}
                        disabled={isAddingMetric === metric.id}
                      >
                        {isAddingMetric === metric.id ? (
                          <ActivityIndicator size="small" color="#16A34A" />
                        ) : (
                          <Plus size={18} color="#16A34A" />
                        )}
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Concluído</Text>
            </TouchableOpacity>
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
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  metricsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricTag: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  metricTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  noMetricsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  noMetricsText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    marginBottom: 16,
  },
  addMetricsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  addMetricsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listHeader: {
    marginBottom: 16,
  },
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  guardianName: {
    fontSize: 13,
    color: '#6B7280',
  },
  studentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 32,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  modalSection: {
    marginTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptyState: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  metricItemDetails: {
    flex: 1,
  },
  metricItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  metricItemRange: {
    fontSize: 12,
    color: '#6B7280',
  },
  metricActionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#D1FAE5',
  },
  removeButton: {
    backgroundColor: '#FEE2E2',
  },
  modalCloseButton: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
