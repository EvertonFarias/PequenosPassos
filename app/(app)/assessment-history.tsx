import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../components/AppHeader';
import { 
  Search,
  Calendar,
  User,
  X,
  Edit2,
  CheckCircle,
} from 'lucide-react-native';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';

interface MetricValue {
  metricDefinitionId: number;
  name: string;
  label: string;
  value: number;
}

interface Assessment {
  id: number;
  studentId: number;
  studentName: string;
  classroomId: number;
  date: string;
  evaluatorName: string;
  evaluatedAt: string;
  metrics: MetricValue[];
  observation?: string;
}

export default function AssessmentHistoryScreen() {
  const router = useRouter();
  const toast = useToast();
  const { schoolId, classroomId } = useLocalSearchParams();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const parsedSchoolId = Array.isArray(schoolId) ? Number(schoolId[0]) : schoolId ? Number(schoolId) : undefined;
  const parsedClassroomId = Array.isArray(classroomId) ? Number(classroomId[0]) : classroomId ? Number(classroomId) : undefined;

  const fetchAssessments = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      if (pageNum === 0) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const params: any = {
        page: pageNum,
        size: 20,
      };

      if (parsedSchoolId) params.schoolId = parsedSchoolId;
      if (parsedClassroomId) params.classroomId = parsedClassroomId;
      if (search.trim()) params.search = search.trim();

      const response = await api.get<any>('/assessments/history', { params });
      
      const newAssessments = response.data.content || [];
      
      if (isRefresh || pageNum === 0) {
        setAssessments(newAssessments);
      } else {
        setAssessments(prev => [...prev, ...newAssessments]);
      }

      setHasMore(!response.data.last);
      setPage(pageNum);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.showToast('Erro ao carregar histórico de avaliações', 'error');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [parsedSchoolId, parsedClassroomId, search]);

  useEffect(() => {
    fetchAssessments(0);
  }, []);

  const handleSearch = () => {
    setPage(0);
    setHasMore(true);
    fetchAssessments(0);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchAssessments(page + 1);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setPage(0);
    setHasMore(true);
    fetchAssessments(0, true);
  };

  const handleCardPress = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
  };

  const handleEditPress = () => {
    if (!selectedAssessment) return;
    
    closeDetailModal();
    router.push({
      pathname: '/(app)/student-evaluation',
      params: {
        studentId: selectedAssessment.studentId,
        studentName: selectedAssessment.studentName,
        classroomId: selectedAssessment.classroomId,
        assessmentId: selectedAssessment.id,
        mode: 'edit',
      },
    });
  };

  const closeDetailModal = () => {
    setSelectedAssessment(null);
    setIsEditModalOpen(false);
  };

  const getEmojiForValue = (value: number) => {
    const emojiMap: Record<number, string> = {
      1: '😢',
      2: '😟',
      3: '😐',
      4: '🙂',
      5: '😊',
    };
    return emojiMap[value] || '❓';
  };

  const renderAssessmentCard = ({ item }: { item: Assessment }) => {
    // Corrige timezone: adiciona 'T00:00:00' para interpretar como hora local
    const formattedDate = new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR');
    // Calcula média arredondada para número inteiro
    const avgScore = item.metrics.length > 0
      ? Math.round(item.metrics.reduce((sum, m) => sum + m.value, 0) / item.metrics.length)
      : 0;

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.studentInfo}>
            <View style={styles.studentIcon}>
              <User size={20} color="#8B5CF6" />
            </View>
            <View style={styles.studentDetails}>
              <Text style={styles.studentName}>{item.studentName}</Text>
              <Text style={styles.evaluatorText}>Por: {item.evaluatorName}</Text>
            </View>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreValue}>{avgScore}</Text>
            <Text style={styles.scoreLabel}>Média</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.dateContainer}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <Text style={styles.metricsCount}>
            {item.metrics.length} {item.metrics.length === 1 ? 'métrica' : 'métricas'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedAssessment) return null;

    // Corrige timezone: adiciona 'T00:00:00' para interpretar como hora local
    const formattedDate = new Date(selectedAssessment.date + 'T00:00:00').toLocaleDateString('pt-BR');
    const formattedDateTime = new Date(selectedAssessment.evaluatedAt).toLocaleString('pt-BR');

    return (
      <Modal
        visible={!!selectedAssessment}
        animationType="slide"
        transparent
        onRequestClose={closeDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>Detalhes da Avaliação</Text>
              </View>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity 
                  style={styles.editIconButton}
                  onPress={handleEditPress}
                >
                  <Edit2 size={20} color="#8B5CF6" />
                </TouchableOpacity>
                <TouchableOpacity onPress={closeDetailModal}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Info do Aluno */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Aluno</Text>
                <Text style={styles.detailValue}>{selectedAssessment.studentName}</Text>
              </View>

              {/* Data */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Data da Avaliação</Text>
                <Text style={styles.detailValue}>{formattedDate}</Text>
              </View>

              {/* Avaliador */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Avaliado por</Text>
                <Text style={styles.detailValue}>{selectedAssessment.evaluatorName}</Text>
                <Text style={styles.detailSubtext}>{formattedDateTime}</Text>
              </View>

              {/* Métricas */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Avaliação por Métrica</Text>
                {selectedAssessment.metrics.map((metric) => (
                  <View key={metric.metricDefinitionId} style={styles.metricRow}>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                    <View style={styles.metricScore}>
                      <Text style={styles.emojiScore}>{getEmojiForValue(metric.value)}</Text>
                      <Text style={styles.metricValue}>{metric.value}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Observação */}
              {selectedAssessment.observation && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Observações</Text>
                  <Text style={styles.observationText}>{selectedAssessment.observation}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <AppHeader title="Histórico de Avaliações" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando histórico...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader title="Histórico de Avaliações" showBack />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome do aluno..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearch('');
              handleSearch();
            }}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Avaliações */}
      <FlatList
        data={assessments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderAssessmentCard}
        contentContainerStyle={styles.listContainer}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#8B5CF6']}
            tintColor="#8B5CF6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Calendar size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Nenhuma avaliação encontrada</Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Tente buscar por outro nome' : 'Ainda não há avaliações registradas'}
            </Text>
          </View>
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#8B5CF6" />
              <Text style={styles.loadingMoreText}>Carregando mais...</Text>
            </View>
          ) : null
        }
      />

      {/* Modal de Detalhes */}
      {renderDetailModal()}
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  searchButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  evaluatorText: {
    fontSize: 13,
    color: '#6B7280',
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  metricsCount: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
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
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6B7280',
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
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  detailSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  metricLabel: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  metricScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emojiScore: {
    fontSize: 24,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
    minWidth: 20,
  },
  observationText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
