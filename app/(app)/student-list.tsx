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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../components/AppHeader';
import { 
  User,
  CheckCircle,
  Clock,
  ClipboardList,
  BarChart3,
  Plus,
  Link,
  Trash2,
  UserPlus,
  UserMinus,
  School,
  X,
} from 'lucide-react-native';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';

interface Student {
  id: number;
  name: string;
  birthDate?: string;
  guardianName?: string;
  guardianPhone?: string;
  assessedToday?: boolean;
  classrooms?: Classroom[];
}

interface Classroom {
  id: number;
  name: string;
  yearLevel?: string;
}

export default function StudentListScreen() {
  const router = useRouter();
  const toast = useToast();
  const { classroomId, classroomName, schoolId, schoolName, mode } = useLocalSearchParams();

  const [students, setStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showClassroomsModal, setShowClassroomsModal] = useState(false);
  const [allClassrooms, setAllClassrooms] = useState<Classroom[]>([]);

  const parsedClassroomId = classroomId ? (Array.isArray(classroomId) ? Number(classroomId[0]) : Number(classroomId)) : null;
  const parsedSchoolId = Array.isArray(schoolId) ? Number(schoolId[0]) : Number(schoolId);
  const displayClassroomName = Array.isArray(classroomName) ? classroomName[0] : classroomName;
  const displaySchoolName = Array.isArray(schoolName) ? schoolName[0] : schoolName;
  const isLinkMode = mode === 'link'; // Modo de vincular aluno à turma

  useEffect(() => {
    fetchStudents();
    fetchAllClassrooms();
  }, []);

  const fetchAllClassrooms = async () => {
    try {
      const response = await api.get<Classroom[]>(`/schools/${parsedSchoolId}/classrooms`);
      setAllClassrooms(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (isLinkMode && parsedClassroomId) {
        // Modo: vincular aluno à turma
        // Busca alunos disponíveis da escola que NÃO estão nesta turma
        const response = await api.get<Student[]>(`/students/school/${parsedSchoolId}`, {
          params: { activeOnly: true }
        });
        
        // Filtra alunos que já estão na turma (precisa buscar alunos da turma também)
        const classroomStudentsResponse = await api.get<Student[]>(`/classrooms/${parsedClassroomId}/students`);
        const classroomStudentIds = new Set(classroomStudentsResponse.data.map(s => s.id));
        
        const available = (response.data || []).filter(s => !classroomStudentIds.has(s.id));
        setAvailableStudents(available);
        setStudents([]); // Não mostra alunos já vinculados nesse modo
      } else {
        // Modo normal: gerenciar alunos da escola - BUSCA COM AS TURMAS
        const response = await api.get<Student[]>(`/students/school/${parsedSchoolId}`, {
          params: { activeOnly: true }
        });
        
        // Para cada aluno, buscar suas turmas
        const studentsWithClassrooms = await Promise.all(
          (response.data || []).map(async (student) => {
            try {
              const classroomsResponse = await api.get<Classroom[]>(`/students/${student.id}/classrooms`);
              return { ...student, classrooms: classroomsResponse.data || [] };
            } catch (error) {
              console.error(`Erro ao buscar turmas do aluno ${student.id}:`, error);
              return { ...student, classrooms: [] };
            }
          })
        );
        
        setStudents(studentsWithClassrooms);
      }
    } catch (e: any) {
      console.log('Erro ao carregar alunos:', e);
      setError('Falha ao carregar lista de alunos.');
      toast.showToast('Erro ao carregar alunos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkStudent = async (studentId: number) => {
    if (!parsedClassroomId) return;
    
    try {
      await api.put(`/classrooms/${parsedClassroomId}/students/${studentId}`);
      toast.showToast('Aluno vinculado à turma com sucesso!', 'success');
      
      // Remove da lista de disponíveis
      setAvailableStudents(prev => prev.filter(s => s.id !== studentId));
    } catch (error: any) {
      console.error('Erro ao vincular aluno:', error);
      const message = error.response?.data?.message || 'Erro ao vincular aluno';
      toast.showToast(message, 'error');
    }
  };

  const handleManageClassrooms = (student: Student) => {
    setSelectedStudent(student);
    setShowClassroomsModal(true);
  };

  const handleLinkToClassroom = async (classroomId: number, classroomName: string) => {
    if (!selectedStudent) return;

    // Verifica se já está vinculado
    const isAlreadyLinked = selectedStudent.classrooms?.some(c => c.id === classroomId);
    if (isAlreadyLinked) {
      toast.showToast('Aluno já está vinculado a esta turma', 'info');
      return;
    }

    try {
      await api.put(`/classrooms/${classroomId}/students/${selectedStudent.id}`);
      toast.showToast(`Aluno vinculado à turma ${classroomName}`, 'success');
      fetchStudents(); // Recarrega para atualizar as turmas
      setShowClassroomsModal(false);
    } catch (error: any) {
      console.error('Erro ao vincular aluno:', error);
      toast.showToast('Erro ao vincular aluno à turma', 'error');
    }
  };

  const handleUnlinkFromClassroom = async (classroomId: number, classroomName: string) => {
    if (!selectedStudent) return;

    Alert.alert(
      'Desvincular Aluno',
      `Desvincular ${selectedStudent.name} da turma ${classroomName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/classrooms/${classroomId}/students/${selectedStudent.id}`);
              toast.showToast('Aluno desvinculado da turma', 'success');
              fetchStudents(); // Recarrega para atualizar as turmas
            } catch (error: any) {
              console.error('Erro ao desvincular aluno:', error);
              toast.showToast('Erro ao desvincular aluno', 'error');
            }
          },
        },
      ]
    );
  };

  const handleCreateStudent = () => {
    router.push({
      pathname: '/(app)/new-student',
      params: {
        schoolId: parsedSchoolId,
        schoolName: displaySchoolName,
      },
    });
  };

  const handleViewStudent = (student: Student) => {
    // Ver detalhes/turmas do aluno
    router.push({
      pathname: '/(app)/student-evaluation',
      params: {
        studentId: student.id,
        studentName: student.name,
        mode: 'view',
      },
    });
  };

  const handleDeactivateStudent = async (studentId: number, studentName: string) => {
    Alert.alert(
      'Desativar Aluno',
      `Tem certeza que deseja desativar ${studentName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/students/${studentId}/deactivate`);
              toast.showToast('Aluno desativado com sucesso', 'success');
              fetchStudents();
            } catch (error: any) {
              console.error('Erro ao desativar aluno:', error);
              toast.showToast('Erro ao desativar aluno', 'error');
            }
          },
        },
      ]
    );
  };

  const handleEvaluateStudent = (student: Student) => {
    if (student.assessedToday) {
      Alert.alert(
        'Aluno já avaliado',
        'Este aluno já foi avaliado hoje. Deseja ver o histórico de avaliações?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ver Histórico',
            onPress: () => router.push({
              pathname: '/(app)/assessment-history',
              params: { 
                classroomId: parsedClassroomId,
                schoolId: parsedSchoolId,
              },
            }),
          },
        ]
      );
      return;
    }

    router.push({
      pathname: '/(app)/student-evaluation',
      params: {
        studentId: student.id,
        studentName: student.name,
        classroomId: parsedClassroomId,
        classroomName: displayClassroomName,
      },
    });
  };

  const handleViewHistory = () => {
    router.push({
      pathname: '/(app)/assessment-history',
      params: { 
        classroomId: parsedClassroomId,
        schoolId: parsedSchoolId,
      },
    });
  };

  const renderStudentCard = ({ item, index }: { item: Student; index: number }) => {
    if (isLinkMode) {
      // Modo vincular: mostra botão para vincular
      return (
        <View style={styles.studentCard}>
          <View style={styles.studentInfo}>
            <View style={styles.studentIconPending}>
              <User size={24} color="#8B5CF6" />
            </View>
            <View style={styles.studentDetails}>
              <Text style={styles.studentName}>{item.name}</Text>
              {item.guardianName && (
                <Text style={styles.studentMeta}>Responsável: {item.guardianName}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => handleLinkStudent(item.id)}
          >
            <UserPlus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    }

    // Modo normal: gerenciar alunos da escola COM turmas
    const classroomsCount = item.classrooms?.length || 0;
    
    return (
      <View style={styles.studentCard}>
        <View style={styles.studentInfo}>
          <View style={styles.studentIconPending}>
            <User size={24} color="#8B5CF6" />
          </View>
          <View style={styles.studentDetails}>
            <Text style={styles.studentName}>{item.name}</Text>
            {item.guardianName && (
              <Text style={styles.studentMeta}>Responsável: {item.guardianName}</Text>
            )}
            {classroomsCount > 0 && (
              <View style={styles.classroomsInfo}>
                <School size={14} color="#6B7280" />
                <Text style={styles.classroomsText}>
                  {classroomsCount} {classroomsCount === 1 ? 'turma' : 'turmas'}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.studentActions}>
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => handleManageClassrooms(item)}
          >
            <Link size={18} color="#8B5CF6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeactivateStudent(item.id, item.name)}
          >
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <AppHeader 
          title={isLinkMode ? 'Vincular Aluno' : (displaySchoolName || 'Alunos')} 
          showBack 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando alunos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <AppHeader 
          title={isLinkMode ? 'Vincular Aluno' : (displaySchoolName || 'Alunos')} 
          showBack 
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dataToShow = isLinkMode ? availableStudents : students;
  const totalCount = dataToShow.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader 
        title={isLinkMode ? `Vincular Aluno - ${displayClassroomName}` : (displaySchoolName || 'Alunos da Escola')} 
        showBack 
      />

      <View style={styles.content}>
        {/* Header com resumo */}
        {!isLinkMode && (
          <View style={styles.header}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total de Alunos</Text>
              <Text style={styles.summaryValue}>{totalCount}</Text>
            </View>
          </View>
        )}

        {isLinkMode && (
          <View style={styles.header}>
            <View style={styles.infoCard}>
              <Link size={20} color="#8B5CF6" />
              <Text style={styles.infoText}>
                Selecione os alunos da escola para vincular à turma
              </Text>
            </View>
          </View>
        )}

        {/* Lista de Alunos */}
        <FlatList
          data={dataToShow}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStudentCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <User size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {isLinkMode ? 'Todos os alunos já estão vinculados' : 'Nenhum aluno cadastrado'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isLinkMode 
                  ? 'Todos os alunos da escola já estão nesta turma' 
                  : 'Crie o primeiro aluno da escola'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Botão Criar Novo Aluno (só no modo normal) */}
      {!isLinkMode && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleCreateStudent}
          activeOpacity={0.8}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Modal para Gerenciar Turmas do Aluno */}
      <Modal
        visible={showClassroomsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowClassroomsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Gerenciar Turmas - {selectedStudent?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowClassroomsModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Turmas Vinculadas</Text>
              {selectedStudent?.classrooms && selectedStudent.classrooms.length > 0 ? (
                selectedStudent.classrooms.map((classroom) => (
                  <View key={classroom.id} style={styles.classroomItem}>
                    <View style={styles.classroomInfo}>
                      <School size={18} color="#8B5CF6" />
                      <Text style={styles.classroomName}>{classroom.name}</Text>
                      {classroom.yearLevel && (
                        <Text style={styles.classroomYear}>({classroom.yearLevel})</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.unlinkButton}
                      onPress={() => handleUnlinkFromClassroom(classroom.id, classroom.name)}
                    >
                      <UserMinus size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Nenhuma turma vinculada</Text>
              )}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Adicionar a Turma</Text>
              {allClassrooms.filter(
                c => !selectedStudent?.classrooms?.some(sc => sc.id === c.id)
              ).map((classroom) => (
                <View key={classroom.id} style={styles.classroomItem}>
                  <View style={styles.classroomInfo}>
                    <School size={18} color="#6B7280" />
                    <Text style={styles.classroomName}>{classroom.name}</Text>
                    {classroom.yearLevel && (
                      <Text style={styles.classroomYear}>({classroom.yearLevel})</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleLinkToClassroom(classroom.id, classroom.name)}
                  >
                    <UserPlus size={18} color="#10B981" />
                  </TouchableOpacity>
                </View>
              ))}
              {allClassrooms.every(
                c => selectedStudent?.classrooms?.some(sc => sc.id === c.id)
              ) && allClassrooms.length > 0 && (
                <Text style={styles.emptyText}>Aluno está em todas as turmas</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowClassroomsModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Fechar</Text>
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
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  infoCard: {
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#5B21B6',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  studentIconPending: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#F3E8FF',
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
  studentMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  linkButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  studentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  classroomsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  classroomsText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  classroomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  classroomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  classroomName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  classroomYear: {
    fontSize: 13,
    color: '#6B7280',
  },
  unlinkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalCloseButton: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});