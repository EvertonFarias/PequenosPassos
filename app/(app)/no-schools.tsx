import { AppHeader } from '@/components/AppHeader';
import { View, Text } from 'react-native';

export default function NoSchools() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <AppHeader title="Painel" /> 
      
      <Text>Você não está em nenhuma escola.</Text>
      <Text>Contate o administrador.</Text>
    </View>
  );
}