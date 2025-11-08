import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
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
  History,
  Edit3,
  Archive,
  ArchiveRestore,
  MoreVertical,
} from 'lucide-react-native';
import api from '../../lib/api';

interface ClassroomDTO {
  id: number;
  name: string;
  description: string;
  studentCount: number;
  active?: boolean;
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
  const [showMenuForClass, setShowMenuForClass] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const schoolRole = useMemo(() => {
    if (parsedSchoolId === null || !Array.isArray(schools)) return null;
    const context = schools.find(s => s.schoolId === parsedSchoolId);
    return context?.role || null;
  }, [parsedSchoolId, schools]);

  const isManager = schoolRole === 'SCHOOL_MANAGER';
  const isTeacher = schoolRole === 'TEACHER';

  const fetchClassrooms = useCallback(async () => {
    if (parsedSchoolId === null) {
      setError('ID da escola não fornecido.');
      setIsLoading(false);
      return;
    }

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
  }, [parsedSchoolId]);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  useFocusEffect(
    useCallback(() => {
      fetchClassrooms();
    }, [fetchClassrooms])
  );

  const activeClasses = useMemo(() => {
    return classes.filter(c => c.active !== false);
  }, [classes]);

  const handleEditClassroom = (classItem: ClassroomDTO, event: any) => {
    event?.stopPropagation();
    setShowMenuForClass(null);
    
    router.push({
      pathname: '/(app)/edit-classroom' as any,
      params: {
        classroomId: classItem.id,
        schoolId: parsedSchoolId,
      },
    });
  };

