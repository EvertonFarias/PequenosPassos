import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { 
  X,
  MessageSquare,
  CheckCircle,
} from 'lucide-react-native';
import api from '../lib/api';

interface MetricDefinition {
  id: number;
  name: string;
  label: string;
  description?: string;
}

interface StudentEvaluationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studentId: number;
  studentName: string;
  classroomId: number;
  assessmentId?: number | null;
  isEditMode?: boolean;
}

const EMOJI_MAP: Record<number, string> = {
  1: '😢',
  2: '😟',
  3: '😐',
  4: '😊',
  5: '😄',
};

const EMOJI_COLORS: Record<number, string> = {
  1: '#FEE2E2', // red-100
  2: '#FED7AA', // orange-200
  3: '#FEF3C7', // yellow-100
  4: '#BBF7D0', // green-200
  5: '#D1FAE5', // green-100
};

export default function StudentEvaluationModal({
  visible,
  onClose,
  onSuccess,
  studentId,
  studentName,
  classroomId,
  assessmentId = null,
  isEditMode = false,
}: StudentEvaluationModalProps) {
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [metricValues, setMetricValues] = useState<Record<number, number>>({});
  const [observation, setObservation] = useState('');
  const [originalDate, setOriginalDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega métricas e dados da avaliação (se modo edição)
  useEffect(() => {
    if (!visible) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('📊 Carregando métricas da turma:', classroomId);
        
        // Carrega métricas da turma
        const metricsResponse = await api.get<MetricDefinition[]>(`/classrooms/${classroomId}/metrics`);
        console.log('✅ Métricas carregadas:', metricsResponse.data);
        setMetrics(metricsResponse.data ?? []);

        // Se modo edição, carrega dados da avaliação existente
        if (isEditMode && assessmentId) {
          console.log('✏️ Modo edição - carregando avaliação:', assessmentId);
          const assessmentResponse = await api.get<any>(`/assessments/${assessmentId}`);
          const assessment = assessmentResponse.data;
          console.log('✅ Avaliação carregada:', assessment);

          // Salva a data original da avaliação
          setOriginalDate(assessment.date);

          // Preenche os valores das métricas
          const values: Record<number, number> = {};
          if (assessment.metrics) {
            assessment.metrics.forEach((metric: any) => {
              values[metric.metricDefinitionId] = metric.value;
            });
          }
          setMetricValues(values);
          setObservation(assessment.observation || '');
        } else {
          // Limpa valores ao abrir para nova avaliação
          setMetricValues({});
          setObservation('');
          setOriginalDate(null);
        }
      } catch (e: any) {
        console.error('❌ Falha ao carregar dados:', e);
        console.error('Erro completo:', e.response?.data || e.message);
        setError(isEditMode ? 'Falha ao carregar avaliação.' : 'Falha ao carregar métricas da turma.');
      } finally {
        console.log('✅ Loading finalizado. Total de métricas:', metrics.length);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [visible, classroomId, isEditMode, assessmentId]);

  const handleMetricChange = (metricId: number, value: number) => {
    setMetricValues(prev => ({
      ...prev,
      [metricId]: value,
    }));
  };

  const handleSave = async () => {
    // Validação: todas as métricas devem ter valor
    const allMetricsEvaluated = metrics.every(m => metricValues[m.id] !== undefined);
    
    if (!allMetricsEvaluated) {
      setError('Por favor, avalie todas as métricas antes de salvar.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        studentId,
        classroomId,
        date: isEditMode && originalDate ? originalDate : new Date().toISOString().split('T')[0],
        observation: observation.trim() || null,
        metrics: metrics.map(metric => ({
          metricDefinitionId: metric.id,
          value: metricValues[metric.id],
        })),
      };

      if (isEditMode && assessmentId) {
        await api.put(`/assessments/${assessmentId}`, payload);
      } else {
        await api.post('/assessments', payload);
      }

      onSuccess();
      handleClose();
    } catch (e: any) {
      console.error('Falha ao salvar avaliação:', e);
      const errorMessage = e.response?.data?.message || 'Falha ao salvar a avaliação.';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Limpa estados ao fechar
    setMetricValues({});
    setObservation('');
    setOriginalDate(null);
    setError(null);
    onClose();
  };

  const renderEmojiScale = (metric: MetricDefinition) => {
    const currentValue = metricValues[metric.id];

    return (
      <View style={styles.metricCard} key={metric.id}>
        <View style={styles.metricHeader}>
          <Text style={styles.metricLabel}>{metric.label}</Text>
          {currentValue && (
            <View style={[styles.selectedBadge, { backgroundColor: EMOJI_COLORS[currentValue] }]}>
              <Text style={styles.selectedEmoji}>{EMOJI_MAP[currentValue]}</Text>
              <Text style={styles.selectedValue}>{currentValue}</Text>
            </View>
          )}
        </View>

        <View style={styles.emojiScale}>
          {[1, 2, 3, 4, 5].map((value) => {
            const isSelected = currentValue === value;
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.emojiButton,
                  { backgroundColor: EMOJI_COLORS[value] },
                  isSelected && styles.emojiButtonSelected,
                ]}
                onPress={() => handleMetricChange(metric.id, value)}
                activeOpacity={0.7}
              >
                <Text style={styles.emoji}>{EMOJI_MAP[value]}</Text>
                <Text style={[styles.emojiValue, isSelected && styles.emojiValueSelected]}>
                  {value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Text style={styles.modalTitle}>
                {isEditMode ? 'Editar Avaliação' : 'Nova Avaliação'}
              </Text>
              <Text style={styles.modalSubtitle}>{studentName}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>Carregando...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <>
                {/* Métricas */}
                <View style={styles.metricsSection}>
                  <Text style={styles.sectionTitle}>Avaliação de Métricas</Text>
                  {metrics.map(metric => renderEmojiScale(metric))}
                </View>

                {/* Observação */}
                <View style={styles.observationSection}>
                  <View style={styles.observationHeader}>
                    <MessageSquare size={20} color="#8B5CF6" />
                    <Text style={styles.sectionTitle}>Observações (Opcional)</Text>
                  </View>
                  <TextInput
                    style={styles.observationInput}
                    placeholder="Adicione observações sobre o desenvolvimento do aluno..."
                    placeholderTextColor="#9CA3AF"
                    value={observation}
                    onChangeText={setObservation}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          {!isLoading && !error && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>
                      {isEditMode ? 'Atualizar' : 'Salvar'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: '70%',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    padding: 20,
    margin: 20,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  metricsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  selectedEmoji: {
    fontSize: 16,
  },
  selectedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  emojiScale: {
    flexDirection: 'row',
    gap: 8,
  },
  emojiButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiButtonSelected: {
    borderColor: '#8B5CF6',
    transform: [{ scale: 1.05 }],
  },
  emoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  emojiValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  emojiValueSelected: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  observationSection: {
    padding: 20,
    paddingTop: 0,
  },
  observationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  observationInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
