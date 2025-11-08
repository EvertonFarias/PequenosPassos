import { useRouter } from 'expo-router';
import { ArrowRight, Building2, GraduationCap, MapPin, Phone, RefreshCw } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
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
  const triedRefreshRef = useRef(false);

  useEffect(() => {
    // Only attempt a single automatic refresh when schools are empty to avoid an infinite loop
    const triedRefresh = triedRefreshRef.current;
    if (!isLoadingSchools && schools.length === 0 && user?.role === 'USER' && !triedRefresh) {
      console.log('🔄 Schools vazias, recarregando dados do usuário...');
      triedRefreshRef.current = true;
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
        bg: '#FEF3C7',
        border: '#FDE68A',
        text: '#92400E',
      };
    }
    return {
      label: 'Professor',
      bg: '#DBEAFE',
      border: '#93C5FD',
      text: '#1E40AF',
    };
  };

  const getSchoolColors = (index: number) => {
    const colors = [
      { bg: '#FEF3C7', border: '#FCD34D', iconColor: '#F59E0B' },
      { bg: '#DBEAFE', border: '#93C5FD', iconColor: '#3B82F6' },
      { bg: '#FCE7F3', border: '#F9A8D4', iconColor: '#EC4899' },
      { bg: '#D1FAE5', border: '#6EE7B7', iconColor: '#10B981' },
      { bg: '#E9D5FF', border: '#C084FC', iconColor: '#A855F7' },
    ];
    return colors[index % colors.length];
  };

  const renderSchoolCard = ({ item, index }: { item: any; index: number }) => {
    const colors = getSchoolColors(index);
    const roleBadge = getRoleBadgeConfig(item.role);
    
    return (
      <View style={styles.card}>
        {/* Header com ícone e badge */}
        <View style={styles.cardHeader}>
          <View style={[styles.schoolIconContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Building2 size={32} color={colors.iconColor} strokeWidth={2.5} />
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg, borderColor: roleBadge.border }]}>
            <GraduationCap size={13} color={roleBadge.text} strokeWidth={2.5} />
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
              <View style={styles.infoIconWrapper}>
                <MapPin size={16} color="#6B7280" strokeWidth={2} />
              </View>
              <Text style={styles.infoText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          )}

          {item.phone && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Phone size={16} color="#6B7280" strokeWidth={2} />
              </View>
              <Text style={styles.infoText}>{item.phone}</Text>
            </View>
          )}
        </View>

        {/* Botão de ação */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onSelectSchool(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionButtonText}>Acessar Escola</Text>
          <ArrowRight size={20} color="#8B5CF6" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader title={getRoleLabel()} />

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
          ListHeaderComponent={
            <View style={styles.pageHeader}>
              <View style={styles.pageIconContainer}>
                <Building2 size={36} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.pageTitle}>Selecione uma Escola</Text>
              <Text style={styles.pageSubtitle}>
                Escolha a escola para acessar turmas e alunos
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Building2 size={72} color="#D1D5DB" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma escola encontrada</Text>
              <Text style={styles.emptySubtitle}>
                Você ainda não está vinculado a nenhuma escola.
              </Text>
              <TouchableOpacity 
                style={styles.refreshButton} 
                onPress={refreshUser}
                disabled={isLoadingSchools}
                activeOpacity={0.8}
              >
                {isLoadingSchools ? (
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <>
                    <RefreshCw size={20} color="#8B5CF6" strokeWidth={2.5} />
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
    backgroundColor: '#FFFFFF',
  },
  pageHeader: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },
  pageIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
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
  listContainer: {
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    marginHorizontal: 20,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  schoolIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 5,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  schoolName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  infoContainer: {
    gap: 12,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: '#F3F4F6',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '500',
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: '#E9D5FF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 0.2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    gap: 10,
    minWidth: 200,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E9D5FF',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 0.2,
  },
});