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
  Modal,
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

  // Determina a role do usuário na escola
  const schoolRole = useMemo(() => {
    if (parsedSchoolId === null || !Array.isArray(schools)) return null;
    const context = schools.find(s => s.schoolId === parsedSchoolId);
    return context?.role || null;
  }, [parsedSchoolId, schools]);

  const isManager = schoolRole === 'SCHOOL_MANAGER';
  const isTeacher = schoolRole === 'TEACHER';

  // Função para carregar turmas
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

  // Carrega as turmas quando monta o componente
  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  // Recarrega as turmas quando a tela volta ao foco
  useFocusEffect(
    useCallback(() => {
      fetchClassrooms();
    }, [fetchClassrooms])
  );

  // Mostra apenas turmas ativas
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
    const actionPt = classItem.active !== false ? 'desativar' : 'reativar';
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
              
              // Recarregar a lista
              await fetchClassrooms();
              
              Alert.alert(
                'Sucesso!',
                `Turma ${classItem.active !== false ? 'desativada' : 'reativada'} com sucesso.`
              );
            } catch (error: any) {
              console.error(`Erro ao ${actionPt} turma:`, error);
              Alert.alert('Erro', `Não foi possível ${actionPt} a turma.`);
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
    const isInactive = item.active === false;

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          style={[
            styles.card, 
            { backgroundColor: bg, borderColor: border },
            isInactive && styles.cardInactive
          ]}
          onPress={() => onSelectClass(item)}
          activeOpacity={0.7}
          disabled={isProcessing}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconContainer, { backgroundColor: bg, borderColor: border }]}>
              <BookOpen size={24} color={isInactive ? '#9CA3AF' : iconColor} />
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
                  <Users size={14} color={isInactive ? '#9CA3AF' : '#6B7280'} />
                  <Text style={[styles.cardMetaText, isInactive && styles.textInactive]}>
                    {item.studentCount || 0} alunos
                  </Text>
                </View>
              )}
            </View>
            
            {/* Menu Button - Only for Managers */}
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
            {!isInactive && <ArrowRight size={18} color={iconColor} />}
          </View>
        </TouchableOpacity>

        {/* Dropdown Menu */}
        {isManager && showMenuForClass === item.id && (
          <>
            {/* Backdrop transparente */}
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
              onPress={handleManageClassrooms}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#F3E8FF' }]}>
                <BookOpen size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.actionTitle}>Gerenciar Turmas</Text>
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
          data={activeClasses}
          renderItem={renderClassCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          onScrollBeginDrag={() => setShowMenuForClass(null)}
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
  cardWrapper: {
    marginBottom: 12,
    position: 'relative',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardInactive: {
    opacity: 0.6,
    borderStyle: 'dashed',
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  inactiveBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInactive: {
    color: '#9CA3AF',
  },
  menuButton: {
    padding: 4,
    marginLeft: 4,
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
    borderRadius: 14,
    paddingVertical: 4,
    minWidth: 170,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#F9FAFB',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
    marginHorizontal: 10,
  },
});