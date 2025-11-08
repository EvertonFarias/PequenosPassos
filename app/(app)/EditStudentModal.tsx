import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { User, Calendar, Phone, Users, Save, X } from 'lucide-react-native';
import api from '@/lib/api';

interface EditStudentModalProps {
  visible: boolean;
  student: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditStudentModal({ visible, student, onClose, onSuccess }: EditStudentModalProps) {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    birthDate: '',
    guardianName: '',
    guardianPhone: '',
  });

  useEffect(() => {
    if (student) {
      setName(student.name || '');
      setGuardianName(student.guardianName || '');
      setGuardianPhone(formatPhone(student.guardianPhone || ''));
      // Converte data ISO para DD/MM/YYYY
      if (student.birthDate) {
        const [year, month, day] = student.birthDate.split('-');
        setBirthDate(`${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`);
      } else {
        setBirthDate('');
      }
    }
  }, [student]);

  const formatPhone = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    const limited = numbers.slice(0, 11);
    if (limited.length <= 2) return limited;
    if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    if (limited.length <= 10) return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };

  const formatDate = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    const limited = numbers.slice(0, 8);
    if (limited.length <= 2) return limited;
    if (limited.length <= 4) return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
  };

  const validateForm = (): boolean => {
    const newErrors = {
      name: '',
      birthDate: '',
      guardianName: '',
      guardianPhone: '',
    };
    let isValid = true;
    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
      isValid = false;
    } else if (name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
      isValid = false;
    } else if (name.trim().length > 100) {
      newErrors.name = 'Nome deve ter no máximo 100 caracteres';
      isValid = false;
    }
    const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!birthDate.trim()) {
      newErrors.birthDate = 'Data de nascimento é obrigatória';
      isValid = false;
    } else if (!datePattern.test(birthDate)) {
      newErrors.birthDate = 'Data inválida (use DD/MM/AAAA)';
      isValid = false;
    } else {
      const [day, month, year] = birthDate.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      if (
        date.getDate() !== day ||
        date.getMonth() !== month - 1 ||
        date.getFullYear() !== year ||
        year < 1900 ||
        year > new Date().getFullYear()
      ) {
        newErrors.birthDate = 'Data inválida';
        isValid = false;
      }
    }
    if (guardianName.trim() && guardianName.trim().length < 3) {
      newErrors.guardianName = 'Nome do responsável deve ter pelo menos 3 caracteres';
      isValid = false;
    } else if (guardianName.trim().length > 100) {
      newErrors.guardianName = 'Nome do responsável deve ter no máximo 100 caracteres';
      isValid = false;
    }
    const phoneNumbers = guardianPhone.replace(/\D/g, '');
    if (guardianPhone.trim() && (phoneNumbers.length < 10 || phoneNumbers.length > 11)) {
      newErrors.guardianPhone = 'Telefone deve ter 10 ou 11 dígitos';
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm() || !student) {
      Alert.alert('Erro de Validação', 'Por favor, corrija os erros no formulário.');
      return;
    }
    setIsSaving(true);
    try {
      const [day, month, year] = birthDate.split('/');
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const payload = {
        name: name.trim(),
        birthDate: isoDate,
        guardianName: guardianName.trim() || null,
        guardianPhone: guardianPhone.replace(/\D/g, '') || null,
      };
      await api.put(`/students/${student.id}`, payload);
      Alert.alert('Sucesso!', 'Dados do aluno atualizados com sucesso.', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (error: any) {
      console.log('Erro ao editar aluno:', error);
      const message = error.response?.data?.message || 'Erro ao editar aluno. Tente novamente.';
      Alert.alert('Erro', message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.content}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Editar Aluno</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={modalStyles.scrollContent}>
            {/* Nome do Aluno */}
            <View style={modalStyles.inputGroup}>
              <View style={modalStyles.labelRow}>
                <User size={16} color="#8B5CF6" />
                <Text style={modalStyles.label}>Nome do Aluno *</Text>
              </View>
              <TextInput
                style={[modalStyles.input, errors.name && modalStyles.inputError]}
                placeholder="Digite o nome completo"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                maxLength={100}
                autoCapitalize="words"
              />
              {errors.name ? <Text style={modalStyles.errorText}>{errors.name}</Text> : null}
              <Text style={modalStyles.helperText}>{name.length}/100 caracteres</Text>
            </View>
            {/* Data de Nascimento */}
            <View style={modalStyles.inputGroup}>
              <View style={modalStyles.labelRow}>
                <Calendar size={16} color="#8B5CF6" />
                <Text style={modalStyles.label}>Data de Nascimento *</Text>
              </View>
              <TextInput
                style={[modalStyles.input, errors.birthDate && modalStyles.inputError]}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#9CA3AF"
                value={birthDate}
                onChangeText={(text) => {
                  setBirthDate(formatDate(text));
                  if (errors.birthDate) setErrors({ ...errors, birthDate: '' });
                }}
                keyboardType="numeric"
                maxLength={10}
              />
              {errors.birthDate ? <Text style={modalStyles.errorText}>{errors.birthDate}</Text> : null}
            </View>
            {/* Nome do Responsável */}
            <View style={modalStyles.inputGroup}>
              <View style={modalStyles.labelRow}>
                <Users size={16} color="#6B7280" />
                <Text style={modalStyles.label}>Nome do Responsável</Text>
                <Text style={modalStyles.optionalBadge}>Opcional</Text>
              </View>
              <TextInput
                style={[modalStyles.input, errors.guardianName && modalStyles.inputError]}
                placeholder="Digite o nome do responsável"
                placeholderTextColor="#9CA3AF"
                value={guardianName}
                onChangeText={(text) => {
                  setGuardianName(text);
                  if (errors.guardianName) setErrors({ ...errors, guardianName: '' });
                }}
                maxLength={100}
                autoCapitalize="words"
              />
              {errors.guardianName ? <Text style={modalStyles.errorText}>{errors.guardianName}</Text> : null}
            </View>
            {/* Telefone do Responsável */}
            <View style={modalStyles.inputGroup}>
              <View style={modalStyles.labelRow}>
                <Phone size={16} color="#6B7280" />
                <Text style={modalStyles.label}>Telefone do Responsável</Text>
                <Text style={modalStyles.optionalBadge}>Opcional</Text>
              </View>
              <TextInput
                style={[modalStyles.input, errors.guardianPhone && modalStyles.inputError]}
                placeholder="(00) 00000-0000"
                placeholderTextColor="#9CA3AF"
                value={guardianPhone}
                onChangeText={(text) => {
                  setGuardianPhone(formatPhone(text));
                  if (errors.guardianPhone) setErrors({ ...errors, guardianPhone: '' });
                }}
                keyboardType="phone-pad"
                maxLength={15}
              />
              {errors.guardianPhone ? <Text style={modalStyles.errorText}>{errors.guardianPhone}</Text> : null}
            </View>
            <View style={modalStyles.requiredNote}>
              <Text style={modalStyles.requiredNoteText}>* Campos obrigatórios</Text>
            </View>
          </ScrollView>
          <View style={modalStyles.footer}>
            <TouchableOpacity
              style={[modalStyles.saveButton, isSaving && modalStyles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Save size={20} color="#FFFFFF" />
                  <Text style={modalStyles.saveButtonText}>Salvar Alterações</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  optionalBadge: {
    fontSize: 11,
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1F2937',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
  },
  requiredNote: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  requiredNoteText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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