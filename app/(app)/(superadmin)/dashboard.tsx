import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  LayoutAnimation,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Toast } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';
import { BarChart3, Building2, Plus, Search, Settings, Users, X, UserCheck, Trash2, UserX } from 'lucide-react-native';

interface SchoolDTO {
  id: number;
  name: string;
  address: string;
  phone: string;
  active: boolean;
  classroomCount: number;
  userCount: number;
  managers?: PotentialManagerDTO[];
}

interface PotentialManagerDTO {
  id: string;
  name: string;
}

const getCardColor = (index: number) => {
  const colors = [
    { bg: '#FFFBEB', iconBg: '#FDE68A', iconColor: '#D97706' },
    { bg: '#EFF6FF', iconBg: '#BFDBFE', iconColor: '#2563EB' },
    { bg: '#FCE7F3', iconBg: '#FBCFE8', iconColor: '#DB2777' },
    { bg: '#F0FFF4', iconBg: '#A7F3D0', iconColor: '#047857' },
    { bg: '#F5F3FF', iconBg: '#DDD6FE', iconColor: '#5B21B6' },
  ];
  return colors[index % colors.length];
};

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { toast, hideToast, success, error: showError, warning } = useToast();
  
  const [schools, setSchools] = useState<SchoolDTO[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<SchoolDTO[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [potentialManagers, setPotentialManagers] = useState<PotentialManagerDTO[]>([]);
  const [isLoadingManagers, setIsLoadingManagers] = useState(false);

  // Edit modal state
  const [editingSchool, setEditingSchool] = useState<SchoolDTO | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);
  const [showManagerPicker, setShowManagerPicker] = useState(false);

  const fetchSchools = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get<SchoolDTO[]>('/schools');
      
      if (Array.isArray(response.data)) {
        const normalized: SchoolDTO[] = response.data.map((s: any, idx: number) => ({
          id: s.id ?? idx,
          name: (s.name ?? '') as string,
          address: (s.address ?? '') as string,
          phone: (s.phone ?? '') as string,
          active: Boolean(s.active),
          classroomCount: Number(s.classroomCount ?? 0),
          userCount: Number(s.userCount ?? 0),
          managers: Array.isArray(s.managers) ? s.managers : [],
        }));

        setSchools(normalized);
        setFilteredSchools(normalized);
      } else {
        throw new Error('Formato de dados inesperado.');
      }
    } catch (e: any) {
      console.error('Falha ao buscar escolas:', e);
      showError('Não foi possível carregar as escolas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPotentialManagers = useCallback(async () => {
    try {
      setIsLoadingManagers(true);
      const resp = await api.get<PotentialManagerDTO[]>('/users/potential-managers');
      const managers = Array.isArray(resp.data) ? resp.data : [];
      const validManagers = managers.filter(m => m && m.id && m.name);
      setPotentialManagers(validManagers);
    } catch (e) {
      console.warn('Falha ao buscar potential managers', e);
      setPotentialManagers([]);
    } finally {
      setIsLoadingManagers(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSchools();
    }, [fetchSchools])
  );

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredSchools(schools);
    } else {
      setFilteredSchools(
        schools.filter((school) => {
          const name = (school.name ?? '') as string;
          return name.toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }
  }, [searchTerm, schools]);

  const onSelectSchool = (school: SchoolDTO) => {
    console.log('Selecionou escola:', school.name);
  };

  const openEditModal = async (school: SchoolDTO) => {
    setEditingSchool(school);
    const initial = (school.managers || []).map((m) => m.id);
    setSelectedManagerIds(initial);
    setManagerSearchTerm('');
    setShowManagerPicker(false);
    if (potentialManagers.length === 0) {
      await fetchPotentialManagers();
    }
  };

  const closeEditModal = () => {
    setEditingSchool(null);
    setSelectedManagerIds([]);
    setShowManagerPicker(false);
  };

  const toggleManagerSelection = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedManagerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const removeManager = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedManagerIds((prev) => prev.filter((x) => x !== id));
  };

  const handleDeleteSchool = async (school: SchoolDTO) => {
    Alert.alert(
      'Excluir Escola',
      `Tem certeza que deseja excluir "${school.name}"? Esta ação não pode ser desfeita.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/schools/${school.id}`);
              await fetchSchools();
              success('Escola excluída com sucesso!');
            } catch (e: any) {
              const err: any = e;
              const respData = err?.response?.data;
              if (respData?.message) {
                showError(String(respData.message));
              } else {
                showError('Não foi possível excluir a escola.');
              }
            }
          },
        },
      ]
    );
  };

  const performEditSave = async () => {
    if (!editingSchool) return;
    setIsEditSaving(true);
    
    try {
      const payload = {
        name: editingSchool.name,
        address: editingSchool.address,
        phone: editingSchool.phone,
        managerUserIds: selectedManagerIds,
      } as any;

      await api.put(`/schools/${editingSchool.id}`, payload);
      await fetchSchools();
      closeEditModal();
      success('Escola atualizada com sucesso!');
    } catch (e: any) {
      const err: any = e;
      const status = err?.response?.status;
      const respData = err?.response?.data;
      
      console.error('Falha ao atualizar escola:', {
        schoolId: editingSchool.id,
        selectedManagers: selectedManagerIds,
        status,
        respData,
      });

      if (status === 403) {
        showError('Você não tem permissão para editar esta escola.');
      } else if (status === 404) {
        showError('Escola ou gestor não encontrado.');
      } else if (respData?.message) {
        showError(String(respData.message));
      } else {
        showError('Erro ao salvar. Tente novamente.');
      }
    } finally {
      setIsEditSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingSchool) return;

    // Confirmação ao remover todos os gestores
    if (selectedManagerIds.length === 0 && 
        editingSchool.managers && 
        editingSchool.managers.length > 0) {
      
      Alert.alert(
        'Confirmar Remoção',
        'Você está removendo todos os gestores desta escola. Tem certeza?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Confirmar', 
            style: 'destructive',
            onPress: performEditSave 
          }
        ]
      );
      return;
    }

    await performEditSave();
  };

  const getTotalStudents = () => {
    const list = Array.isArray(schools) ? schools : [];
    return list.reduce((acc, s) => acc + s.userCount, 0);
  };

  const getTotalClasses = () => {
    const list = Array.isArray(schools) ? schools : [];
    return list.reduce((acc, s) => acc + s.classroomCount, 0);
  };

  const getTotalSchools = () => {
    return Array.isArray(schools) ? schools.length : 0;
  };

  const getSelectedManagers = () => {
    if (!Array.isArray(potentialManagers)) return [];
    return potentialManagers.filter((m) => m && selectedManagerIds.includes(m.id));
  };

  const getFilteredManagers = () => {
    if (!Array.isArray(potentialManagers)) return [];
    return potentialManagers
      .filter((m) => {
        if (!m || !m.name) return false;
        return m.name.toLowerCase().includes(managerSearchTerm.toLowerCase());
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const renderSchoolCard = ({ item, index }: { item: SchoolDTO; index: number }) => {
    const colors = getCardColor(index);
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onSelectSchool(item)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: colors.bg }]}>
            <Building2 size={24} color={colors.iconColor} />
          </View>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>{item.address || 'Sem endereço'}</Text>
            {item.managers && item.managers.length > 0 && (
              <Text style={styles.cardManagers} numberOfLines={1}>
                <UserCheck size={12} color="#8B5CF6" /> {item.managers.length} gestor(es)
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => openEditModal(item)}>
            <Settings size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <View style={styles.cardStats}>
          <Text style={styles.statText}>
            {item.classroomCount} Turmas
          </Text>
          <Text style={styles.statText}>
            {item.userCount} Usuários
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader title="Painel Super Admin" /> 

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      {isLoading && schools.length === 0 ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={filteredSchools}
          renderItem={renderSchoolCard}
          keyExtractor={(item, index) => (item && item.id != null ? String(item.id) : String(index))}
          contentContainerStyle={styles.listContainer}
          onRefresh={fetchSchools} 
          refreshing={isLoading}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Nenhuma escola encontrada.
            </Text>
          }
          ListHeaderComponent={
            <>
              <View style={styles.headerActions}>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerGreeting}>Gestão de todas as escolas</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => router.push('/(app)/(superadmin)/new-school')} 
                >
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Nova Escola</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.statsGrid}>
                <View style={[styles.statCard, styles.statCardYellow]}>
                  <Building2 size={24} color="#D97706" />
                  <Text style={styles.statValue}>{getTotalSchools()}</Text>
                  <Text style={styles.statLabel}>Total de Escolas</Text>
                </View>
                <View style={[styles.statCard, styles.statCardBlue]}>
                  <Users size={24} color="#2563EB" />
                  <Text style={styles.statValue}>{getTotalStudents()}</Text>
                  <Text style={styles.statLabel}>Total de Alunos</Text>
                </View>
                <View style={[styles.statCard, styles.statCardPurple]}>
                  <BarChart3 size={24} color="#7C3AED" />
                  <Text style={styles.statValue}>{getTotalClasses()}</Text>
                  <Text style={styles.statLabel}>Total de Turmas</Text>
                </View>
              </View>

              <View style={styles.searchContainer}>
                <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar escola..."
                  placeholderTextColor="#9CA3AF"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
              </View>

              {filteredSchools.length > 0 && (
                <Text style={styles.listHeaderTitle}>Todas as Escolas</Text>
              )}
            </>
          }
        />
      )}

      {/* Edit School Modal */}
      <Modal visible={!!editingSchool} animationType="slide" transparent={true} onRequestClose={closeEditModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar Escola</Text>
                <TouchableOpacity onPress={closeEditModal} style={styles.closeButton}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {!editingSchool ? null : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nome da Escola</Text>
                    <TextInput
                      style={styles.input}
                      value={editingSchool.name}
                      onChangeText={(t) => setEditingSchool({ ...editingSchool, name: t })}
                      placeholder="Nome da escola"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Endereço</Text>
                    <TextInput
                      style={styles.input}
                      value={editingSchool.address}
                      onChangeText={(t) => setEditingSchool({ ...editingSchool, address: t })}
                      placeholder="Endereço"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Telefone</Text>
                    <TextInput
                      style={styles.input}
                      value={editingSchool.phone}
                      onChangeText={(t) => setEditingSchool({ ...editingSchool, phone: t })}
                      placeholder="Telefone"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Gestores da Escola</Text>
                    
                    {/* Selected Managers Chips */}
                    <View style={styles.selectedManagersContainer}>
                      {getSelectedManagers().length === 0 ? (
                        <Text style={styles.noManagersText}>Nenhum gestor selecionado</Text>
                      ) : (
                        getSelectedManagers().map((manager) => (
                          <View key={manager.id} style={styles.managerChip}>
                            <UserCheck size={14} color="#8B5CF6" />
                            <Text style={styles.managerChipText}>{manager.name}</Text>
                            <TouchableOpacity onPress={() => removeManager(manager.id)}>
                              <X size={16} color="#8B5CF6" />
                            </TouchableOpacity>
                          </View>
                        ))
                      )}
                    </View>

                    {/* Add Manager Button */}
                    <TouchableOpacity
                      style={styles.addManagerButton}
                      onPress={() => setShowManagerPicker(true)}
                    >
                      <Plus size={18} color="#8B5CF6" />
                      <Text style={styles.addManagerButtonText}>
                        {selectedManagerIds.length > 0 
                          ? `Gestores (${selectedManagerIds.length})`
                          : 'Adicionar Gestor'
                        }
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButton]} 
                      onPress={closeEditModal}
                    >
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.deleteButton]} 
                      onPress={() => {
                        closeEditModal();
                        handleDeleteSchool(editingSchool);
                      }}
                    >
                      <Text style={styles.deleteButtonText}>Excluir</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.saveButton]} 
                      onPress={handleEditSave} 
                      disabled={isEditSaving}
                    >
                      {isEditSaving ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveButtonText}>Salvar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Manager Picker Modal */}
      <Modal visible={showManagerPicker} animationType="fade" transparent={true} onRequestClose={() => setShowManagerPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <View>
                <Text style={styles.pickerTitle}>Selecionar Gestores</Text>
                {selectedManagerIds.length > 0 && (
                  <Text style={styles.pickerSubtitle}>
                    {selectedManagerIds.length} selecionado(s)
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowManagerPicker(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchContainer}>
              <Search size={20} color="#9CA3AF" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Buscar por nome..."
                placeholderTextColor="#9CA3AF"
                value={managerSearchTerm}
                onChangeText={setManagerSearchTerm}
              />
            </View>

            {isLoadingManagers ? (
              <ActivityIndicator style={styles.pickerLoading} color="#8B5CF6" />
            ) : (
              <ScrollView style={styles.pickerList}>
                {potentialManagers.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <UserX size={48} color="#9CA3AF" />
                    <Text style={styles.emptyStateTitle}>
                      Nenhum usuário disponível
                    </Text>
                    <Text style={styles.emptyStateText}>
                      Não há usuários cadastrados que possam ser atribuídos como gestores.
                    </Text>
                  </View>
                ) : getFilteredManagers().length === 0 ? (
                  <Text style={styles.noResultsText}>Nenhum usuário encontrado</Text>
                ) : (
                  getFilteredManagers().map((manager) => {
                    const isSelected = selectedManagerIds.includes(manager.id);
                    return (
                      <TouchableOpacity
                        key={manager.id}
                        onPress={() => toggleManagerSelection(manager.id)}
                        style={[
                          styles.pickerItem,
                          isSelected && styles.pickerItemSelected
                        ]}
                      >
                        <View style={styles.pickerItemContent}>
                          <View style={[
                            styles.checkbox,
                            isSelected && styles.checkboxSelected
                          ]}>
                            {isSelected && <View style={styles.checkboxCheck} />}
                          </View>
                          <Text style={[
                            styles.pickerItemText,
                            isSelected && styles.pickerItemTextSelected
                          ]}>
                            {manager.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.pickerDoneButton}
              onPress={() => setShowManagerPicker(false)}
            >
              <Text style={styles.pickerDoneButtonText}>Concluído</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  headerGreeting: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16, 
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  statCardYellow: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statCardBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statCardPurple: {
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#1F2937',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  cardManagers: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  settingsButton: {
    padding: 4,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  selectedManagersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    minHeight: 40,
  },
  noManagersText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  managerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  managerChipText: {
    fontSize: 14,
    color: '#5B21B6',
    fontWeight: '500',
  },
  addManagerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  addManagerButtonText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Manager Picker Modal Styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  pickerSubtitle: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
    marginTop: 4,
  },
  pickerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerSearchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
  },
  pickerLoading: {
    padding: 40,
  },
  pickerList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    paddingVertical: 40,
  },
  pickerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerItemSelected: {
    backgroundColor: '#F9FAFB',
  },
  pickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  checkboxCheck: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#374151',
  },
  pickerItemTextSelected: {
    color: '#111827',
    fontWeight: '600',
  },
  pickerDoneButton: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  pickerDoneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});