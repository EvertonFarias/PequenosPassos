import { useRouter } from 'expo-router';
import { ArrowRight, Building2, GraduationCap, MapPin, Phone, Users, BookOpen, RefreshCw } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { AppHeader } from '@/components/AppHeader';

export default function SchoolSelectionScreen() {
  const { schools, user, isLoadingSchools, refreshUser } = useAuth();
  const router = useRouter();

  // Se schools estiver vazio mas não estiver carregando, tenta recarregar
  useEffect(() => {
    if (!isLoadingSchools && schools.length === 0 && user?.role === 'USER') {
      console.log('🔄 Schools vazias, recarregando dados do usuário...');
      refreshUser();
    }
  }, [schools.length, isLoadingSchools, user?.role]);

  const onSelectSchool = (school: any) => {
    router.push({
      pathname: '/(app)/class-selection',
      params: {
        schoolId: String(school.schoolId),
        schoolName: String(school.schoolName),
      },
    } as any);
  };

  const getRoleLabel = () => {
    if (schools.length === 0) return 'Minhas Escolas';
    
    const hasManager = schools.some((s: any) => s.role === 'SCHOOL_MANAGER');
    const hasTeacher = schools.some((s: any) => s.role === 'TEACHER');
    
    if (hasManager && hasTeacher) return 'Minhas Escolas (Gestor & Professor)';
    if (hasManager) return 'Minhas Escolas (Gestor)';
    if (hasTeacher) return 'Minhas Escolas (Professor)';
    
    return 'Minhas Escolas';
  };

  const getRoleBadgeConfig = (role: string) => {
    if (role === 'SCHOOL_MANAGER') {
      return {
        label: 'Gestor',
        bg: '#F3E8FF',
        border: '#DDD6FE',
        text: '#5B21B6',
      };
    }
    return {
      label: 'Professor',
      bg: '#DBEAFE',
      border: '#BFDBFE',
      text: '#1E40AF',
    };
  };

  const getSchoolColors = (index: number) => {
    const colors = [
      { bg: '#FFFBEB', border: '#FDE68A', iconColor: '#D97706' },
      { bg: '#EFF6FF', border: '#BFDBFE', iconColor: '#2563EB' },
      { bg: '#FCE7F3', border: '#FBCFE8', iconColor: '#DB2777' },
      { bg: '#F0FFF4', border: '#A7F3D0', iconColor: '#047857' },
      { bg: '#F5F3FF', border: '#DDD6FE', iconColor: '#5B21B6' },
    ];
    return colors[index % colors.length];
  };

  const onManageStudents = (school: any) => {
    router.push({
      pathname: '/(app)/student-list',
      params: {
        schoolId: String(school.schoolId),
        schoolName: String(school.schoolName),
      },
    } as any);
  };

  const renderSchoolCard = ({ item, index }: { item: any; index: number }) => {
    const colors = getSchoolColors(index);
    const roleBadge = getRoleBadgeConfig(item.role);
    
    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => onSelectSchool(item)}
          activeOpacity={0.7}
        >
          {/* Header com ícone e badge */}
          <View style={styles.cardHeader}>
            <View style={[styles.schoolIconContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Building2 size={28} color={colors.iconColor} />
            </View>
            
            <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg, borderColor: roleBadge.border }]}>
              <GraduationCap size={12} color={roleBadge.text} />
              <Text style={[styles.roleBadgeText, { color: roleBadge.text }]}>
                {roleBadge.label}
              </Text>
            </View>
          </View>

          {/* Nome da escola */}
          <Text style={styles.schoolName} numberOfLines={2}>
            {item.schoolName}
          </Text>

          {/* Informações da escola */}
          <View style={styles.infoContainer}>
            {item.address && (
              <View style={styles.infoRow}>
                <MapPin size={14} color="#6B7280" />
                <Text style={styles.infoText} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            )}
            
            {item.phone && (
              <View style={styles.infoRow}>
                <Phone size={14} color="#6B7280" />
                <Text style={styles.infoText}>{item.phone}</Text>
              </View>
            )}
          </View>

          {/* Estatísticas */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <BookOpen size={16} color="#8B5CF6" />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statValue}>{item.classroomCount || 0}</Text>
                <Text style={styles.statLabel}>Turmas</Text>
              </View>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Users size={16} color="#8B5CF6" />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statValue}>{item.studentCount || 0}</Text>
                <Text style={styles.statLabel}>Usuários</Text>
              </View>
            </View>
          </View>

          {/* Botão de ação */}
          <View style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Selecionar Escola</Text>
            <ArrowRight size={18} color="#8B5CF6" />
          </View>
        </TouchableOpacity>

        {/* Botões de ações adicionais */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => onManageStudents(item)}
            activeOpacity={0.7}
          >
            <Users size={18} color="#8B5CF6" />
            <Text style={styles.secondaryActionButtonText}>Gerenciar Alunos</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader title={getRoleLabel()} />

      {/* Header com ícone */}
      <View style={styles.pageHeader}>
        <View style={styles.pageIconContainer}>
          <Building2 size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.pageTitle}>Selecione uma Escola</Text>
        <Text style={styles.pageSubtitle}>
          Escolha a escola para acessar turmas e alunos
        </Text>
      </View>

      {/* Loading State */}
      {isLoadingSchools ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando escolas...</Text>
        </View>
      ) : (
        /* Lista de escolas */
        <FlatList
          data={schools}
          renderItem={renderSchoolCard}
          keyExtractor={(item: any, index) => String(item?.schoolId ?? index)}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Building2 size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Nenhuma escola encontrada</Text>
              <Text style={styles.emptySubtitle}>
                Você ainda não está vinculado a nenhuma escola.
              </Text>
              <TouchableOpacity 
                style={styles.refreshButton} 
                onPress={refreshUser}
                disabled={isLoadingSchools}
              >
                {isLoadingSchools ? (
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <>
                    <RefreshCw size={18} color="#8B5CF6" />
                    <Text style={styles.refreshButtonText}>Tentar Novamente</Text>
                  </>
                )}
              </TouchableOpacity>
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
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  secondaryActionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#E9D5FF',
  },
  secondaryActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  schoolIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  schoolName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    lineHeight: 26,
  },
  infoContainer: {
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 24,
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
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    minWidth: 160,
    justifyContent: 'center',
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});