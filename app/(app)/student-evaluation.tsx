import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../components/AppHeader';
import { 
  User,
  MessageSquare,
  CheckCircle,
} from 'lucide-react-native';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';

interface MetricDefinition {
  id: number;
  name: string;
  label: string;
  description?: string;
}

interface MetricValue {
  metricDefinitionId: number;
  value: number;
}

export default function StudentEvaluationScreen() {
  const router = useRouter();
  const toast = useToast();
  const { studentId, studentName, classroomId, classroomName } = useLocalSearchParams();

  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [metricValues, setMetricValues] = useState<Record<number, number>>({});
  const [observation, setObservation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedStudentId = Array.isArray(studentId) ? Number(studentId[0]) : Number(studentId);
  const parsedClassroomId = Array.isArray(classroomId) ? Number(classroomId[0]) : Number(classroomId);
  const displayStudentName = Array.isArray(studentName) ? studentName[0] : studentName;
  const displayClassroomName = Array.isArray(classroomName) ? classroomName[0] : classroomName;

  // Carrega métricas ativas da turma
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get<MetricDefinition[]>(`/classrooms/${parsedClassroomId}/metrics`);
        setMetrics(response.data ?? []);
      } catch (e: any) {
        console.error('Falha ao carregar métricas:', e);
        setError('Falha ao carregar métricas da turma.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [parsedClassroomId]);

  const handleMetricChange = (metricId: number, value: number) => {
    setMetricValues(prev => ({
      ...prev,
      [metricId]: value,
    }));
  };

  const isFormValid = () => {
    // Todas as métricas devem ter um valor
    return metrics.every(metric => metricValues[metric.id] !== undefined);
  };

  const handleSaveEvaluation = async () => {
    if (!isFormValid()) {
      Alert.alert(
        'Avaliação Incompleta',
        'Por favor, avalie o aluno em todas as métricas antes de salvar.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsSaving(true);

      const metricsPayload: MetricValue[] = metrics.map(metric => ({
        metricDefinitionId: metric.id,
        value: metricValues[metric.id],
      }));

      const payload = {
        studentId: parsedStudentId,
        classroomId: parsedClassroomId,
        date: new Date().toISOString().split('T')[0], // formato YYYY-MM-DD
        metrics: metricsPayload,
        observation: observation.trim() || null,
      };

      await api.post('/assessments', payload);

      toast.showToast('Avaliação salva com sucesso!', 'success');
      
      // Volta para a tela anterior
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (e: any) {
      console.error('Erro ao salvar avaliação:', e);
      const errorMessage = e.response?.data?.message || 'Falha ao salvar avaliação. Tente novamente.';
      Alert.alert('Erro', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsSaving(false);
    }
  };

  const renderMetricCard = (metric: MetricDefinition) => {
    const selectedValue = metricValues[metric.id];

    // Emojis e cores para cada nota (5 = melhor, 1 = pior)
    const emojiScale = [
      { value: 1, emoji: '😢', color: '#ec485eb2', bg: '#FCE7F3', label: 'Insatisfatório' },
      { value: 2, emoji: '😟', color: '#f59f0ba6', bg: '#FEF3C7', label: 'Precisa Melhorar' },
      { value: 3, emoji: '😐', color: '#8a5cf6ab', bg: '#F3E8FF', label: 'Regular' },
      { value: 4, emoji: '🙂', color: '#3b83f69f', bg: '#DBEAFE', label: 'Bom' },
      { value: 5, emoji: '😊', color: '#10b981a1', bg: '#D1FAE5', label: 'Excelente' },
    ];

    return (
      <View key={metric.id} style={styles.metricCard}>
        <View style={styles.metricHeader}>
          <Text style={styles.metricLabel}>{metric.label}</Text>
          {metric.description && (
            <Text style={styles.metricDescription}>{metric.description}</Text>
          )}
        </View>

        <View style={styles.ratingContainer}>
          {emojiScale.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.emojiButton,
                selectedValue === item.value && {
                  backgroundColor: item.color,
                  borderColor: item.color,
                  transform: [{ scale: 1.1 }],
                },
              ]}
              onPress={() => handleMetricChange(metric.id, item.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiIcon}>{item.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Label da nota selecionada */}
        {selectedValue && (
          <View style={styles.selectedLabelContainer}>
            <Text style={[
              styles.selectedLabel,
              { color: emojiScale.find(e => e.value === selectedValue)?.color }
            ]}>
              {emojiScale.find(e => e.value === selectedValue)?.label}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <AppHeader 
          title="Avaliar Aluno" 
          showBack 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando métricas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || metrics.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <AppHeader 
          title="Avaliar Aluno" 
          showBack 
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || 'Esta turma não possui métricas ativas.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader 
        title="Avaliar Aluno" 
        showBack 
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Student Info Card */}
        <View style={styles.studentCard}>
          <View style={styles.studentIconContainer}>
            <User size={32} color="#8B5CF6" />
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{displayStudentName}</Text>
            <Text style={styles.classroomName}>{displayClassroomName}</Text>
            <Text style={styles.evaluationDate}>
              {new Date().toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>

        {/* Metrics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avaliação por Métrica</Text>
          <Text style={styles.sectionSubtitle}>
            Avalie o desempenho do aluno em cada área (1 = precisa melhorar, 5 = excelente)
          </Text>
        </View>

        {metrics.map(metric => renderMetricCard(metric))}

        {/* Observation Section */}
        <View style={styles.section}>
          <View style={styles.observationHeader}>
            <MessageSquare size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>Observações (Opcional)</Text>
          </View>
          <TextInput
            style={styles.observationInput}
            placeholder="Adicione observações sobre o desempenho do aluno..."
            placeholderTextColor="#9CA3AF"
            value={observation}
            onChangeText={setObservation}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!isFormValid() || isSaving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSaveEvaluation}
          disabled={!isFormValid() || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Salvar Avaliação</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  studentCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  studentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  studentInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  studentName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  classroomName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  evaluationDate: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricHeader: {
    marginBottom: 16,
  },
  metricLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  metricDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  emojiButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    minHeight: 64,
  },
  emojiIcon: {
    fontSize: 32,
  },
  selectedLabelContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  observationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  observationInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 120,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 24,
  },
});
