import React, { useState, useEffect } from 'react';
import EditStudentModal from './EditStudentModal';
import { useFocusEffect } from '@react-navigation/native';
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
  TextInput,
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
  Search,
  Edit2,
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
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showClassroomsModal, setShowClassroomsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [allClassrooms, setAllClassrooms] = useState<Classroom[]>([]);

  const parsedClassroomId = classroomId ? (Array.isArray(classroomId) ? Number(classroomId[0]) : Number(classroomId)) : null;
  const parsedSchoolId = Array.isArray(schoolId) ? Number(schoolId[0]) : Number(schoolId);
  const displayClassroomName = Array.isArray(classroomName) ? classroomName[0] : classroomName;
  const displaySchoolName = Array.isArray(schoolName) ? schoolName[0] : schoolName;
  const isLinkMode = mode === 'link';
  const [activeFilter, setActiveFilter] = useState<'active' | 'inactive'>('active');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useFocusEffect(
    React.useCallback(() => {
      fetchStudents();
      fetchAllClassrooms();
    }, [])
  );

  useEffect(() => {
    if (!isLinkMode) fetchStudents();
  }, [activeFilter]);

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
        const response = await api.get<Student[]>(`/students/school/${parsedSchoolId}`, {
          params: { activeOnly: true }
        });
        
        const classroomStudentsResponse = await api.get<Student[]>(`/classrooms/${parsedClassroomId}/students`);
        const classroomStudentIds = new Set(classroomStudentsResponse.data.map(s => s.id));
        
        const available = (response.data || []).filter(s => !classroomStudentIds.has(s.id));
        setAvailableStudents(available);
        setStudents([]);
      } else {
        const response = await api.get<Student[]>(`/students/school/${parsedSchoolId}`, {
          params: { activeOnly: activeFilter === 'active' }
        });
        
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

    const isAlreadyLinked = selectedStudent.classrooms?.some(c => c.id === classroomId);
    if (isAlreadyLinked) {
      toast.showToast('Aluno já está vinculado a esta turma', 'info');
      return;
    }

    try {
      await api.put(`/classrooms/${classroomId}/students/${selectedStudent.id}`);
      toast.showToast(`Aluno vinculado à turma ${classroomName}`, 'success');
      fetchStudents();
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
              fetchStudents();
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

  const handleReactivateStudent = async (studentId: number, studentName: string) => {
    Alert.alert(
      'Reativar Aluno',
      `Deseja reativar ${studentName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reativar',
          onPress: async () => {
            try {
              await api.patch(`/students/${studentId}/reactivate`);
              toast.showToast('Aluno reativado com sucesso', 'success');
              fetchStudents();
            } catch (error: any) {
              console.error('Erro ao reativar aluno:', error);
              toast.showToast('Erro ao reativar aluno', 'error');
            }
          }
        }
      ]
    );
  };

  const handleEditStudent = (student: Student) => {
    setStudentToEdit(student);
    setShowEditModal(true);
  };

  const handleEditStudentSuccess = () => {
    setShowEditModal(false);
    setStudentToEdit(null);
    fetchStudents();
  };

  const getStudentColor = (index: number) => {
    const colors = [
      { bg: '#FEF3C7', border: '#FDE68A', iconColor: '#D97706', iconBg: '#FFFBEB' },
      { bg: '#DBEAFE', border: '#BFDBFE', iconColor: '#2563EB', iconBg: '#EFF6FF' },
      { bg: '#FCE7F3', border: '#FBCFE8', iconColor: '#DB2777', iconBg: '#FDF2F8' },
      { bg: '#D1FAE5', border: '#A7F3D0', iconColor: '#047857', iconBg: '#F0FFF4' },
      { bg: '#E0E7FF', border: '#C7D2FE', iconColor: '#5B21B6', iconBg: '#F5F3FF' },
    ];
    return colors[index % colors.length];
  };

  const renderStudentCard = ({ item, index }: { item: Student; index: number }) => {
    const { bg, border, iconColor, iconBg } = getStudentColor(index);
    const isInactive = activeFilter === 'inactive';

    if (isLinkMode) {
      return (
        <View style={[styles.studentCard, { backgroundColor: bg, borderColor: border }]}>
          <View style={styles.studentInfo}>
            <View style={[styles.studentIcon, { backgroundColor: iconBg }]}>
              <User size={24} color={iconColor} />
            </View>
            <View style={styles.studentDetails}>
              <Text style={styles.studentName}>{item.name}</Text>
              {item.guardianName && (
                <Text style={styles.studentMeta}>Responsável: {item.guardianName}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.linkButton, { backgroundColor: iconColor }]}
            onPress={() => handleLinkStudent(item.id)}
          >
            <UserPlus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    }

    const classroomsCount = item.classrooms?.length || 0;
    
    return (
      <View style={[
        styles.studentCard, 
        { backgroundColor: bg, borderColor: border },
        isInactive && styles.cardInactive
      ]}>
        <View style={styles.studentInfo}>
          <View style={[styles.studentIcon, { backgroundColor: iconBg }]}>
            <User size={24} color={iconColor} />
          </View>
          <View style={styles.studentDetails}>
            <View style={styles.studentNameRow}>
              <Text style={[styles.studentName, isInactive && styles.textInactive]}>
                {item.name}
              </Text>
              {isInactive && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>Inativo</Text>
                </View>
              )}
            </View>
            {item.guardianName && (
              <Text style={[styles.studentMeta, isInactive && styles.textInactive]}>
                Responsável: {item.guardianName}
              </Text>
            )}
            {classroomsCount > 0 && !isInactive && (
              <View style={styles.classroomsInfo}>
                <School size={14} color={iconColor} />
                <Text style={[styles.classroomsText, { color: iconColor }]}>
                  {classroomsCount} {classroomsCount === 1 ? 'turma' : 'turmas'}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.studentActions}>
          {!isInactive && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: iconBg }]}
                onPress={() => handleManageClassrooms(item)}
              >
                <Link size={18} color={iconColor} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: iconBg }]}
                onPress={() => handleEditStudent(item)}
              >
                <Edit2 size={18} color={iconColor} />
              </TouchableOpacity>
            </>
          )}
          {isInactive ? (
            <TouchableOpacity
              style={styles.reactivateButton}
              onPress={() => handleReactivateStudent(item.id, item.name)}
            >
              <UserPlus size={18} color="#10B981" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeactivateStudent(item.id, item.name)}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
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

  const filterStudents = (list: Student[]) => {
    if (!debouncedSearch.trim()) return list;
    const s = debouncedSearch.trim().toLowerCase();
    return list.filter(stu =>
      stu.name?.toLowerCase().includes(s) ||
      stu.guardianName?.toLowerCase().includes(s) ||
      stu.guardianPhone?.replace(/\D/g, '').includes(s.replace(/\D/g, ''))
    );
  };
  
  const dataToShow = isLinkMode ? availableStudents : filterStudents(students);
  const totalCount = dataToShow.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader 
        title={isLinkMode ? `Vincular Aluno - ${displayClassroomName}` : (displaySchoolName || 'Alunos da Escola')} 
        showBack 
      />

      <View style={styles.content}>
        {/* Tabs: Ativos / Inativos */}
        {!isLinkMode && (
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeFilter === 'active' && styles.tabButtonActive]}
              onPress={() => setActiveFilter('active')}
            >
              <Text style={[styles.tabText, activeFilter === 'active' && styles.tabTextActive]}>
                Ativos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeFilter === 'inactive' && styles.tabButtonActive]}
              onPress={() => setActiveFilter('inactive')}
            >
              <Text style={[styles.tabText, activeFilter === 'inactive' && styles.tabTextActive]}>
                Inativos
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Bar */}
        {!isLinkMode && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nome, responsável ou telefone..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }}>
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Header com resumo */}
        {!isLinkMode && (
          <View style={styles.header}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {activeFilter === 'active' ? 'Alunos Ativos' : 'Alunos Inativos'}
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{totalCount}</Text>
              </View>
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
                {isLinkMode ? 'Todos os alunos já estão vinculados' : 
                 activeFilter === 'active' ? 'Nenhum aluno ativo' : 'Nenhum aluno inativo'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isLinkMode 
                  ? 'Todos os alunos da escola já estão nesta turma' 
                  : activeFilter === 'active' 
                    ? 'Crie o primeiro aluno da escola'
                    : 'Nenhum aluno foi desativado ainda'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Botão Criar Novo Aluno */}
      {!isLinkMode && activeFilter === 'active' && (
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

      {/* Modal de Edição */}
      <EditStudentModal
        visible={showEditModal}
        student={studentToEdit}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditStudentSuccess}
      />
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
    marginTop: 8,
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    marginLeft: 8,
    paddingVertical: 2,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DDD6FE',
    minWidth: 44,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5B21B6',
  },
  infoCard: {
    backgroundColor: '#EDE9FE',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#DDD6FE',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#5B21B6',
    fontWeight: '600',
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardInactive: {
    opacity: 0.65,
    borderStyle: 'dashed',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  studentDetails: {
    flex: 1,
  },
  studentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  textInactive: {
    color: '#9CA3AF',
  },
  inactiveBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inactiveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  studentMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  classroomsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  classroomsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  studentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  linkButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  reactivateButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6EE7B7',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
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