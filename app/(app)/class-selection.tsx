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
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { AppHeader } from '../../components/AppHeader'; // Caminho relativo
import { Users, Plus, ArrowRight } from 'lucide-react-native';
import api from '../../lib/api'; // Caminho relativo

// Interface para o DTO que o backend agora envia
interface ClassroomDTO {
  id: number;
  name: string;
  description: string;
  studentCount: number;
}

export default function ClassSelectionScreen() {
  const router = useRouter();
  const { user, schools } = useAuth(); // Pegamos o 'schools' do AuthContext
  const { schoolId, schoolName } = useLocalSearchParams(); // Pega os dados da rota

  // Parseia o `schoolId` da rota (pode vir como string | string[] | undefined)
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

  // --- Lógica de Permissão ---
  // Descobre a role do usuário *nesta escola específica*
  const schoolRole = useMemo(() => {
    if (parsedSchoolId === null || !Array.isArray(schools)) return null;
    const context = schools.find(s => s.schoolId === parsedSchoolId);
    return context?.role || null;
  }, [parsedSchoolId, schools]);

  const isManager = schoolRole === 'SCHOOL_MANAGER';
  // --- Fim da Lógica de Permissão ---

  // Efeito para carregar as turmas da escola selecionada
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
        // Chama o endpoint tipado para que response.data tenha o tipo correto
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
    // Navega para a lista de alunos daquela turma
    router.push({
      pathname: '/(app)/student-list', // Próxima tela
      params: { 
        classroomId: classItem.id, 
        classroomName: classItem.name 
      },
    });
  };

  // Pega as cores do seu design web
  const getClassColor = (index: number) => {
    const colors = [
      { bg: '#FFFBEB', border: '#FDE68A' }, // Yellow
      { bg: '#EFF6FF', border: '#BFDBFE' }, // Blue
      { bg: '#FFF1F2', border: '#FBCFE8' }, // Pink
      { bg: '#F5F3FF', border: '#DDD6FE' }, // Purple
    ];
    return colors[index % colors.length];
  };

  const renderClassCard = ({ item, index }: { item: ClassroomDTO; index: number }) => {
    const { bg, border } = getClassColor(index);
    const studentCount = item.studentCount || 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: bg, borderColor: border }]}
        onPress={() => onSelectClass(item)}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <View style={styles.cardSubtitleContainer}>
              <Users size={16} color="#6B7280" />
              <Text style={styles.cardSubtitle}>{studentCount} alunos</Text>
            </View>
          </View>
          <View style={styles.cardArrowButton}>
            <Text style={styles.cardArrowButtonText}>Entrar</Text>
            <ArrowRight size={16} color="#374151" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader 
        title={schoolName ? `${schoolName}` : 'Minhas Turmas'}
        showBack={router.canGoBack()} // Mostra "Voltar" se puder voltar (ex: se veio da seleç. de escola)
      />
      
      {/* Header da Página */}
      <View style={styles.pageHeader}>
        <View style={styles.pageIconContainer}>
          <Users size={32} color="#f97316" />
        </View>
        <Text style={styles.pageTitle}>Turmas</Text>
        <Text style={styles.pageSubtitle}>Selecione uma turma para começar</Text>
      </View>

      {/* Lista de Turmas */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 20 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={classes}
          renderItem={renderClassCard}
          keyExtractor={(item, index) => (((item as any)?.id ?? index) as any).toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhuma turma cadastrada nesta escola.</Text>
          }
          ListHeaderComponent={
            <>
              {/* Botão de Nova Turma (Apenas para Gestor) */}
              {isManager && (
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => Alert.alert("Em breve", "Função de criar turma em desenvolvimento.")}
                >
                  <Plus size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Nova Turma</Text>
                </TouchableOpacity>
              )}
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', 
  },
  // Header da Página
  pageHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  pageIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: '#FFEDD5', // Laranja claro
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#4B5563',
  },
  // Lista
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20, // Espaço entre o botão e a lista
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Card
  card: {
    borderWidth: 2,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  cardArrowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardArrowButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginRight: 8,
  },
  // Empty/Error
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#EF4444',
  },
});