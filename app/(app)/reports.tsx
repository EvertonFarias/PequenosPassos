import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppHeader } from '../../components/AppHeader';
import { 
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Calendar,
  Download,
  ChevronDown,
  X,
  CheckSquare,
  Square,
} from 'lucide-react-native';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';

interface MetricDefinition {
  id: number;
  name: string;
  label: string;
  active: boolean;
}

interface Student {
  id: number;
  name: string;
}

interface Classroom {
  id: number;
  name: string;
}

export default function ReportsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { schoolId, schoolName, classroomId, classroomName } = useLocalSearchParams();

  const [reportType, setReportType] = useState<'STUDENT' | 'CLASSROOM' | 'CLASSROOM_COMPARISON'>('CLASSROOM');
  const [isLoading, setIsLoading] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showClassroomModal, setShowClassroomModal] = useState(false);

  // Dados
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  // Filtros
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<number[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [selectedClassrooms, setSelectedClassrooms] = useState<number[]>([]);

  const parsedSchoolId = schoolId ? (Array.isArray(schoolId) ? Number(schoolId[0]) : Number(schoolId)) : null;
  const parsedClassroomId = classroomId ? (Array.isArray(classroomId) ? Number(classroomId[0]) : Number(classroomId)) : null;
  const displaySchoolName = Array.isArray(schoolName) ? schoolName[0] : schoolName;
  const displayClassroomName = Array.isArray(classroomName) ? classroomName[0] : classroomName;

  // Carregar métricas ativas da escola
  useEffect(() => {
    if (!parsedSchoolId) return;

    const fetchMetrics = async () => {
      try {
        const response = await api.get<MetricDefinition[]>(`/schools/${parsedSchoolId}/metrics?activeOnly=true`);
        setMetrics(response.data || []);
      } catch (error) {
        console.error('Erro ao carregar métricas:', error);
      }
    };

    fetchMetrics();
  }, [parsedSchoolId]);  // Carregar turmas da escola
  useEffect(() => {
    if (!parsedSchoolId) return;
    
    const fetchClassrooms = async () => {
      try {
        const response = await api.get<Classroom[]>(`/schools/${parsedSchoolId}/classrooms`);
        setClassrooms(response.data || []);
        
        // Se veio de uma turma específica, pré-seleciona
        if (parsedClassroomId) {
          const classroom = response.data?.find(c => c.id === parsedClassroomId);
          if (classroom) {
            setSelectedClassroom(classroom);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar turmas:', error);
      }
    };

    fetchClassrooms();
  }, [parsedSchoolId, parsedClassroomId]);

  // Carregar alunos quando selecionar turma (para relatório individual)
  useEffect(() => {
    if (reportType !== 'STUDENT' || !selectedClassroom) {
      setStudents([]);
      return;
    }

    const fetchStudents = async () => {
      try {
        const response = await api.get<Student[]>(`/classrooms/${selectedClassroom.id}/students`);
        setStudents(response.data || []);
      } catch (error) {
        console.error('Erro ao carregar alunos:', error);
      }
    };

    fetchStudents();
  }, [reportType, selectedClassroom]);

  const toggleMetric = (metricId: number) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const toggleClassroomForComparison = (classroomId: number) => {
    setSelectedClassrooms(prev => 
      prev.includes(classroomId) 
        ? prev.filter(id => id !== classroomId)
        : [...prev, classroomId]
    );
  };

  const handleGenerateReport = async () => {
    // Validações
    if (!startDate || !endDate) {
      toast.showToast('Selecione o período do relatório', 'error');
      return;
    }

    if (reportType === 'STUDENT' && !selectedStudent) {
      toast.showToast('Selecione um aluno', 'error');
      return;
    }

    if (reportType === 'CLASSROOM' && !selectedClassroom) {
      toast.showToast('Selecione uma turma', 'error');
      return;
    }

    if (reportType === 'CLASSROOM_COMPARISON' && selectedClassrooms.length < 2) {
      toast.showToast('Selecione pelo menos 2 turmas para comparar', 'error');
      return;
    }

    try {
      setIsLoading(true);

      // Formatar datas para API (YYYY-MM-DD)
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const requestData: any = {
        reportType,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        metricIds: selectedMetrics.length > 0 ? selectedMetrics : undefined,
      };

      let endpoint = '';

      if (reportType === 'STUDENT') {
        requestData.studentId = selectedStudent?.id;
        requestData.classroomId = selectedClassroom?.id;
        endpoint = '/reports/student';
      } else if (reportType === 'CLASSROOM') {
        requestData.classroomId = selectedClassroom?.id;
        endpoint = '/reports/classroom';
      } else if (reportType === 'CLASSROOM_COMPARISON') {
        requestData.classroomIds = selectedClassrooms;
        endpoint = '/reports/classroom-comparison';
      }

      console.log('📊 Gerando relatório:', { endpoint, requestData });
      const response = await api.post(endpoint, requestData);
      console.log('✅ Relatório gerado com sucesso');
      
      // Navegar para tela de visualização do relatório
      router.push({
        pathname: '/(app)/report-view' as any,
        params: {
          reportData: JSON.stringify(response.data),
          reportType,
        },
      });

    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      toast.showToast(
        error.response?.data?.message || 'Erro ao gerar relatório',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = () => {
    toast.showToast('Exportação de PDF em desenvolvimento', 'info');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader title="Relatórios" showBack />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Relatórios e Análises</Text>
          <Text style={styles.subtitle}>
            {displayClassroomName ? `Turma: ${displayClassroomName}` : displaySchoolName}
          </Text>
        </View>

        {/* Período */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Período</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>Data Início</Text>
              <TouchableOpacity 
                style={styles.dateField}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.dateText}>
                  {startDate.toLocaleDateString('pt-BR')}
                </Text>
                <Calendar size={18} color="#6B7280" />
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowStartPicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setStartDate(selectedDate);
                    }
                  }}
                />
              )}
            </View>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>Data Fim</Text>
              <TouchableOpacity 
                style={styles.dateField}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.dateText}>
                  {endDate.toLocaleDateString('pt-BR')}
                </Text>
                <Calendar size={18} color="#6B7280" />
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowEndPicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setEndDate(selectedDate);
                    }
                  }}
                />
              )}
            </View>
          </View>
        </View>

        {/* Tipos de Relatórios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Relatório</Text>
          
          <TouchableOpacity
            style={[styles.reportTypeCard, reportType === 'STUDENT' && styles.reportTypeCardActive]}
            onPress={() => setReportType('STUDENT')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
              <Users size={24} color="#2563EB" />
            </View>
            <View style={styles.reportTypeContent}>
              <Text style={styles.reportTypeTitle}>Relatório Individual</Text>
              <Text style={styles.reportTypeDescription}>
                Acompanhe o progresso de um aluno específico
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.reportTypeCard, reportType === 'CLASSROOM' && styles.reportTypeCardActive]}
            onPress={() => setReportType('CLASSROOM')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
              <BarChart3 size={24} color="#059669" />
            </View>
            <View style={styles.reportTypeContent}>
              <Text style={styles.reportTypeTitle}>Relatório da Turma</Text>
              <Text style={styles.reportTypeDescription}>
                Visão geral com ranking e estatísticas
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.reportTypeCard, reportType === 'CLASSROOM_COMPARISON' && styles.reportTypeCardActive]}
            onPress={() => setReportType('CLASSROOM_COMPARISON')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
              <TrendingUp size={24} color="#D97706" />
            </View>
            <View style={styles.reportTypeContent}>
              <Text style={styles.reportTypeTitle}>Comparar Turmas</Text>
              <Text style={styles.reportTypeDescription}>
                Compare o desempenho entre turmas
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Seleção de Turma (para STUDENT e CLASSROOM) */}
        {(reportType === 'STUDENT' || reportType === 'CLASSROOM') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Turma</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowClassroomModal(true)}
            >
              <Text style={styles.selectButtonText}>
                {selectedClassroom ? selectedClassroom.name : 'Selecionar Turma'}
              </Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Seleção de Aluno (apenas para STUDENT) */}
        {reportType === 'STUDENT' && selectedClassroom && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aluno</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowStudentModal(true)}
            >
              <Text style={styles.selectButtonText}>
                {selectedStudent ? selectedStudent.name : 'Selecionar Aluno'}
              </Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Seleção de Turmas para Comparação */}
        {reportType === 'CLASSROOM_COMPARISON' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Turmas para Comparar ({selectedClassrooms.length} selecionadas)
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowClassroomModal(true)}
            >
              <Text style={styles.selectButtonText}>Selecionar Turmas</Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Seleção de Métricas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Métricas ({selectedMetrics.length > 0 ? selectedMetrics.length : 'Todas'})
          </Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowMetricsModal(true)}
          >
            <Text style={styles.selectButtonText}>Filtrar Métricas</Text>
            <ChevronDown size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Ações */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGenerateReport}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <FileText size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Configurar e Gerar</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleExportPDF}
            disabled={isLoading}
          >
            <Download size={20} color="#8B5CF6" />
            <Text style={styles.secondaryButtonText}>Exportar PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Calendar size={20} color="#2563EB" />
          <Text style={styles.infoText}>
            Os relatórios permitem filtrar período, métricas específicas e visualizar gráficos de evolução.
          </Text>
        </View>
      </ScrollView>

      {/* Modal de Métricas */}
      <Modal visible={showMetricsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Métricas</Text>
              <TouchableOpacity onPress={() => setShowMetricsModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => setSelectedMetrics([])}
              >
                <View style={styles.checkbox}>
                  {selectedMetrics.length === 0 && <CheckSquare size={20} color="#8B5CF6" />}
                  {selectedMetrics.length > 0 && <Square size={20} color="#9CA3AF" />}
                </View>
                <Text style={styles.modalItemText}>Todas as Métricas</Text>
              </TouchableOpacity>
              {Array.isArray(metrics) && metrics.length > 0 ? metrics.map(metric => (
                <TouchableOpacity
                  key={metric.id}
                  style={styles.modalItem}
                  onPress={() => toggleMetric(metric.id)}
                >
                  <View style={styles.checkbox}>
                    {selectedMetrics.includes(metric.id) ? (
                      <CheckSquare size={20} color="#8B5CF6" />
                    ) : (
                      <Square size={20} color="#9CA3AF" />
                    )}
                  </View>
                  <Text style={styles.modalItemText}>{metric.label}</Text>
                </TouchableOpacity>
              )) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Nenhuma métrica disponível</Text>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowMetricsModal(false)}
            >
              <Text style={styles.modalButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Alunos */}
      <Modal visible={showStudentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Aluno</Text>
              <TouchableOpacity onPress={() => setShowStudentModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {Array.isArray(students) && students.length > 0 ? students.map(student => (
                <TouchableOpacity
                  key={student.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedStudent(student);
                    setShowStudentModal(false);
                  }}
                >
                  <View style={styles.checkbox}>
                    {selectedStudent?.id === student.id ? (
                      <CheckSquare size={20} color="#8B5CF6" />
                    ) : (
                      <Square size={20} color="#9CA3AF" />
                    )}
                  </View>
                  <Text style={styles.modalItemText}>{student.name}</Text>
                </TouchableOpacity>
              )) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {selectedClassroom ? 'Nenhum aluno nesta turma' : 'Selecione uma turma primeiro'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Turmas */}
      <Modal visible={showClassroomModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {reportType === 'CLASSROOM_COMPARISON' 
                  ? 'Selecionar Turmas (mín. 2)' 
                  : 'Selecionar Turma'}
              </Text>
              <TouchableOpacity onPress={() => setShowClassroomModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {Array.isArray(classrooms) && classrooms.length > 0 ? classrooms.map(classroom => (
                <TouchableOpacity
                  key={classroom.id}
                  style={styles.modalItem}
                  onPress={() => {
                    if (reportType === 'CLASSROOM_COMPARISON') {
                      toggleClassroomForComparison(classroom.id);
                    } else {
                      setSelectedClassroom(classroom);
                      setShowClassroomModal(false);
                    }
                  }}
                >
                  <View style={styles.checkbox}>
                    {reportType === 'CLASSROOM_COMPARISON' ? (
                      selectedClassrooms.includes(classroom.id) ? (
                        <CheckSquare size={20} color="#8B5CF6" />
                      ) : (
                        <Square size={20} color="#9CA3AF" />
                      )
                    ) : (
                      selectedClassroom?.id === classroom.id ? (
                        <CheckSquare size={20} color="#8B5CF6" />
                      ) : (
                        <Square size={20} color="#9CA3AF" />
                      )
                    )}
                  </View>
                  <Text style={styles.modalItemText}>{classroom.name}</Text>
                </TouchableOpacity>
              )) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Nenhuma turma disponível</Text>
                </View>
              )}
            </ScrollView>
            {reportType === 'CLASSROOM_COMPARISON' && (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowClassroomModal(false)}
              >
                <Text style={styles.modalButtonText}>Confirmar</Text>
              </TouchableOpacity>
            )}
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
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  reportTypeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reportTypeCardActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F5F3FF',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportTypeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  reportTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  reportTypeDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  actions: {
    padding: 20,
    paddingTop: 10,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginTop: 10,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#1F2937',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  selectButtonText: {
    fontSize: 14,
    color: '#1F2937',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalScroll: {
    padding: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemText: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  modalButton: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
