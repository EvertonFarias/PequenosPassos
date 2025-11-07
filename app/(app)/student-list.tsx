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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../components/AppHeader';
import { 
  User,
  CheckCircle,
  Clock,
  ClipboardList,
  BarChart3,
} from 'lucide-react-native';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';

interface Student {
  id: number;
  name: string;
  assessedToday?: boolean;
}

export default function StudentListScreen() {
  const router = useRouter();
  const toast = useToast();
  const { classroomId, classroomName, schoolId } = useLocalSearchParams();

  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parsedClassroomId = Array.isArray(classroomId) ? Number(classroomId[0]) : Number(classroomId);
  const parsedSchoolId = Array.isArray(schoolId) ? Number(schoolId[0]) : Number(schoolId);
  const displayClassroomName = Array.isArray(classroomName) ? classroomName[0] : classroomName;

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Busca alunos da turma
      const response = await api.get<Student[]>(`/classrooms/${parsedClassroomId}/students`);
      const studentsList = response.data || [];

      // Busca status de avaliação de cada aluno
      const studentsWithStatus = await Promise.all(
        studentsList.map(async (student: Student) => {
          try {
            const statusResponse = await api.get<{ assessed: boolean }>(`/students/${student.id}/assessment-status`);
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
    } catch (e: any) {
      console.log('Erro ao carregar alunos:', e);
      setError('Falha ao carregar lista de alunos.');
      toast.showToast('Erro ao carregar alunos', 'error');
    } finally {
      setIsLoading(false);
    }
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

  const renderStudentCard = ({ item }: { item: Student }) => {
    return (
      <View style={styles.studentCard}>
        <View style={styles.studentInfo}>
          <View style={[
            styles.studentIcon,
            item.assessedToday ? styles.studentIconAssessed : styles.studentIconPending
          ]}>
            <User size={24} color={item.assessedToday ? '#10B981' : '#8B5CF6'} />
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
                  <Text style={styles.statusTextPending}>Aguardando Registro</Text>
                </>
              )}
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.evaluateButton,
            item.assessedToday && styles.evaluateButtonAssessed
          ]}
          onPress={() => handleEvaluateStudent(item)}
        >
          <ClipboardList size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <AppHeader title={displayClassroomName || 'Alunos'} showBack />
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
        <AppHeader title={displayClassroomName || 'Alunos'} showBack />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const assessedCount = students.filter(s => s.assessedToday).length;
  const totalCount = students.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader title={displayClassroomName || 'Alunos'} showBack />

      <View style={styles.content}>
        {/* Header com resumo */}
        <View style={styles.header}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Alunos Avaliados Hoje</Text>
            <Text style={styles.summaryValue}>
              {assessedCount} / {totalCount}
            </Text>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill,
                  { width: `${totalCount > 0 ? (assessedCount / totalCount) * 100 : 0}%` }
                ]}
              />
            </View>
          </View>
        </View>

        {/* Botão Ver Relatórios */}
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={handleViewHistory}
        >
          <BarChart3 size={20} color="#FFFFFF" />
          <Text style={styles.historyButtonText}>Ver Relatórios</Text>
        </TouchableOpacity>

        {/* Lista de Alunos */}
        <FlatList
          data={students}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStudentCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <User size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Nenhum aluno cadastrado</Text>
              <Text style={styles.emptySubtitle}>
                Esta turma ainda não possui alunos
              </Text>
            </View>
          }
        />
      </View>
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
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
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
  studentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentIconAssessed: {
    backgroundColor: '#D1FAE5',
  },
  studentIconPending: {
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
  evaluateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  evaluateButtonAssessed: {
    backgroundColor: '#10B981',
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
});