import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    LayoutAnimation,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { Toast } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'expo-router';
import api from '@/lib/api';
import { Building2, Home, Phone, Save, User, Plus, X, Search, UserCheck, UserX } from 'lucide-react-native';

interface PotentialManagerDTO {
  id: string; 
  name: string;
}

export default function NewSchoolScreen() {
  const router = useRouter();
  const { toast, hideToast, success, error: showError, warning } = useToast();
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  
  const [managerUserIds, setManagerUserIds] = useState<string[]>([]);
  const [potentialManagers, setPotentialManagers] = useState<PotentialManagerDTO[]>([]);
  const [isLoadingManagers, setIsLoadingManagers] = useState(true);
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const [showManagerPicker, setShowManagerPicker] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        setIsLoadingManagers(true);
        const response = await api.get('/users/potential-managers');
        const managers = Array.isArray(response.data) ? (response.data as PotentialManagerDTO[]) : [];
        const validManagers = managers.filter(m => m && m.id && m.name);
        setPotentialManagers(validManagers);
        
        if (validManagers.length === 0) {
          warning('Nenhum usuário disponível para ser gestor.');
        }
      } catch (e: any) {
        console.log("Falha ao buscar gestores", e);
        setPotentialManagers([]);
        showError('Não foi possível carregar a lista de gestores.');
      } finally {
        setIsLoadingManagers(false);
      }
    };
    fetchManagers();
  }, []);

  const performSave = async () => {
    setIsLoading(true);

    try {
      const createDTO = {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        managerUserIds: managerUserIds,
      } as any;

      await api.post('/schools', createDTO);

      const managerCount = managerUserIds.length;
      const successMessage = managerCount > 0 
        ? `Escola "${name}" criada com ${managerCount} gestor(es) atribuído(s)!`
        : `Escola "${name}" criada com sucesso!`;
      
      success(successMessage);
      
      setTimeout(() => {
        router.back();
      }, 1500);

    } catch (err) {
      const e: any = err;
      console.log('Falha ao criar escola:', e?.response?.data ?? e);
      const resp = e?.response?.data;
      if (resp?.message) {
        showError(String(resp.message));
      } else if (Array.isArray(resp?.errors) && resp.errors.length > 0) {
        showError(String(resp.errors[0].defaultMessage || resp.errors[0]));
      } else if (e?.message) {
        showError(String(e.message));
      } else {
        showError('Ocorreu um erro ao salvar a escola.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (name.trim().length < 3) {
      showError('O nome da escola deve ter pelo menos 3 caracteres.');
      return;
    }
    
    // Confirmação se nenhum gestor foi selecionado
    if (managerUserIds.length === 0) {
      Alert.alert(
        'Atenção',
        'Você não selecionou nenhum gestor para esta escola. Deseja continuar mesmo assim?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Continuar', 
            onPress: performSave 
          }
        ]
      );
      return;
    }

    await performSave();
  };

  const toggleManagerSelection = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setManagerUserIds((prev) => 
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const removeManager = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setManagerUserIds((prev) => prev.filter((x) => x !== id));
  };

  const getSelectedManagers = () => {
    if (!Array.isArray(potentialManagers)) return [];
    return potentialManagers.filter((m) => m && managerUserIds.includes(m.id));
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

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AppHeader title="Nova Escola" showBack={true} />
      
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formCard}>
          <View style={styles.formIconContainer}>
            <Building2 size={32} color="#8B5CF6" />
          </View>
          <Text style={styles.formTitle}>Criar Nova Escola</Text>
          <Text style={styles.formSubtitle}>Preencha os dados para cadastrar uma nova escola no sistema</Text>

          {/* CAMPO NOME */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome da Escola *</Text>
            <View style={styles.inputContainer}>
              <Building2 size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ex: CEI Pequenos Passos"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* CAMPO ENDEREÇO */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Endereço</Text>
            <View style={styles.inputContainer}>
              <Home size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ex: Rua das Flores, 123"
                placeholderTextColor="#9CA3AF"
                value={address}
                onChangeText={setAddress}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* CAMPO TELEFONE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone</Text>
            <View style={styles.inputContainer}>
              <Phone size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="(00) 0000-0000"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                editable={!isLoading}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* GESTORES */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gestores da Escola</Text>
            <Text style={styles.helperText}>Você pode adicionar um ou mais gestores para esta escola</Text>
            
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
              disabled={isLoadingManagers}
            >
              {isLoadingManagers ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <>
                  <Plus size={18} color="#8B5CF6" />
                  <Text style={styles.addManagerButtonText}>
                    {managerUserIds.length > 0 
                      ? `Gestores (${managerUserIds.length})`
                      : 'Adicionar Gestor'
                    }
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* BOTÃO SALVAR */}
          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Save size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Criar Escola</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Manager Picker Modal */}
      <Modal visible={showManagerPicker} animationType="slide" transparent={true} onRequestClose={() => setShowManagerPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <View>
                <Text style={styles.pickerTitle}>Selecionar Gestores</Text>
                {managerUserIds.length > 0 && (
                  <Text style={styles.pickerSubtitle}>
                    {managerUserIds.length} selecionado(s)
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

            <ScrollView style={styles.pickerList}>
              {potentialManagers.length === 0 && !isLoadingManagers ? (
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
                  const isSelected = managerUserIds.includes(manager.id);
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

            <TouchableOpacity
              style={styles.pickerDoneButton}
              onPress={() => setShowManagerPicker(false)}
            >
              <Text style={styles.pickerDoneButtonText}>Concluído</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
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
    paddingVertical: 14,
    gap: 8,
  },
  addManagerButtonText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  saveButtonDisabled: {
    opacity: 0.7,
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