  const handleToggleClassroom = async (classItem: ClassroomDTO, event: any) => {
    event?.stopPropagation();
    setShowMenuForClass(null);

    const action = classItem.active !== false ? 'deactivate' : 'reactivate';
    const actionTitle = classItem.active !== false ? 'Desativar Turma' : 'Reativar Turma';
    
    Alert.alert(
      actionTitle,
      classItem.active !== false
        ? `Tem certeza que deseja desativar a turma "${classItem.name}"?\n\nA turma será arquivada mas os dados serão mantidos.`
        : `Tem certeza que deseja reativar a turma "${classItem.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: classItem.active !== false ? 'Desativar' : 'Reativar',
          style: classItem.active !== false ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await api.patch(`/classrooms/${classItem.id}/${action}`);
              await fetchClassrooms();
              Alert.alert(
                'Sucesso!',
                `Turma ${classItem.active !== false ? 'desativada' : 'reativada'} com sucesso.`
              );
            } catch (error: any) {
              console.error(`Erro ao ${action} turma:`, error);
              Alert.alert('Erro', `Não foi possível ${action === 'deactivate' ? 'desativar' : 'reativar'} a turma.`);
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const onSelectClass = (classItem: ClassroomDTO) => {
    router.push({
      pathname: '/(app)/classroom-detail' as any,
      params: { 
        classroomId: classItem.id, 
        classroomName: classItem.name,
        schoolId: parsedSchoolId,
      },
    });
  };

  const handleNewClass = () => {
    if (parsedSchoolId === null) return;
    router.push({
      pathname: '/(app)/new-classroom' as any,
      params: {
        schoolId: parsedSchoolId,
        schoolName: schoolName || 'Escola',
      },
    });
  };

  const handleManageStudents = () => {
    if (parsedSchoolId === null) return;
    router.push({
      pathname: '/(app)/student-list',
      params: {
        schoolId: parsedSchoolId,
        schoolName: schoolName || 'Escola',
      },
    } as any);
  };

  const handleManageTeachers = () => {
    if (parsedSchoolId === null) return;
    router.push({
      pathname: '/(app)/manage-teachers' as any,
      params: {
        schoolId: parsedSchoolId,
        schoolName: schoolName || 'Escola',
      },
    });
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

  const handleManageClassrooms = () => {
    if (parsedSchoolId === null) return;
    router.push({
      pathname: '/(app)/manage-classrooms' as any,
      params: {
        schoolId: parsedSchoolId,
        schoolName: schoolName || 'Escola',
      },
    });
  };

  const getClassColor = (index: number) => {
    const colors = [
      { bg: '#FEF3C7', border: '#FCD34D', iconColor: '#F59E0B' },
      { bg: '#DBEAFE', border: '#93C5FD', iconColor: '#3B82F6' },
      { bg: '#FCE7F3', border: '#F9A8D4', iconColor: '#EC4899' },
      { bg: '#D1FAE5', border: '#6EE7B7', iconColor: '#10B981' },
      { bg: '#E9D5FF', border: '#C084FC', iconColor: '#A855F7' },
    ];
    return colors[index % colors.length];
  };

  const renderClassCard = ({ item, index }: { item: ClassroomDTO; index: number }) => {
    const { bg, border, iconColor } = getClassColor(index);
    const isInactive = item.active === false;

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          style={[
            styles.card, 
            { backgroundColor: bg, borderColor: border },
            isInactive && styles.cardInactive
          ]}
          onPress={() => !isInactive && !isProcessing && onSelectClass(item)}
          activeOpacity={0.7}
          disabled={isInactive || isProcessing}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconContainer, { backgroundColor: bg, borderColor: border }]}>
              <BookOpen size={28} color={isInactive ? '#9CA3AF' : iconColor} strokeWidth={2.5} />
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardTitle, isInactive && styles.textInactive]} numberOfLines={1}>
                  {item.name}
                </Text>
                {isInactive && (
                  <View style={styles.inactiveBadge}>
                    <Archive size={12} color="#6B7280" />
                  </View>
                )}
              </View>
              {item.description && (
                <Text style={[styles.cardDescription, isInactive && styles.textInactive]} numberOfLines={1}>
                  {item.description}
                </Text>
              )}
              {isManager && (
                <View style={styles.cardMeta}>
                  <Users size={14} color={isInactive ? '#9CA3AF' : '#6B7280'} strokeWidth={2} />
                  <Text style={[styles.cardMetaText, isInactive && styles.textInactive]}>
                    {item.studentCount || 0} alunos
                  </Text>
                </View>
              )}
            </View>
            
            {isManager && (
              <TouchableOpacity
                style={styles.menuButton}
                onPress={(e) => {
                  e.stopPropagation();
                  setShowMenuForClass(showMenuForClass === item.id ? null : item.id);
                }}
                disabled={isProcessing}
              >
                <MoreVertical size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.cardFooter}>
            <Text style={[styles.cardAction, isInactive && styles.textInactive]}>
              {isInactive ? 'Turma Arquivada' : 'Acessar turma'}
            </Text>
            {!isInactive && <ArrowRight size={20} color={iconColor} strokeWidth={2.5} />}
          </View>
        </TouchableOpacity>

        {isManager && showMenuForClass === item.id && (
          <>
            <TouchableOpacity 
              style={styles.menuBackdrop}
              activeOpacity={1}
              onPress={() => setShowMenuForClass(null)}
            />
            
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={(e) => handleEditClassroom(item, e)}
                disabled={isProcessing}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#F3E8FF' }]}>
                  <Edit3 size={16} color="#8B5CF6" />
                </View>
                <Text style={styles.menuItemText}>Editar</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={(e) => handleToggleClassroom(item, e)}
                disabled={isProcessing}
                activeOpacity={0.7}
              >
                {item.active !== false ? (
                  <>
                    <View style={[styles.menuIconContainer, { backgroundColor: '#FEE2E2' }]}>
                      <Archive size={16} color="#DC2626" />
                    </View>
                    <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Desativar</Text>
                  </>
                ) : (
                  <>
                    <View style={[styles.menuIconContainer, { backgroundColor: '#D1FAE5' }]}>
                      <ArchiveRestore size={16} color="#16A34A" />
                    </View>
                    <Text style={[styles.menuItemText, { color: '#16A34A' }]}>Reativar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <>
      {/* Header da Página */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>
          {schoolName || 'Gerenciamento da Escola'}
        </Text>
        <Text style={styles.pageSubtitle}>
          {isManager 
            ? 'Gerencie turmas, alunos e professores' 
            : 'Suas turmas e avaliações'}
        </Text>
      </View>

      {/* Stats Card - Apenas para Gestores */}
      {isManager && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <BookOpen size={24} color="#8B5CF6" strokeWidth={2.5} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{activeClasses.length}</Text>
              <Text style={styles.statLabel}>
                {activeClasses.length === 1 ? 'Turma' : 'Turmas'}
              </Text>
            </View>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Users size={24} color="#8B5CF6" strokeWidth={2.5} />
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

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        
        <View style={styles.actionsGrid}>
          {isManager && (
            <>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={handleManageClassrooms}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#F3E8FF' }]}>
                  <BookOpen size={22} color="#8B5CF6" strokeWidth={2.5} />
                </View>
                <Text style={styles.actionTitle}>Gerenciar Turmas</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={handleManageStudents}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#DBEAFE' }]}>
                  <UserPlus size={22} color="#2563EB" strokeWidth={2.5} />
                </View>
                <Text style={styles.actionTitle}>Alunos</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={handleManageTeachers}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <GraduationCap size={22} color="#D97706" strokeWidth={2.5} />
                </View>
                <Text style={styles.actionTitle}>Professores</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={handleManageMetrics}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#EDE9FE' }]}>
              <ClipboardList size={22} color="#7C3AED" strokeWidth={2.5} />
            </View>
            <Text style={styles.actionTitle}>Métricas</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={handleViewHistory}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <History size={22} color="#DC2626" strokeWidth={2.5} />
            </View>
            <Text style={styles.actionTitle}>Histórico</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={handleViewReports}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <BarChart3 size={22} color="#059669" strokeWidth={2.5} />
            </View>
            <Text style={styles.actionTitle}>Relatórios</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Título da lista */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>
          {isManager ? 'Turmas Ativas' : 'Minhas Turmas'}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeClasses.length}</Text>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
          data={activeClasses}
          renderItem={renderClassCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          onScrollBeginDrag={() => setShowMenuForClass(null)}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <BookOpen size={72} color="#D1D5DB" strokeWidth={1.5} />
              </View>
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
                  activeOpacity={0.8}
                >
                  <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
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
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 17,
    color: '#6B7280',
    fontWeight: '600',
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
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 2,
    height: 48,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.3,
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
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#E9D5FF',
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: 0.2,
  },
  listContainer: {
    paddingBottom: 32,
  },
  cardWrapper: {
    marginBottom: 16,
    marginHorizontal: 20,
    position: 'relative',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardInactive: {
    opacity: 0.6,
    borderStyle: 'dashed',
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
    letterSpacing: -0.2,
  },
  inactiveBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInactive: {
    color: '#9CA3AF',
  },
  menuButton: {
    padding: 6,
    marginLeft: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardMetaText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.06)',
    gap: 10,
  },
  cardAction: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 280,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 6,
    minWidth: 180,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
    zIndex: 1000,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    letterSpacing: 0.1,
  },
  menuDivider: {
    height: 2,
    backgroundColor: '#F3F4F6',
    marginVertical: 6,
    marginHorizontal: 12,
  },
});