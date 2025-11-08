import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, FlatList, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../components/AppHeader';
import { Plus, Mail, Shield, ShieldCheck, UserX, UserCheck, X, Send } from 'lucide-react-native';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function ManageTeachersScreen() {
  const router = useRouter();
  const { schoolId, schoolName } = useLocalSearchParams();
  const parsedSchoolId = Array.isArray(schoolId) ? Number(schoolId[0]) : Number(schoolId);
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [invites, setInvites] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);

  useEffect(() => {
    fetchInvites();
    fetchTeachers();
  }, []);

  // Helpers to determine permissions and sorting
  const isCurrentUserManager = () => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    const me = teachers.find(t => t.id === user.id);
    if (!me) return false;
    const role = getTeacherRole(me);
    return role === 'MANAGER';
  };

  const getVisibleTeachers = () => {
    // If current user is manager or superadmin, show all fetched users.
    const showAll = isCurrentUserManager();
    const list = teachers.filter(t => {
      if (showAll) return true;
      const r = getTeacherRole(t);
      return r === 'TEACHER' || r === 'MANAGER';
    });

    // Sort so the current user (if present) is always at the top
    const sorted = list.slice().sort((a, b) => {
      if (!user) return 0;
      if (a.id === user.id) return -1;
      if (b.id === user.id) return 1;
      return 0;
    });
    return sorted;
  };

  const fetchInvites = async () => {
    if (!parsedSchoolId) return;
    try {
      setIsLoading(true);
      const resp = await api.get<any[]>(`/invites/schools/${parsedSchoolId}/invites`);
      setInvites(resp.data ?? []);
    } catch (e) {
      console.warn('Erro ao carregar convites', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeachers = async () => {
    if (!parsedSchoolId) return;
    try {
      setIsLoadingTeachers(true);
      const resp = await api.get<any[]>(`/schools/${parsedSchoolId}/teachers`);
      setTeachers(resp.data ?? []);
    } catch (e) {
      console.warn('Erro ao carregar professores', e);
    } finally {
      setIsLoadingTeachers(false);
    }
  };

  const handleOpenInviteModal = () => {
    setEmail('');
    setShowModal(true);
  };

  const handleSendInvite = async () => {
    if (!email || !parsedSchoolId) return Alert.alert('Informe um e-mail válido');
    try {
      setIsSubmitting(true);
      const resp = await api.post<any>(`/invites/schools/${parsedSchoolId}/invites`, { email, role: 'TEACHER' });
      const token = (resp.data as any)?.token;
      setShowModal(false);
      Alert.alert('Convite enviado', token ? `Token: ${token}` : 'Convite enviado com sucesso');
      await fetchInvites();
    } catch (err: any) {
      console.log('Erro ao enviar convite', err);
      Alert.alert('Erro', err?.response?.data || err?.message || 'Falha ao enviar convite');
    } finally {
      setIsSubmitting(false);
    }
  };

  // FIX: Determina role de forma consistente
  const getTeacherRole = (teacher: any) => {
    // Prioriza o campo role retornado pelo backend
    if (teacher.role === 'MANAGER') return 'MANAGER';
    
    // Fallback para schoolRoles se existir
    const schoolRoles: string[] = teacher.schoolRoles || [];
    if (schoolRoles.some((r: string) => r.includes('MANAGER') || r.includes('SCHOOL_MANAGER'))) {
      return 'MANAGER';
    }
    
    return 'TEACHER';
  };

  // Troca role entre TEACHER e MANAGER
  const handleToggleRole = async (teacher: any) => {
    if (!parsedSchoolId) return;
    const currentRole = getTeacherRole(teacher);
    const newRole = currentRole === 'MANAGER' ? 'TEACHER' : 'MANAGER';
    
    try {
      await api.patch(`/schools/${parsedSchoolId}/teachers/${teacher.id}/role`, { role: newRole });
      // Atualiza localmente o professor para refletir a mudança imediatamente
      setTeachers(prev => prev.map(t => 
        t.id === teacher.id ? { ...t, role: newRole } : t
      ));
      // Recarrega do servidor para garantir sincronização
      await fetchTeachers();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível alterar o papel do professor.');
    }
  };

  // Ativa/desativa professor
  const handleToggleActive = async (teacher: any) => {
    if (!parsedSchoolId) return;
    try {
      await api.patch(`/schools/${parsedSchoolId}/teachers/${teacher.id}/active`, { active: !teacher.active });
      await fetchTeachers();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível alterar o status do professor.');
    }
  };

  // Permite que o professor (usuário autenticado) saia da escola
  const handleLeaveSchool = async (teacher: any) => {
    if (!parsedSchoolId) return;
    if (!user || user.id !== teacher.id) return;

    Alert.alert('Confirmar', 'Tem certeza que deseja sair desta escola? Você perderá acesso às turmas desta escola.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => {
        try {
          await api.post(`/schools/${parsedSchoolId}/teachers/me/leave`);
          // Refresh list then redirect the user to school selection
          await fetchTeachers();
          router.replace('/(app)/school-selection');
        } catch (err: any) {
          console.log('Erro ao sair da escola', err);
          Alert.alert('Erro', err?.response?.data || err?.message || 'Falha ao sair da escola');
        }
      } }
    ]);
  };

  const handleCancelInvite = async (invite: any) => {
    if (!invite?.id) return;
    Alert.alert('Confirmar', 'Cancelar este convite?', [
      { text: 'Não', style: 'cancel' },
      { text: 'Sim', onPress: async () => {
        try {
          await api.post(`/invites/${invite.id}/cancel`);
          await fetchInvites();
        } catch (err: any) {
          console.log('Erro ao cancelar convite', err);
          Alert.alert('Erro', err?.response?.data || err?.message || 'Falha ao cancelar convite');
        }
      } }
    ]);
  };

  const renderTeacher = ({ item }: { item: any }) => {
    const role = getTeacherRole(item);
    const isManager = role === 'MANAGER';
    const isCurrentUser = user?.id === item.id;
    const viewerIsManager = isCurrentUserManager();
    
    return (
      <View style={[styles.card, !item.active && styles.cardInactive]}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {(item.name || item.email).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.name || 'Sem nome'}</Text>
            <Text style={styles.cardEmail}>{item.email}</Text>
          </View>
          <View style={[styles.badge, isManager ? styles.badgeManager : styles.badgeTeacher]}>
            {isManager ? (
              <ShieldCheck size={14} color="#8B5CF6" />
            ) : (
              <Shield size={14} color="#6B7280" />
            )}
            <Text style={[styles.badgeText, isManager && styles.badgeTextManager]}>
              {isManager ? 'Gestor' : 'Professor'}
            </Text>
          </View>
        </View>

        {!item.active && (
          <View style={styles.inactiveLabel}>
            <UserX size={14} color="#EF4444" />
            <Text style={styles.inactiveLabelText}>Inativo</Text>
          </View>
        )}

        <View style={styles.cardActions}>
          {isCurrentUser ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDanger]}
              onPress={() => handleLeaveSchool(item)}
            >
              <UserX size={16} color="#EF4444" />
              <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>Sair da escola</Text>
            </TouchableOpacity>
          ) : (
            // Only show manager actions to viewers who are managers. Teachers (non-managers) see no action buttons for other users.
            viewerIsManager ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={() => handleToggleRole(item)}
                >
                  {isManager ? (
                    <Shield size={16} color="#6B7280" />
                  ) : (
                    <ShieldCheck size={16} color="#8B5CF6" />
                  )}
                  <Text style={[styles.actionButtonText, !isManager && styles.actionButtonTextPrimary]}>
                    {isManager ? 'Tornar Professor' : 'Tornar Gestor'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    item.active ? styles.actionButtonDanger : styles.actionButtonSuccess
                  ]}
                  onPress={() => handleToggleActive(item)}
                >
                  {item.active ? (
                    <UserX size={16} color="#EF4444" />
                  ) : (
                    <UserCheck size={16} color="#22C55E" />
                  )}
                  <Text style={[
                    styles.actionButtonText,
                    item.active ? styles.actionButtonTextDanger : styles.actionButtonTextSuccess
                  ]}>
                    {item.active ? 'Desativar' : 'Ativar'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null
          )}
        </View>
      </View>
    );
  };

  const renderInvite = ({ item }: { item: any }) => {
    const isPending = item.status === 'PENDING';
    const expirationDate = item.expiresAt ? new Date(item.expiresAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }) : '—';

    return (
      <View style={[styles.inviteCard, !isPending && styles.inviteCardInactive]}>
        <Mail size={20} color={isPending ? '#8B5CF6' : '#9CA3AF'} />
        <View style={styles.inviteInfo}>
          <Text style={styles.inviteEmail}>{item.email}</Text>
          <View style={styles.inviteMeta}>
            <View style={[styles.statusBadge, !isPending && styles.statusBadgeCancelled]}>
              <Text style={[styles.statusBadgeText, !isPending && styles.statusBadgeTextCancelled]}>
                {item.status === 'PENDING' ? 'Pendente' : 'Cancelado'}
              </Text>
            </View>
            <Text style={styles.inviteExpiry}>Expira: {expirationDate}</Text>
          </View>
        </View>
        {isPending && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelInvite(item)}
          >
            <X size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={`Professores`} showBack />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header com botão de convite */}
          <View style={styles.pageHeader}>
            <View>
              <Text style={styles.pageTitle}>Equipe Pedagógica</Text>
              <Text style={styles.pageSubtitle}>{schoolName || 'Escola'}</Text>
            </View>
            {isCurrentUserManager() && (
              <TouchableOpacity style={styles.inviteButton} onPress={handleOpenInviteModal}>
                <Plus size={20} color="#fff" strokeWidth={2.5} />
                <Text style={styles.inviteButtonText}>Convidar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Lista de professores */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Professores Ativos ({getVisibleTeachers().filter(t => t.active).length})
            </Text>
            {isLoadingTeachers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
              </View>
            ) : getVisibleTeachers().filter(t => t.active).length === 0 ? (
              <View style={styles.emptyState}>
                <Shield size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>Nenhum professor ativo</Text>
              </View>
            ) : (
              <FlatList
                data={getVisibleTeachers().filter(t => t.active)}
                keyExtractor={(i) => String(i.id)}
                renderItem={renderTeacher}
                scrollEnabled={false}
              />
            )}
          </View>

          {/* Professores inativos */}
          {getVisibleTeachers().filter(t => !t.active).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Inativos ({getVisibleTeachers().filter(t => !t.active).length})
              </Text>
              <FlatList
                data={getVisibleTeachers().filter(t => !t.active)}
                keyExtractor={(i) => String(i.id)}
                renderItem={renderTeacher}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Convites pendentes */}
          {isCurrentUserManager() && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Convites Pendentes ({invites.filter(i => i.status === 'PENDING').length})
              </Text>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                </View>
              ) : invites.length === 0 ? (
                <View style={styles.emptyState}>
                  <Mail size={48} color="#D1D5DB" />
                  <Text style={styles.emptyStateText}>Nenhum convite pendente</Text>
                </View>
              ) : (
                <FlatList
                  data={invites}
                  keyExtractor={(i) => i.id}
                  renderItem={renderInvite}
                  scrollEnabled={false}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de convite */}
      <Modal visible={showModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Convidar Professor</Text>
                <Text style={styles.modalSubtitle}>
                  Digite o e-mail do professor que deseja convidar
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                disabled={isSubmitting}
                style={styles.modalClose}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                placeholder="professor@escola.com"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSendInvite}
                disabled={isSubmitting || !email}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Send size={18} color="#fff" />
                    <Text style={styles.modalButtonTextPrimary}>Enviar Convite</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  inviteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
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
  cardInactive: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  cardEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  badgeManager: {
    backgroundColor: '#EDE9FE',
  },
  badgeTeacher: {
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  badgeTextManager: {
    color: '#8B5CF6',
  },
  inactiveLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  inactiveLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionButtonSecondary: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  actionButtonDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionButtonSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  actionButtonTextPrimary: {
    color: '#8B5CF6',
  },
  actionButtonTextDanger: {
    color: '#EF4444',
  },
  actionButtonTextSuccess: {
    color: '#22C55E',
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  inviteCardInactive: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
  },
  inviteInfo: {
    flex: 1,
  },
  inviteEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  inviteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#EDE9FE',
  },
  statusBadgeCancelled: {
    backgroundColor: '#F3F4F6',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  statusBadgeTextCancelled: {
    color: '#6B7280',
  },
  inviteExpiry: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  cancelButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalClose: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalButtonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtonPrimary: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  modalButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});