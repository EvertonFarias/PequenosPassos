import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { AppHeader } from '../../components/AppHeader';
import { 
  Users, 
  Plus, 
  ArrowRight, 
  BookOpen,
  BarChart3,
  ClipboardList,
  UserPlus,
  GraduationCap,
  History
} from 'lucide-react-native';
import api from '../../lib/api';

interface ClassroomDTO {
  id: number;
  name: string;
  description: string;
  studentCount: number;
}

export default function ClassSelectionScreen() {
  const router = useRouter();
  const { user, schools } = useAuth();
  const { schoolId, schoolName } = useLocalSearchParams();

  const parsedSchoolId = useMemo<number | null>(() => {
    if (!schoolId) return null;
    if (Array.isArray(schoolId)) {
      const first = schoolId[0];
      const n = Number(first);
      return Number.isFinite(n) ? n : null;
    }
    const n = Number(schoolId as string);
    return Number.isFinite(n) ? n : null;
  }, [schoolId]);

  const [classes, setClasses] = useState<ClassroomDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determina a role do usuário na escola
  const schoolRole = useMemo(() => {
    if (parsedSchoolId === null || !Array.isArray(schools)) return null;
    const context = schools.find(s => s.schoolId === parsedSchoolId);
    return context?.role || null;
  }, [parsedSchoolId, schools]);

  const isManager = schoolRole === 'SCHOOL_MANAGER';
  const isTeacher = schoolRole === 'TEACHER';

  // Carrega as turmas
  useEffect(() => {
    if (parsedSchoolId === null) {
      setError('ID da escola não fornecido.');
      setIsLoading(false);
      return;
    }

    const fetchClassrooms = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get<ClassroomDTO[]>(`/schools/${parsedSchoolId}/classrooms`);
        setClasses(response.data ?? []);
      } catch (e: any) {
        console.error('Falha ao carregar as turmas:', e);
        setError('Falha ao carregar as turmas.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassrooms();
  }, [parsedSchoolId]);

  const onSelectClass = (classItem: ClassroomDTO) => {
    router.push({
      pathname: '/(app)/classroom-detail' as any,
      params: { 
        classroomId: classItem.id, 
        classroomName: classItem.name 
      },
    });
  };

  const handleNewClass = () => {
    // TODO: Implementar criação de turma
    console.log('Nova turma');
  };

  const handleManageStudents = () => {
    // TODO: Implementar gestão de alunos
    console.log('Gerenciar alunos');
  };

  const handleManageTeachers = () => {
    // TODO: Implementar gestão de professores
    console.log('Gerenciar professores');
  };

  const handleViewHistory = () => {
    if (parsedSchoolId === null) return;
    router.push({
      pathname: '/(app)/assessment-history' as any,
      params: {
        schoolId: parsedSchoolId,
      },
    });
  };

  const handleViewReports = () => {
    if (parsedSchoolId === null) return;
    router.push({
      pathname: '/(app)/reports' as any,
      params: {
        schoolId: parsedSchoolId,
        schoolName: schoolName || 'Escola',
      },
    });
  };

  const handleManageMetrics = () => {
    if (parsedSchoolId === null) return;
    router.push({
      pathname: '/(app)/school-metrics' as any,
      params: {
        schoolId: parsedSchoolId,
        schoolName: schoolName || 'Escola',
      },
    });
  };

  const getClassColor = (index: number) => {
    const colors = [
      { bg: '#FFFBEB', border: '#FDE68A', iconColor: '#D97706' },
      { bg: '#EFF6FF', border: '#BFDBFE', iconColor: '#2563EB' },
      { bg: '#FCE7F3', border: '#FBCFE8', iconColor: '#DB2777' },
      { bg: '#F0FFF4', border: '#A7F3D0', iconColor: '#047857' },
      { bg: '#F5F3FF', border: '#DDD6FE', iconColor: '#5B21B6' },
    ];
    return colors[index % colors.length];
  };

  const renderClassCard = ({ item, index }: { item: ClassroomDTO; index: number }) => {
    const { bg, border, iconColor } = getClassColor(index);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: bg, borderColor: border }]}
        onPress={() => onSelectClass(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconContainer, { backgroundColor: bg, borderColor: border }]}>
            <BookOpen size={24} color={iconColor} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.name}
            </Text>
            {item.description && (
              <Text style={styles.cardDescription} numberOfLines={1}>
                {item.description}
              </Text>
            )}
            {isManager && (
              <View style={styles.cardMeta}>
                <Users size={14} color="#6B7280" />
                <Text style={styles.cardMetaText}>
                  {item.studentCount || 0} alunos
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardAction}>Acessar turma</Text>
          <ArrowRight size={18} color={iconColor} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <>
      {/* Header da Página */}
      <View style={styles.pageHeader}>
        <View style={styles.pageIconContainer}>
          <BookOpen size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.pageTitle}>
          {schoolName || 'Minhas Turmas'}
        </Text>
        <Text style={styles.pageSubtitle}>
          {isManager 
            ? 'Gerencie turmas, alunos e professores' 
            : 'Suas turmas e avaliações'}
        </Text>
      </View>

      {/* Stats Card - Apenas para Gestor */}
      {isManager && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <BookOpen size={20} color="#8B5CF6" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{classes.length}</Text>
              <Text style={styles.statLabel}>Turmas</Text>
            </View>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Users size={20} color="#8B5CF6" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>
                {classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)}
              </Text>
              <Text style={styles.statLabel}>Alunos</Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Actions - Apenas para Gestor */}
      {isManager && (
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={handleNewClass}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#F3E8FF' }]}>
                <Plus size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.actionTitle}>Nova Turma</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={handleManageStudents}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#DBEAFE' }]}>
                <UserPlus size={20} color="#2563EB" />
              </View>
              <Text style={styles.actionTitle}>Alunos</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={handleManageTeachers}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <GraduationCap size={20} color="#D97706" />
              </View>
              <Text style={styles.actionTitle}>Professores</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={handleManageMetrics}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#EDE9FE' }]}>
                <ClipboardList size={20} color="#7C3AED" />
              </View>
              <Text style={styles.actionTitle}>Métricas</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={handleViewHistory}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#FEE2E2' }]}>
                <History size={20} color="#DC2626" />
              </View>
              <Text style={styles.actionTitle}>Histórico de Avaliações</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={handleViewReports}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#D1FAE5' }]}>
                <BarChart3 size={20} color="#059669" />
              </View>
              <Text style={styles.actionTitle}>Relatórios</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Actions Row - Professor (simplificado) */}
      {isTeacher && (
        <View style={styles.teacherActionsSection}>
          <View style={styles.teacherActionsRow}>
            <TouchableOpacity 
              style={styles.teacherActionButton}
              onPress={handleViewHistory}
            >
              <History size={20} color="#FFFFFF" />
              <Text style={styles.teacherActionText}>Histórico de Avaliações</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.teacherActionsRow}>
            <TouchableOpacity 
              style={[styles.teacherActionButton, { backgroundColor: '#059669' }]}
              onPress={handleViewReports}
            >
              <BarChart3 size={20} color="#FFFFFF" />
              <Text style={styles.teacherActionText}>Relatórios</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.teacherActionButton, { backgroundColor: '#7C3AED' }]}
              onPress={handleManageMetrics}
            >
              <ClipboardList size={20} color="#FFFFFF" />
              <Text style={styles.teacherActionText}>Métricas</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Título da lista */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>
          {isManager ? 'Todas as Turmas' : 'Minhas Turmas'}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{classes.length}</Text>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader 
        title={isManager ? 'Gestão' : 'Turmas'}
        showBack={schools.length > 1}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando turmas...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          renderItem={renderClassCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BookOpen size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Nenhuma turma encontrada</Text>
              <Text style={styles.emptySubtitle}>
                {isManager 
                  ? 'Crie sua primeira turma para começar.'
                  : 'Você ainda não está vinculado a nenhuma turma.'}
              </Text>
              {isManager && (
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={handleNewClass}
                >
                  <Plus size={20} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>Criar Primeira Turma</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
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
  pageHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  pageIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
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
  actionsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  teacherActionsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  teacherActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  teacherActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teacherActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B21B6',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardMetaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  cardAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});