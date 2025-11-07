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

export default function ManageClassroomsScreen() {
  const router = useRouter();
  const { schools } = useAuth();
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
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'archived'>('all');

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

  // Filtra turmas baseado na tab selecionada
  const filteredClasses = useMemo(() => {
    if (filterTab === 'all') return classes;
    if (filterTab === 'active') return classes.filter(c => c.active !== false);
    if (filterTab === 'archived') return classes.filter(c => c.active === false);
    return classes;
  }, [classes, filterTab]);

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
          onPress={() => !isInactive && onSelectClass(item)}
          activeOpacity={isInactive ? 1 : 0.7}
          disabled={isProcessing || isInactive}
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
              <View style={styles.cardMeta}>
                <Users size={14} color={isInactive ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.cardMetaText, isInactive && styles.textInactive]}>
                  {item.studentCount || 0} alunos
                </Text>
              </View>
            </View>
            
            {/* Menu Button */}
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
          </View>

          <View style={styles.cardFooter}>
            <Text style={[styles.cardAction, isInactive && styles.textInactive]}>
              {isInactive ? ' Reative para acessar' : 'Acessar turma'}
            </Text>
            {!isInactive && <ArrowRight size={18} color={iconColor} />}
          </View>
        </TouchableOpacity>

        {/* Dropdown Menu */}
        {showMenuForClass === item.id && (
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
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader title="Gerenciar Turmas" showBack={true} />

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
        <>



            


          {/* Botão Nova Turma */}
          <View style={styles.newButtonContainer}>
            <TouchableOpacity style={styles.newButton} onPress={handleNewClass}>
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.newButtonText}>Nova Turma</Text>
            </TouchableOpacity>
          </View>

          {/* Filtro de Turmas - Tabs */}
          <View style={styles.filterSection}>
            <TouchableOpacity 
              style={[styles.filterTab, filterTab === 'all' && styles.filterTabActive]}
              onPress={() => setFilterTab('all')}
            >
              <Text style={[styles.filterTabText, filterTab === 'all' && styles.filterTabTextActive]}>
                Todas
              </Text>
              <View style={[styles.filterBadge, filterTab === 'all' && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, filterTab === 'all' && styles.filterBadgeTextActive]}>
                  {classes.length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterTab, filterTab === 'active' && styles.filterTabActive]}
              onPress={() => setFilterTab('active')}
            >
              <Text style={[styles.filterTabText, filterTab === 'active' && styles.filterTabTextActive]}>
                Ativas
              </Text>
              <View style={[styles.filterBadge, filterTab === 'active' && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, filterTab === 'active' && styles.filterBadgeTextActive]}>
                  {classes.filter(c => c.active !== false).length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterTab, filterTab === 'archived' && styles.filterTabActive]}
              onPress={() => setFilterTab('archived')}
            >
              <Archive size={17} color={filterTab === 'archived' ? '#8B5CF6' : '#6B7280'} />
              <Text style={[styles.filterTabText, filterTab === 'archived' && styles.filterTabTextActive]}>
                Arquivadas
              </Text>
              <View style={[styles.filterBadge, filterTab === 'archived' && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, filterTab === 'archived' && styles.filterBadgeTextActive]}>
                  {classes.filter(c => c.active === false).length}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredClasses}
            renderItem={renderClassCard}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => setShowMenuForClass(null)}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <BookOpen size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Nenhuma turma encontrada</Text>
                <Text style={styles.emptySubtitle}>
                  {filterTab === 'archived'
                    ? 'Não há turmas arquivadas.'
                    : 'Crie sua primeira turma para começar.'}
                </Text>
              </View>
            }
          />
        </>
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
    fontSize: 2
    ,
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
  newButtonContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  newButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterSection: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#5B21B6',
  },
  filterBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: '#DDD6FE',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterBadgeTextActive: {
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
    opacity: 0.65,
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
  dropdownMenu: {
    position: 'absolute',
    top: 52,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 6,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#e5e7eb53',
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
