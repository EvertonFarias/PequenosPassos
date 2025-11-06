import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function StudentList() {
  const { classroomName } = useLocalSearchParams();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Lista de Alunos da Turma: {classroomName}</Text>
    </View>
  );
}