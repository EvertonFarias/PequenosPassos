import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../components/AppHeader';
import { BarChart3, TrendingUp, Award, TrendingDown, Minus } from 'lucide-react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Componente de Gráfico de Barras Horizontal
const HorizontalBarChart = ({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue: number }) => {
  const BAR_CHART_WIDTH = SCREEN_WIDTH - 120; // Largura disponível para as barras
  
  return (
    <View style={chartStyles.container}>
      {data.map((item, index) => {
        const barWidth = (item.value / maxValue) * BAR_CHART_WIDTH;
        
        return (
          <View key={index} style={chartStyles.barRow}>
            <Text style={chartStyles.barLabel} numberOfLines={1} ellipsizeMode="tail">
              {item.label}
            </Text>
            <View style={chartStyles.barContainer}>
              <View style={chartStyles.barTrack}>
                <View 
                  style={[
                    chartStyles.bar, 
                    { 
                      width: barWidth,
                      backgroundColor: item.color 
                    }
                  ]} 
                />
              </View>
              <Text style={chartStyles.barValue}>{item.value.toFixed(1)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// Componente de Gráfico de Linha (Evolução Temporal)
const LineChart = ({ data, label }: { data: { date: string; value: number }[]; label: string }) => {
  if (!data || data.length === 0) return null;

  // Configurações do gráfico
  const CHART_PADDING = 20; // Padding interno para evitar cortes
  const POINT_RADIUS = 5;
  const availableWidth = SCREEN_WIDTH - 72; // Largura disponível (descontando margens do card)
  const chartWidth = availableWidth - (CHART_PADDING * 2); // Largura útil do gráfico
  const chartHeight = 100;
  
  const maxValue = Math.max(...data.map(d => d.value), 5);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;
  
  // Espaçamento entre pontos (com margem para não cortar nos extremos)
  const pointSpacing = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  return (
    <View style={chartStyles.lineChartContainer}>
      <Text style={chartStyles.lineChartTitle}>{label}</Text>
      <View style={chartStyles.lineChart}>
        {/* Container do gráfico com padding */}
        <View style={[chartStyles.lineContainer, { paddingHorizontal: CHART_PADDING }]}>
          {/* Linhas de grade */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
            <View 
              key={`grid-${i}`}
              style={[
                chartStyles.gridLine, 
                { 
                  top: 30 + (chartHeight * fraction),
                  left: CHART_PADDING,
                  right: CHART_PADDING,
                }
              ]} 
            />
          ))}
          
          {/* Linhas conectando os pontos */}
          <View style={{ position: 'relative', height: chartHeight, marginTop: 30 }}>
            {data.map((point, index) => {
              if (index === data.length - 1) return null;
              
              const x1 = index * pointSpacing;
              const y1 = chartHeight - ((point.value - minValue) / range) * chartHeight;
              const nextPoint = data[index + 1];
              const x2 = (index + 1) * pointSpacing;
              const y2 = chartHeight - ((nextPoint.value - minValue) / range) * chartHeight;
              
              const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
              const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
              
              return (
                <View
                  key={`line-${index}`}
                  style={[
                    chartStyles.line,
                    {
                      width: length,
                      left: x1,
                      top: y1,
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                />
              );
            })}
            
            {/* Pontos com valores */}
            {data.map((point, index) => {
              const x = index * pointSpacing;
              const y = chartHeight - ((point.value - minValue) / range) * chartHeight;
              
              return (
                <View key={`point-${index}`}>
                  {/* Valor acima do ponto */}
                  <Text 
                    style={[
                      chartStyles.pointValue,
                      { 
                        left: x - 15,
                        top: y - 25,
                        width: 30,
                      }
                    ]}
                  >
                    {point.value.toFixed(1)}
                  </Text>
                  {/* Ponto */}
                  <View
                    style={[
                      chartStyles.point,
                      { 
                        left: x - POINT_RADIUS,
                        top: y - POINT_RADIUS,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </View>
        
        {/* Eixo X com datas */}
        <View style={[chartStyles.xAxis, { paddingHorizontal: CHART_PADDING }]}>
          {data.map((point, index) => {
            const x = index * pointSpacing;
            return (
              <Text 
                key={`date-${index}`}
                style={[
                  chartStyles.xAxisLabel,
                  { 
                    position: 'absolute',
                    left: CHART_PADDING + x - 20,
                    width: 40,
                  }
                ]}
              >
                {new Date(point.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </Text>
            );
          })}
        </View>
      </View>
    </View>
  );
};

// Componente de Indicador de Progresso
const ProgressIndicator = ({ value, label }: { value: number; label: string }) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  return (
    <View style={chartStyles.progressIndicator}>
      <View style={[
        chartStyles.progressIcon,
        isPositive ? chartStyles.progressIconPositive : 
        isNeutral ? chartStyles.progressIconNeutral : 
        chartStyles.progressIconNegative
      ]}>
        {isPositive ? <TrendingUp size={20} color="#FFFFFF" /> :
         isNeutral ? <Minus size={20} color="#FFFFFF" /> :
         <TrendingDown size={20} color="#FFFFFF" />}
      </View>
      <View style={chartStyles.progressContent}>
        <Text style={chartStyles.progressLabel}>{label}</Text>
        <Text style={[
          chartStyles.progressValue,
          isPositive ? chartStyles.progressValuePositive :
          isNeutral ? chartStyles.progressValueNeutral :
          chartStyles.progressValueNegative
        ]}>
          {isPositive ? '+' : ''}{value.toFixed(1)}%
        </Text>
      </View>
    </View>
  );
};

export default function ReportViewScreen() {
  const { reportData, reportType } = useLocalSearchParams();

  const data = reportData ? JSON.parse(Array.isArray(reportData) ? reportData[0] : reportData) : null;
  const type = Array.isArray(reportType) ? reportType[0] : reportType;

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <AppHeader title="Relatório" showBack />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Dados do relatório não encontrados</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderStudentReport = () => {
    return (
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BarChart3 size={24} color="#8B5CF6" />
            <Text style={styles.cardTitle}>Relatório Individual</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Aluno:</Text>
            <Text style={styles.value}>{data.studentName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Turma:</Text>
            <Text style={styles.value}>{data.classroomName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Período:</Text>
            <Text style={styles.value}>{data.startDate} até {data.endDate}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={24} color="#059669" />
            <Text style={styles.cardTitle}>Estatísticas Gerais</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.totalAssessments}</Text>
              <Text style={styles.statLabel}>Avaliações</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.overallAverage?.toFixed(2) || 'N/A'}</Text>
              <Text style={styles.statLabel}>Média Geral</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={[
                styles.statValue,
                { color: (data.overallProgress || 0) >= 0 ? '#059669' : '#DC2626' }
              ]}>
                {data.overallProgress >= 0 ? '+' : ''}{data.overallProgress?.toFixed(1) || '0'}%
              </Text>
              <Text style={styles.statLabel}>Progresso</Text>
            </View>
          </View>
        </View>

        {/* Progresso Geral */}
        {data.overallProgress !== undefined && data.overallProgress !== null && (
          <View style={styles.card}>
            <ProgressIndicator 
              value={data.overallProgress} 
              label="Progresso Geral no Período"
            />
          </View>
        )}

        {/* Gráfico de Barras - Comparação de Métricas */}
        {data.metrics && data.metrics.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <BarChart3 size={24} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Desempenho por Métrica</Text>
            </View>
            
            <HorizontalBarChart 
              data={data.metrics.map((m: any) => ({
                label: m.metricLabel,
                value: m.average || 0,
                color: m.average >= 4 ? '#059669' : m.average >= 3 ? '#F59E0B' : '#EF4444'
              }))}
              maxValue={5}
            />
          </View>
        )}

        {/* Gráficos de Evolução Temporal por Métrica */}
        {data.metrics && data.metrics.length > 0 && data.metrics.some((m: any) => m.evolutionData && m.evolutionData.length > 0) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <TrendingUp size={24} color="#059669" />
              <Text style={styles.cardTitle}>Evolução Temporal</Text>
            </View>
            
            {data.metrics.map((metric: any, index: number) => {
              if (!metric.evolutionData || metric.evolutionData.length === 0) return null;
              
              return (
                <LineChart
                  key={index}
                  data={metric.evolutionData.map((d: any) => ({
                    date: d.date,
                    value: d.value
                  }))}
                  label={metric.metricLabel}
                />
              );
            })}
          </View>
        )}

        {/* Detalhes das Métricas */}
        {data.metrics && data.metrics.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Award size={24} color="#D97706" />
              <Text style={styles.cardTitle}>Detalhes das Métricas</Text>
            </View>
            
            {data.metrics.map((metric: any, index: number) => (
              <View key={index} style={styles.metricCard}>
                <Text style={styles.metricName}>{metric.metricLabel}</Text>
                <View style={styles.metricStats}>
                  <View style={styles.metricStatItem}>
                    <Text style={styles.metricStatLabel}>Média</Text>
                    <Text style={styles.metricStatValue}>{metric.average?.toFixed(2)}</Text>
                  </View>
                  <View style={styles.metricStatItem}>
                    <Text style={styles.metricStatLabel}>Mín</Text>
                    <Text style={styles.metricStatValue}>{metric.minimum}</Text>
                  </View>
                  <View style={styles.metricStatItem}>
                    <Text style={styles.metricStatLabel}>Máx</Text>
                    <Text style={styles.metricStatValue}>{metric.maximum}</Text>
                  </View>
                  <View style={styles.metricStatItem}>
                    <Text style={styles.metricStatLabel}>Avaliações</Text>
                    <Text style={styles.metricStatValue}>{metric.totalAssessments}</Text>
                  </View>
                </View>
                {metric.progressPercentage !== undefined && metric.progressPercentage !== null && (
                  <View style={{ marginTop: 12 }}>
                    <ProgressIndicator 
                      value={metric.progressPercentage} 
                      label="Evolução"
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderClassroomReport = () => {
    return (
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BarChart3 size={24} color="#8B5CF6" />
            <Text style={styles.cardTitle}>Relatório da Turma</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Turma:</Text>
            <Text style={styles.value}>{data.classroomName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Período:</Text>
            <Text style={styles.value}>{data.startDate} até {data.endDate}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={24} color="#059669" />
            <Text style={styles.cardTitle}>Estatísticas da Turma</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.totalStudents}</Text>
              <Text style={styles.statLabel}>Alunos</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.totalAssessments}</Text>
              <Text style={styles.statLabel}>Avaliações</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.classroomAverage?.toFixed(2) || 'N/A'}</Text>
              <Text style={styles.statLabel}>Média da Turma</Text>
            </View>
          </View>
        </View>

        {/* Gráfico de Barras - Ranking Visual */}
        {data.studentRanking && data.studentRanking.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <BarChart3 size={24} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Desempenho dos Alunos</Text>
            </View>
            
            <HorizontalBarChart 
              data={data.studentRanking.slice(0, 10).map((s: any) => ({
                label: s.studentName,
                value: s.average || 0,
                color: s.position === 1 ? '#FCD34D' : 
                       s.position === 2 ? '#D1D5DB' : 
                       s.position === 3 ? '#FCA5A5' : '#8B5CF6'
              }))}
              maxValue={5}
            />
            
            {data.studentRanking.length > 10 && (
              <Text style={styles.infoText}>
                Mostrando top 10 de {data.studentRanking.length} alunos
              </Text>
            )}
          </View>
        )}

        {/* Ranking Detalhado */}
        {data.studentRanking && data.studentRanking.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Award size={24} color="#D97706" />
              <Text style={styles.cardTitle}>Ranking Completo</Text>
            </View>
            
            {data.studentRanking.map((student: any, index: number) => (
              <View key={index} style={styles.rankingItem}>
                <View style={[
                  styles.rankingPosition,
                  index === 0 && styles.rankingPositionGold,
                  index === 1 && styles.rankingPositionSilver,
                  index === 2 && styles.rankingPositionBronze,
                ]}>
                  <Text style={styles.rankingPositionText}>{student.position}º</Text>
                </View>
                <Text style={styles.rankingName}>{student.studentName}</Text>
                <Text style={styles.rankingAverage}>{student.average?.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderComparisonReport = () => {
    return (
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BarChart3 size={24} color="#8B5CF6" />
            <Text style={styles.cardTitle}>Comparação de Turmas</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Período:</Text>
            <Text style={styles.value}>{data.startDate} até {data.endDate}</Text>
          </View>
        </View>

        {/* Gráfico de Comparação Visual */}
        {data.classrooms && data.classrooms.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <BarChart3 size={24} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Comparação de Médias</Text>
            </View>
            
            <HorizontalBarChart 
              data={data.classrooms.map((c: any, idx: number) => ({
                label: c.classroomName,
                value: c.average || 0,
                color: ['#8B5CF6', '#059669', '#F59E0B', '#EF4444', '#3B82F6'][idx % 5]
              }))}
              maxValue={5}
            />
          </View>
        )}

        {/* Detalhes por Turma */}
        {data.classrooms && data.classrooms.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <TrendingUp size={24} color="#059669" />
              <Text style={styles.cardTitle}>Detalhes por Turma</Text>
            </View>
            
            {data.classrooms.map((classroom: any, index: number) => (
              <View key={index} style={styles.comparisonItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={[
                    styles.rankingPosition,
                    { backgroundColor: ['#8B5CF6', '#059669', '#F59E0B'][index % 3] }
                  ]}>
                    <Text style={[styles.rankingPositionText, { color: '#FFFFFF' }]}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.comparisonName, { flex: 1, marginLeft: 12, marginBottom: 0 }]}>
                    {classroom.classroomName}
                  </Text>
                </View>
                <View style={styles.comparisonStats}>
                  <View style={styles.comparisonStatItem}>
                    <Text style={styles.comparisonStatLabel}>Média</Text>
                    <Text style={[styles.comparisonStatValue, { color: '#8B5CF6' }]}>
                      {classroom.average?.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.comparisonStatItem}>
                    <Text style={styles.comparisonStatLabel}>Alunos</Text>
                    <Text style={styles.comparisonStatValue}>{classroom.totalStudents}</Text>
                  </View>
                  <View style={styles.comparisonStatItem}>
                    <Text style={styles.comparisonStatLabel}>Avaliações</Text>
                    <Text style={styles.comparisonStatValue}>{classroom.totalAssessments}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader title="Visualizar Relatório" showBack />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {type === 'STUDENT' && renderStudentReport()}
        {type === 'CLASSROOM' && renderClassroomReport()}
        {type === 'CLASSROOM_COMPARISON' && renderComparisonReport()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
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
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  metricCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  metricName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  metricStats: {
    flexDirection: 'row',
    gap: 12,
  },
  metricStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  metricStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  rankingPosition: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankingPositionGold: {
    backgroundColor: '#FCD34D',
  },
  rankingPositionSilver: {
    backgroundColor: '#D1D5DB',
  },
  rankingPositionBronze: {
    backgroundColor: '#FCA5A5',
  },
  rankingPositionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  rankingName: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
  },
  rankingAverage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  comparisonItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  comparisonName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  comparisonStats: {
    flexDirection: 'row',
    gap: 12,
  },
  comparisonStatItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
  },
  comparisonStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  comparisonStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
});

const chartStyles = StyleSheet.create({
  // Gráfico de Barras Horizontal
  container: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  barRow: {
    marginBottom: 16,
    width: '100%',
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    maxWidth: '100%',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  barTrack: {
    flex: 1,
    height: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bar: {
    height: 32,
    borderRadius: 8,
    minWidth: 4,
  },
  barValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    width: 45,
    textAlign: 'right',
  },
  
  // Gráfico de Linha
  lineChartContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  lineChartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  lineChart: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  lineContainer: {
    position: 'relative',
    width: '100%',
  },
  line: {
    position: 'absolute',
    height: 2.5,
    backgroundColor: '#8B5CF6',
    borderRadius: 1.5,
  },
  point: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  pointValue: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  xAxis: {
    position: 'relative',
    height: 24,
    marginTop: 8,
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  
  // Indicador de Progresso
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  progressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressIconPositive: {
    backgroundColor: '#059669',
  },
  progressIconNeutral: {
    backgroundColor: '#6B7280',
  },
  progressIconNegative: {
    backgroundColor: '#DC2626',
  },
  progressContent: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressValuePositive: {
    color: '#059669',
  },
  progressValueNeutral: {
    color: '#6B7280',
  },
  progressValueNegative: {
    color: '#DC2626',
  },
});
