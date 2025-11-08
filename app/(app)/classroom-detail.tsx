import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { AppHeader } from '../../components/AppHeader';
import { 
  User, 
  ClipboardList,
  Calendar,
  Settings as SettingsIcon,
  X,
  Plus,
  Minus,
  CheckCircle2,
  CheckCircle,
  Clock,
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
  assessedToday?: boolean;
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

interface AssessmentHistoryResponse {
  content: Array<{
    id: number;
    date: string;
    observation?: string;
    metrics: Array<{
      metricDefinitionId: number;
      metricLabel: string;
      score: number;
    }>;
  }>;
  totalElements: number;
  totalPages: number;
  number: number;
}

export default function ClassroomDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user, schools } = useAuth();
  const { classroomId, classroomName, schoolId } = useLocalSearchParams();

  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [availableMetrics, setAvailableMetrics] = useState<MetricDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAddingMetric, setIsAddingMetric] = useState<number | null>(null);
  const [isRemovingMetric, setIsRemovingMetric] = useState<number | null>(null);
  const [isTeachersModalVisible, setIsTeachersModalVisible] = useState(false);
  const [teachers, setTeachers] = useState<Array<{id: string; name: string; lastName?: string}>>([]);
  const [availableTeachers, setAvailableTeachers] = useState<Array<{id: string; name: string; lastName?: string}>>([]);
  const [isAddingTeacher, setIsAddingTeacher] = useState<string | null>(null);
  const [isRemovingTeacher, setIsRemovingTeacher] = useState<string | null>(null);
  // Students bulk management
  const [isStudentsModalVisible, setIsStudentsModalVisible] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<Array<StudentDTO>>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<Record<number, boolean>>({});
  const [selectedToRemove, setSelectedToRemove] = useState<Record<number, boolean>>({});
  const [isProcessingBulkAdd, setIsProcessingBulkAdd] = useState(false);
  const [isProcessingBulkRemove, setIsProcessingBulkRemove] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const parsedClassroomId = Array.isArray(classroomId) ? Number(classroomId[0]) : Number(classroomId);
  const parsedSchoolId = Array.isArray(schoolId) ? Number(schoolId[0]) : Number(schoolId);
  const displayName = Array.isArray(classroomName) ? classroomName[0] : classroomName;

  // Função para carregar dados da turma (reutilizável)
  const fetchClassroomData = useCallback(async (showLoading = true) => {
    if (!parsedClassroomId || !Number.isFinite(parsedClassroomId)) {
      setError('ID da turma inválido.');
      setIsLoading(false);
      return;
    }

    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      const [studentsResponse, metricsResponse] = await Promise.all([
        api.get<StudentDTO[]>(`/classrooms/${parsedClassroomId}/students`),
        api.get<MetricDefinition[]>(`/classrooms/${parsedClassroomId}/metrics`),
      ]);

      const studentsList = studentsResponse.data ?? [];

      // Busca status de avaliação de cada aluno
      const studentsWithStatus = await Promise.all(
        studentsList.map(async (student) => {
          try {
            const statusResponse = await api.get<{ assessed: boolean }>(
              `/students/${student.id}/assessment-status`,
              {
                params: { classroomId: parsedClassroomId }
              }
            );
            return {
              ...student,
              assessedToday: statusResponse.data.assessed,
            };
          } catch (err) {
            return {
              ...student,
              assessedToday: false,
            };
          }
        })
      );

      setStudents(studentsWithStatus);
      setMetrics(metricsResponse.data ?? []);
      // Buscar professores vinculados para decidir permissões locais (sem depender de outro fluxo)
      try {
        const teachersResp = await api.get(`/classrooms/${parsedClassroomId}/teachers`);
        setTeachers(Array.isArray(teachersResp.data) ? teachersResp.data : []);
      } catch (tErr) {
        console.warn('Erro ao buscar professores durante fetchClassroomData', tErr);
        // não interrompe o fluxo
      }
    } catch (e: any) {
      console.log('Falha ao carregar dados da turma:', e);
      setError('Falha ao carregar dados da turma.');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
      setRefreshing(false);
    }
  }, [parsedClassroomId]);

  // Carrega dados na montagem
  useEffect(() => {
    fetchClassroomData();
  }, [fetchClassroomData]);

  // Recarrega dados ao voltar para a tela
  useFocusEffect(
    useCallback(() => {
      fetchClassroomData(false);
    }, [fetchClassroomData])
  );

  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClassroomData(false);
  }, [fetchClassroomData]);

  const handleEvaluateStudent = async (student: StudentDTO) => {
    if (metrics.length === 0) {
      Alert.alert(
        'Sem Métricas',
        'Esta turma não possui métricas ativas. Configure as métricas antes de avaliar.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Se já foi avaliado hoje, buscar a avaliação para editar
    if (student.assessedToday) {
      try {
        // Formata data local (não UTC) para evitar problemas de timezone
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        
        const response = await api.get<AssessmentHistoryResponse>(`/assessments/history`, {
          params: {
            studentId: student.id,
            date: today,
            page: 0,
            size: 1,
          },
        });

        if (response.data?.content && response.data.content.length > 0) {
          const todayAssessment = response.data.content[0];
          
          // Navegar para edição
          router.push({
            pathname: '/(app)/student-evaluation' as any,
            params: {
              studentId: student.id,
              studentName: student.name,
              classroomId: parsedClassroomId,
              classroomName: displayName,
              assessmentId: todayAssessment.id,
              mode: 'edit',
            },
          });
          return;
        }
      } catch (e) {
        console.log('Erro ao buscar avaliação do dia:', e);
        toast.showToast('Erro ao carregar avaliação', 'error');
        return;
      }
    }

    // Se não foi avaliado, criar nova avaliação
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
      console.log('❌ Erro ao buscar métricas disponíveis:', e);
      console.log('Status:', e.response?.status);
      console.log('Data:', e.response?.data);
      toast.showToast('Não foi possível carregar as métricas disponíveis', 'error');
    }
  };

  // ----- Teachers management -----
  const canManageTeachers = (() => {
    // Superadmin or school manager
    const role = schools && Array.isArray(schools) ? schools.find((s:any) => s.schoolId === parsedSchoolId)?.role : null;
    return user?.role === 'SUPER_ADMIN' || role === 'SCHOOL_MANAGER';
  })();

  // Permissão para gerenciar alunos: apenas superadmin ou school manager
  const canManageStudents = (() => {
    const role = schools && Array.isArray(schools) ? schools.find((s:any) => s.schoolId === parsedSchoolId)?.role : null;
    return user?.role === 'SUPER_ADMIN' || role === 'SCHOOL_MANAGER';
  })();

  const fetchTeachers = async () => {
    try {
      const resp = await api.get(`/classrooms/${parsedClassroomId}/teachers`);
      setTeachers(Array.isArray(resp.data) ? resp.data : []);
    } catch (e) {
      console.warn('Erro ao buscar professores da turma', e);
      setTeachers([]);
    }
  };

  // ----- Students bulk management -----
  const fetchAvailableStudents = async () => {
    try {
      const resp = await api.get(`/classrooms/${parsedClassroomId}/students/available`);
      setAvailableStudents(Array.isArray(resp.data) ? resp.data : []);
    } catch (e) {
      console.warn('Erro ao buscar alunos disponíveis', e);
      setAvailableStudents([]);
    }
  };

  const openStudentsModal = async () => {
    // ensure current students list is fresh
    await fetchClassroomData(false);
    await fetchAvailableStudents();
    // reset selections
    setSelectedToAdd({});
    setSelectedToRemove({});
    setIsStudentsModalVisible(true);
  };

  const toggleSelectToAdd = (studentId: number) => {
    setSelectedToAdd((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const toggleSelectToRemove = (studentId: number) => {
    setSelectedToRemove((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const handleBulkAddStudents = async () => {
    const ids = Object.entries(selectedToAdd).filter(([, v]) => v).map(([k]) => Number(k));
    if (ids.length === 0) {
      toast.showToast('Nenhum aluno selecionado para vincular', 'error');
      return;
    }

    try {
      setIsProcessingBulkAdd(true);
      // call backend per student (backend shape mirrors teacher endpoints)
      await Promise.all(
        ids.map((studentId) => api.put(`/classrooms/${parsedClassroomId}/students/${studentId}`))
      );

      toast.showToast('Alunos vinculados com sucesso!', 'success');
      // refresh data
      await fetchClassroomData(false);
      await fetchAvailableStudents();
      setSelectedToAdd({});
    } catch (e: any) {
      console.log('Falha ao vincular alunos em massa', e);
      const msg = e?.response?.data?.message || 'Falha ao vincular alunos';
      toast.showToast(msg, 'error');
    } finally {
      setIsProcessingBulkAdd(false);
    }
  };

  const handleBulkRemoveStudents = async () => {
    const ids = Object.entries(selectedToRemove).filter(([, v]) => v).map(([k]) => Number(k));
    if (ids.length === 0) {
      toast.showToast('Nenhum aluno selecionado para desvincular', 'error');
      return;
    }

    try {
      setIsProcessingBulkRemove(true);
      await Promise.all(
        ids.map((studentId) => api.delete(`/classrooms/${parsedClassroomId}/students/${studentId}`))
      );

      toast.showToast('Alunos desvinculados com sucesso!', 'success');
      await fetchClassroomData(false);
      await fetchAvailableStudents();
      setSelectedToRemove({});
    } catch (e: any) {
      console.log('Falha ao desvincular alunos em massa', e);
      const msg = e?.response?.data?.message || 'Falha ao desvincular alunos';
      toast.showToast(msg, 'error');
    } finally {
      setIsProcessingBulkRemove(false);
    }
  };

  const fetchAvailableTeachers = async () => {
    try {
      const resp = await api.get(`/classrooms/${parsedClassroomId}/teachers/available`);
      setAvailableTeachers(Array.isArray(resp.data) ? resp.data : []);
    } catch (e) {
      console.warn('Erro ao buscar professores disponíveis', e);
      setAvailableTeachers([]);
    }
  };

  const openTeachersModal = async () => {
    await fetchTeachers();
    await fetchAvailableTeachers();
    setIsTeachersModalVisible(true);
  };

  const handleAddTeacher = async (teacherId: string) => {
    try {
      setIsAddingTeacher(teacherId);
      await api.put(`/classrooms/${parsedClassroomId}/teachers/${teacherId}`);
      await fetchTeachers();
      await fetchAvailableTeachers();
      toast.showToast('Professor vinculado com sucesso!', 'success');
    } catch (e: any) {
      console.log('Erro ao vincular professor', e);
      const msg = e?.response?.data?.message || 'Falha ao vincular professor';
      toast.showToast(msg, 'error');
    } finally {
      setIsAddingTeacher(null);
    }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    try {
      setIsRemovingTeacher(teacherId);
      await api.delete(`/classrooms/${parsedClassroomId}/teachers/${teacherId}`);
      await fetchTeachers();
      await fetchAvailableTeachers();
      toast.showToast('Professor desvinculado com sucesso!', 'success');
    } catch (e: any) {
      console.log('Erro ao desvincular professor', e);
      const msg = e?.response?.data?.message || 'Falha ao desvincular professor';
      toast.showToast(msg, 'error');
    } finally {
      setIsRemovingTeacher(null);
    }
  };

  const handleAddMetric = async (metricId: number) => {
    try {
      setIsAddingMetric(metricId);
      console.log('➕ Adicionando métrica:', metricId, 'à turma:', parsedClassroomId);
      
      await api.post(`/classrooms/${parsedClassroomId}/metrics`, {
        metricDefinitionId: metricId
      });
      
      // Recarregar as listas do backend para garantir dados atualizados
      const [metricsResponse, availableResponse] = await Promise.all([
        api.get<MetricDefinition[]>(`/classrooms/${parsedClassroomId}/metrics`),
        api.get<MetricDefinition[]>(`/classrooms/${parsedClassroomId}/metrics/available`),
      ]);
      
      setMetrics(metricsResponse.data ?? []);
      setAvailableMetrics(availableResponse.data ?? []);
      
      toast.showToast('Métrica adicionada com sucesso!', 'success');
    } catch (e: any) {
      console.log('❌ Erro ao adicionar métrica:', e);
      console.log('Status:', e.response?.status);
      console.log('Data:', e.response?.data);
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
      
      // Recarregar as listas do backend para garantir dados atualizados (filtra apenas ativas)
      const [metricsResponse, availableResponse] = await Promise.all([
        api.get<MetricDefinition[]>(`/classrooms/${parsedClassroomId}/metrics`),
        api.get<MetricDefinition[]>(`/classrooms/${parsedClassroomId}/metrics/available`),
      ]);
      
      setMetrics(metricsResponse.data ?? []);
      setAvailableMetrics(availableResponse.data ?? []);
      
      toast.showToast('Métrica removida com sucesso!', 'success');
    } catch (e: any) {
      console.log('❌ Erro ao remover métrica:', e);
      console.log('Status:', e.response?.status);
      console.log('Data:', e.response?.data);
      const errorMessage = e.response?.data?.message || 'Falha ao remover métrica';
      toast.showToast(errorMessage, 'error');
    } finally {
      setIsRemovingMetric(null);
    }
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
            <View style={styles.statusContainer}>
              {item.assessedToday ? (
                <>
                  <CheckCircle size={14} color="#10B981" />
                  <Text style={styles.statusTextAssessed}>Avaliado Hoje</Text>
                </>
              ) : (
                <>
                  <Clock size={14} color="#F59E0B" />
                  <Text style={styles.statusTextPending}>Aguardando Avaliação</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.studentActions}>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              { backgroundColor: item.assessedToday ? '#DCFCE7' : '#FEF3C7' }
            ]}
            onPress={() => handleEvaluateStudent(item)}
          >
            <ClipboardList 
              size={18} 
              color={item.assessedToday ? '#16A34A' : '#D97706'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      {/* Stats Card */}
      {/* Estatísticas removidas para simplificar a tela — foco na avaliação dos alunos */}

      {/* Metrics Section */}
      <View style={styles.metricsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Métricas Ativas</Text>
          <TouchableOpacity onPress={handleManageMetrics} style={styles.iconButton}>
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

      {/* Teachers Section */}
      {canManageTeachers && (
        <View style={styles.teachersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Professores</Text>
            <TouchableOpacity onPress={openTeachersModal} style={styles.iconButton}>
              <User size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Minimal compact row with a single action button to open the teachers modal */}
          <View style={styles.teachersCompact}>
            <Text style={styles.teacherCount}>{teachers.length} vinculados</Text>
            <TouchableOpacity style={styles.flatButton} onPress={openTeachersModal}>
              <Text style={styles.flatButtonText}>Ver Professores</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Students Header */}
      <View style={styles.listHeader}>
        <View style={styles.studentsHeaderRow}>
          <Text style={styles.sectionTitle}>Alunos</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.studentBadge}>
              <Text style={styles.studentBadgeText}>{students.length}</Text>
            </View>
            {canManageStudents && (
              <TouchableOpacity style={styles.flatButton} onPress={openStudentsModal}>
                <Text style={styles.flatButtonText}>Gerenciar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          }
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

      {/* Modal de Gerenciamento de Alunos (Vincular/Desvincular em massa) */}
      <Modal
        visible={isStudentsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsStudentsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gerenciar Alunos</Text>
              <TouchableOpacity onPress={() => setIsStudentsModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalSection}>
                <View style={styles.sectionHeaderRow}>
                  <CheckCircle2 size={20} color="#16A34A" />
                  <Text style={styles.modalSectionTitle}>Alunos Vinculados ({students.length})</Text>
                </View>

                {students.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Nenhum aluno nesta turma</Text>
                  </View>
                ) : (
                  students.map((s) => (
                    <View key={s.id} style={styles.metricItem}>
                      <View style={styles.metricItemContent}>
                        <TouchableOpacity onPress={() => toggleSelectToRemove(s.id)} style={{ marginRight: 12 }}>
                          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: selectedToRemove[s.id] ? '#8B5CF6' : '#FFFFFF' }} />
                        </TouchableOpacity>
                        <View style={styles.metricItemDetails}>
                          <Text style={styles.metricItemLabel}>{s.name}</Text>
                          <Text style={styles.metricItemRange}>{s.guardianName || ''}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}

                <View style={{ marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.modalCloseButton, { backgroundColor: '#FEE2E2' }]}
                    onPress={handleBulkRemoveStudents}
                    disabled={isProcessingBulkRemove}
                  >
                    {isProcessingBulkRemove ? (
                      <ActivityIndicator color="#DC2626" />
                    ) : (
                      <Text style={[styles.modalCloseButtonText, { color: '#DC2626' }]}>Desvincular Selecionados</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalSection}>
                <View style={styles.sectionHeaderRow}>
                  <ClipboardList size={20} color="#8B5CF6" />
                  <Text style={styles.modalSectionTitle}>Alunos Disponíveis ({availableStudents.length})</Text>
                </View>

                {availableStudents.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Nenhum aluno disponível para adicionar</Text>
                  </View>
                ) : (
                  availableStudents.map((s) => (
                    <View key={s.id} style={styles.metricItem}>
                      <View style={styles.metricItemContent}>
                        <TouchableOpacity onPress={() => toggleSelectToAdd(s.id)} style={{ marginRight: 12 }}>
                          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: selectedToAdd[s.id] ? '#10B981' : '#FFFFFF' }} />
                        </TouchableOpacity>
                        <View style={styles.metricItemDetails}>
                          <Text style={styles.metricItemLabel}>{s.name}</Text>
                          <Text style={styles.metricItemRange}>{s.guardianName || ''}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}

                <View style={{ marginTop: 8 }}>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={handleBulkAddStudents}
                    disabled={isProcessingBulkAdd}
                  >
                    {isProcessingBulkAdd ? (
                      <ActivityIndicator color="#16A34A" />
                    ) : (
                      <Text style={styles.modalCloseButtonText}>Vincular Selecionados</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' }]}
              onPress={() => setIsStudentsModalVisible(false)}
            >
              <Text style={[styles.modalCloseButtonText, { color: '#374151' }]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Gerenciamento de Professores */}
      <Modal
        visible={isTeachersModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsTeachersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gerenciar Professores</Text>
              <TouchableOpacity onPress={() => setIsTeachersModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalSection}>
                <View style={styles.sectionHeaderRow}>
                  <CheckCircle2 size={20} color="#16A34A" />
                  <Text style={styles.modalSectionTitle}>Professores Vinculados ({teachers.length})</Text>
                </View>

                {teachers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Nenhum professor vinculado a esta turma</Text>
                  </View>
                ) : (
                  teachers.map((t) => (
                    <View key={t.id} style={styles.metricItem}>
                      <View style={styles.metricItemContent}>
                        <View style={styles.metricDot} />
                        <View style={styles.metricItemDetails}>
                          <Text style={styles.metricItemLabel}>{t.name}</Text>
                          <Text style={styles.metricItemRange}>{`${t.name} ${t.lastName || ''}`.trim()}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.metricActionButton, styles.removeButton]}
                        onPress={() => handleRemoveTeacher(t.id)}
                        disabled={isRemovingTeacher === t.id}
                      >
                        {isRemovingTeacher === t.id ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <Minus size={18} color="#DC2626" />
                        )}
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              <View style={styles.modalSection}>
                <View style={styles.sectionHeaderRow}>
                  <ClipboardList size={20} color="#8B5CF6" />
                  <Text style={styles.modalSectionTitle}>Professores Disponíveis ({availableTeachers.length})</Text>
                </View>

                {availableTeachers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Nenhum professor disponível para adicionar</Text>
                  </View>
                ) : (
                  availableTeachers.map((t) => (
                    <View key={t.id} style={styles.metricItem}>
                      <View style={styles.metricItemContent}>
                        <View style={[styles.metricDot, { backgroundColor: '#D1D5DB' }]} />
                        <View style={styles.metricItemDetails}>
                          <Text style={styles.metricItemLabel}>{t.name}</Text>
                          <Text style={styles.metricItemRange}>{`${t.name} ${t.lastName || ''}`.trim()}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.metricActionButton, styles.addButton]}
                        onPress={() => handleAddTeacher(t.id)}
                        disabled={isAddingTeacher === t.id}
                      >
                        {isAddingTeacher === t.id ? (
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
              onPress={() => setIsTeachersModalVisible(false)}
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
    minWidth: 88,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
    marginHorizontal: 8,
  },
  teachersCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  teacherCount: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  flatButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  flatButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  studentsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentBadge: {
    minWidth: 36,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  studentBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
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
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teachersSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  teachersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  teacherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
  },
  teacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teacherAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 2,
  },
  teacherLogin: {
    fontSize: 11,
    color: '#059669',
  },
  noTeachersContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  noTeachersText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    marginBottom: 16,
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
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTextAssessed: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  statusTextPending: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
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