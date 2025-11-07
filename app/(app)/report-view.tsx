import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AppHeader } from '../../components/AppHeader';
import { BarChart3, TrendingUp, Award, TrendingDown, Minus, Download } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Função para formatar data no padrão brasileiro
const formatDateBR = (dateString: string) => {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

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
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={[
            chartStyles.progressValue,
            isPositive ? chartStyles.progressValuePositive :
            isNeutral ? chartStyles.progressValueNeutral :
            chartStyles.progressValueNegative
          ]}>
            {isPositive ? '+' : ''}{value.toFixed(1)}%
          </Text>
          <Text style={chartStyles.progressLabel}>{label}</Text>
        </View>
      </View>
    </View>
  );
};

export default function ReportViewScreen() {
  const { reportData, reportType } = useLocalSearchParams();

  const data = reportData ? JSON.parse(Array.isArray(reportData) ? reportData[0] : reportData) : null;
  const type = Array.isArray(reportType) ? reportType[0] : reportType;

  const generatePDF = async () => {
    try {
      const reportTitle = type === 'STUDENT' 
        ? `Relatório Individual - ${data.studentName}`
        : type === 'CLASSROOM'
        ? `Relatório da Turma - ${data.classroomName}`
        : type === 'STUDENT_CLASSROOM_COMPARISON'
        ? `Comparação do Aluno ${data.studentName} em Turmas`
        : 'Relatório de Comparação entre Turmas';

      // Gerar gráficos de evolução temporal em SVG
      const generateEvolutionChart = (evolutionData: any[], metricLabel: string) => {
        if (!evolutionData || evolutionData.length === 0) return '';
        
        const width = 500;
        const height = 200;
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        const maxValue = 5;
        const minValue = 0;
        const pointSpacing = chartWidth / (evolutionData.length - 1);
        
        const points = evolutionData.map((point, index) => {
          const x = padding + index * pointSpacing;
          const y = padding + chartHeight - ((point.value - minValue) / (maxValue - minValue)) * chartHeight;
          return { x, y, value: point.value, date: point.date };
        });
        
        const pathData = points.map((p, i) => 
          i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
        ).join(' ');
        
        return `
          <div style="margin: 20px 0;">
            <div style="font-weight: 600; margin-bottom: 10px;">${metricLabel}</div>
            <svg width="${width}" height="${height}" style="background: #F9FAFB; border-radius: 8px;">
              <!-- Grid lines -->
              ${[0, 1, 2, 3, 4, 5].map(i => {
                const y = padding + chartHeight - (i / 5) * chartHeight;
                return `
                  <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" 
                        stroke="#E5E7EB" stroke-width="1"/>
                  <text x="${padding - 10}" y="${y + 5}" fill="#6B7280" font-size="12" text-anchor="end">${i}</text>
                `;
              }).join('')}
              
              <!-- Line -->
              <path d="${pathData}" fill="none" stroke="#8B5CF6" stroke-width="3"/>
              
              <!-- Points -->
              ${points.map(p => `
                <circle cx="${p.x}" cy="${p.y}" r="5" fill="#8B5CF6"/>
                <text x="${p.x}" y="${p.y - 15}" fill="#8B5CF6" font-size="12" font-weight="600" text-anchor="middle">
                  ${p.value.toFixed(1)}
                </text>
              `).join('')}
              
              <!-- Dates -->
              ${points.map((p, i) => {
                const date = new Date(p.date);
                const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                return `
                  <text x="${p.x}" y="${height - 10}" fill="#6B7280" font-size="10" text-anchor="middle">
                    ${dateStr}
                  </text>
                `;
              }).join('')}
            </svg>
          </div>
        `;
      };

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              padding: 20px;
              color: #1F2937;
            }
            h1 {
              color: #8B5CF6;
              font-size: 24px;
              margin-bottom: 20px;
              border-bottom: 2px solid #8B5CF6;
              padding-bottom: 10px;
            }
            .info-section {
              background: #F9FAFB;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .info-row {
              margin: 8px 0;
              display: flex;
            }
            .label {
              font-weight: 600;
              color: #6B7280;
              width: 100px;
            }
            .value {
              color: #1F2937;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin: 20px 0;
            }
            .stat-box {
              background: #F9FAFB;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
            }
            .stat-value {
              font-size: 24px;
              font-weight: 700;
              color: #8B5CF6;
              margin-bottom: 5px;
            }
            .stat-label {
              font-size: 12px;
              color: #6B7280;
            }
            .metric-section {
              margin: 20px 0;
            }
            .metric-card {
              background: #F9FAFB;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 15px;
            }
            .metric-name {
              font-size: 16px;
              font-weight: 600;
              color: #1F2937;
              margin-bottom: 10px;
            }
            .metric-stats {
              display: flex;
              gap: 20px;
            }
            .metric-stat-item {
              flex: 1;
            }
            .metric-stat-label {
              font-size: 11px;
              color: #6B7280;
              margin-bottom: 4px;
            }
            .metric-stat-value {
              font-size: 14px;
              font-weight: 600;
              color: #8B5CF6;
            }
            .section-title {
              font-size: 18px;
              font-weight: 600;
              color: #1F2937;
              margin: 20px 0 10px 0;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .positive { color: #059669; }
            .negative { color: #DC2626; }
            
            /* Gráfico de Barras Horizontal */
            .bar-chart {
              margin: 15px 0;
            }
            .bar-row {
              display: flex;
              align-items: center;
              margin: 8px 0;
              gap: 10px;
            }
            .bar-label {
              width: 120px;
              font-size: 12px;
              color: #6B7280;
              font-weight: 500;
            }
            .bar-track {
              flex: 1;
              height: 32px;
              background: #F3F4F6;
              border-radius: 6px;
              overflow: hidden;
              position: relative;
            }
            .bar-fill {
              height: 100%;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: flex-end;
              padding-right: 8px;
              color: white;
              font-weight: 600;
              font-size: 12px;
            }
            .bar-value {
              width: 45px;
              text-align: right;
              font-weight: 600;
              color: #1F2937;
              font-size: 12px;
            }
            
            /* Indicador de Progresso */
            .progress-indicator {
              background: #F9FAFB;
              padding: 12px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              gap: 12px;
              margin: 15px 0;
            }
            .progress-icon {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              font-weight: 700;
              color: white;
            }
            .progress-icon.positive { background: #059669; }
            .progress-icon.negative { background: #DC2626; }
            .progress-icon.neutral { background: #6B7280; }
            .progress-content {
              flex: 1;
            }
            .progress-value {
              font-size: 20px;
              font-weight: 700;
            }
            .progress-label {
              font-size: 13px;
              color: #6B7280;
              margin-left: 8px;
            }
          </style>
        </head>
        <body>
          <h1>${reportTitle}</h1>
          
          <div class="info-section">
            ${type === 'STUDENT' ? `
              <div class="info-row">
                <span class="label">Aluno:</span>
                <span class="value">${data.studentName}</span>
              </div>
              <div class="info-row">
                <span class="label">Turma:</span>
                <span class="value">${data.classroomName}</span>
              </div>
            ` : type === 'CLASSROOM' ? `
              <div class="info-row">
                <span class="label">Turma:</span>
                <span class="value">${data.classroomName}</span>
              </div>
            ` : ''}
            <div class="info-row">
              <span class="label">Período:</span>
              <span class="value">${formatDateBR(data.startDate)} até ${formatDateBR(data.endDate)}</span>
            </div>
          </div>

          <div class="section-title">Estatísticas Gerais</div>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-value">${type === 'CLASSROOM' ? data.totalStudents : data.totalAssessments}</div>
              <div class="stat-label">${type === 'CLASSROOM' ? 'Alunos' : 'Avaliações'}</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${data.overallAverage?.toFixed(2) || 'N/A'}</div>
              <div class="stat-label">Média Geral</div>
            </div>
            <div class="stat-box">
              <div class="stat-value ${(data.overallProgress || 0) >= 0 ? 'positive' : 'negative'}">
                ${data.overallProgress >= 0 ? '+' : ''}${data.overallProgress?.toFixed(1) || '0'}%
              </div>
              <div class="stat-label">Progresso</div>
            </div>
          </div>

          ${data.overallProgress !== undefined && data.overallProgress !== null ? `
            <div class="progress-indicator">
              <div class="progress-icon ${data.overallProgress > 0 ? 'positive' : data.overallProgress < 0 ? 'negative' : 'neutral'}">
                ${data.overallProgress > 0 ? '↑' : data.overallProgress < 0 ? '↓' : '−'}
              </div>
              <div class="progress-content">
                <span class="progress-value ${data.overallProgress >= 0 ? 'positive' : 'negative'}">
                  ${data.overallProgress >= 0 ? '+' : ''}${data.overallProgress.toFixed(1)}%
                </span>
                <span class="progress-label">Progresso Geral no Período</span>
              </div>
            </div>
          ` : ''}

          ${data.metrics && data.metrics.length > 0 ? `
            <div class="section-title">📊 Desempenho por Métrica</div>
            <div class="bar-chart">
              ${data.metrics.map((metric: any) => {
                const average = metric.average || 0;
                const percentage = (average / 5) * 100;
                const color = average >= 4 ? '#059669' : average >= 3 ? '#F59E0B' : '#EF4444';
                return `
                  <div class="bar-row">
                    <div class="bar-label">${metric.metricLabel}</div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${percentage}%; background-color: ${color};">
                        ${average >= 1 ? average.toFixed(1) : ''}
                      </div>
                    </div>
                    <div class="bar-value">${average.toFixed(1)}</div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

          ${data.metrics && data.metrics.some((m: any) => m.evolutionData && m.evolutionData.length > 0) ? `
            <div class="section-title">📈 Evolução Temporal</div>
            ${data.metrics.filter((m: any) => m.evolutionData && m.evolutionData.length > 0)
              .map((metric: any) => generateEvolutionChart(metric.evolutionData, metric.metricLabel))
              .join('')}
          ` : ''}

          ${data.metrics && data.metrics.length > 0 ? `
            <div class="section-title">📋 Detalhes das Métricas</div>
            <div class="metric-section">
              ${data.metrics.map((metric: any) => `
                <div class="metric-card">
                  <div class="metric-name">${metric.metricLabel}</div>
                  <div class="metric-stats">
                    <div class="metric-stat-item">
                      <div class="metric-stat-label">Média</div>
                      <div class="metric-stat-value">${metric.average?.toFixed(2)}</div>
                    </div>
                    <div class="metric-stat-item">
                      <div class="metric-stat-label">Mín</div>
                      <div class="metric-stat-value">${metric.minimum}</div>
                    </div>
                    <div class="metric-stat-item">
                      <div class="metric-stat-label">Máx</div>
                      <div class="metric-stat-value">${metric.maximum}</div>
                    </div>
                    <div class="metric-stat-item">
                      <div class="metric-stat-label">Avaliações</div>
                      <div class="metric-stat-value">${metric.totalAssessments}</div>
                    </div>
                    ${metric.progressPercentage !== undefined && metric.progressPercentage !== null ? `
                      <div class="metric-stat-item">
                        <div class="metric-stat-label">Evolução</div>
                        <div class="metric-stat-value ${metric.progressPercentage >= 0 ? 'positive' : 'negative'}">
                          ${metric.progressPercentage >= 0 ? '↑' : '↓'} ${metric.progressPercentage >= 0 ? '+' : ''}${metric.progressPercentage.toFixed(1)}%
                        </div>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${type === 'CLASSROOM' && data.studentRanking && data.studentRanking.length > 0 ? `
            <div class="section-title">🏆 Ranking de Alunos</div>
            <div class="bar-chart">
              ${data.studentRanking.map((student: any, index: number) => {
                const average = student.average || 0;
                const percentage = (average / 5) * 100;
                const color = index === 0 ? '#D97706' : index === 1 ? '#A8A29E' : index === 2 ? '#CD7F32' : '#8B5CF6';
                return `
                  <div class="bar-row">
                    <div class="bar-label" style="display: flex; align-items: center; gap: 5px;">
                      <span style="color: ${color}; font-weight: 700;">${student.position}º</span>
                      <span style="font-size: 11px;">${student.studentName}</span>
                    </div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${percentage}%; background-color: ${color};">
                        ${average >= 1 ? average.toFixed(1) : ''}
                      </div>
                    </div>
                    <div class="bar-value">${average.toFixed(2)}</div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

          ${type === 'CLASSROOM_COMPARISON' && data.classrooms && data.classrooms.length > 0 ? `
            <div class="section-title">📊 Comparação de Médias entre Turmas</div>
            <div class="bar-chart">
              ${data.classrooms.map((classroom: any, index: number) => {
                const average = classroom.average || 0;
                const percentage = (average / 5) * 100;
                const colors = ['#8B5CF6', '#059669', '#F59E0B', '#EF4444', '#3B82F6'];
                const color = colors[index % colors.length];
                return `
                  <div class="bar-row">
                    <div class="bar-label">${classroom.classroomName}</div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${percentage}%; background-color: ${color};">
                        ${average >= 1 ? average.toFixed(1) : ''}
                      </div>
                    </div>
                    <div class="bar-value">${average.toFixed(2)}</div>
                  </div>
                `;
              }).join('')}
            </div>
            
            <div class="section-title">📋 Detalhes por Turma</div>
            <div class="metric-section">
              ${data.classrooms.map((classroom: any, index: number) => `
                <div class="metric-card">
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <span style="font-weight: 700; color: ${['#8B5CF6', '#059669', '#F59E0B'][index % 3]}; font-size: 18px;">
                      ${index + 1}º
                    </span>
                    <span style="font-weight: 600;">${classroom.classroomName}</span>
                  </div>
                  <div class="metric-stats">
                    <div class="metric-stat-item">
                      <div class="metric-stat-label">Média</div>
                      <div class="metric-stat-value">${classroom.average?.toFixed(2)}</div>
                    </div>
                    <div class="metric-stat-item">
                      <div class="metric-stat-label">Alunos</div>
                      <div class="metric-stat-value">${classroom.totalStudents}</div>
                    </div>
                    <div class="metric-stat-item">
                      <div class="metric-stat-label">Avaliações</div>
                      <div class="metric-stat-value">${classroom.totalAssessments}</div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { 
        UTI: '.pdf', 
        mimeType: 'application/pdf',
        dialogTitle: 'Compartilhar Relatório PDF'
      });
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF do relatório.');
    }
  };

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
            <Text style={styles.value}>{formatDateBR(data.startDate)} até {formatDateBR(data.endDate)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={24} color="#059669" />
            <Text style={styles.cardTitle}>Estatísticas Gerais</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue} numberOfLines={1}>{data.totalAssessments}</Text>
              <Text style={styles.statLabel}>Avaliações</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statValue} numberOfLines={1}>{data.overallAverage?.toFixed(2) || 'N/A'}</Text>
              <Text style={styles.statLabel}>Média Geral</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text 
                style={[
                  styles.statValue,
                  { color: (data.overallProgress || 0) >= 0 ? '#059669' : '#DC2626' }
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
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
            <Text style={styles.value}>{formatDateBR(data.startDate)} até {formatDateBR(data.endDate)}</Text>
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

        {/* Gráfico de Barras - Comparação de Métricas da Turma */}
        {data.metrics && data.metrics.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <BarChart3 size={24} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Desempenho por Métrica da Turma</Text>
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

        {/* Gráficos de Evolução Temporal por Métrica da Turma */}
        {data.metrics && data.metrics.length > 0 && data.metrics.some((m: any) => m.evolutionData && m.evolutionData.length > 0) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <TrendingUp size={24} color="#059669" />
              <Text style={styles.cardTitle}>Evolução Temporal da Turma</Text>
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

        {/* Detalhes das Métricas da Turma */}
        {data.metrics && data.metrics.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Award size={24} color="#D97706" />
              <Text style={styles.cardTitle}>Detalhes das Métricas da Turma</Text>
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
                      label="Evolução da Turma"
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
            <Text style={styles.value}>{formatDateBR(data.startDate)} até {formatDateBR(data.endDate)}</Text>
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

        {/* Gráfico de Barras - Comparação de Métricas Geral */}
        {data.metricsComparison && data.metricsComparison.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <BarChart3 size={24} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Desempenho por Métrica (Geral)</Text>
            </View>
            
            <HorizontalBarChart 
              data={data.metricsComparison.map((m: any) => ({
                label: m.metricLabel,
                value: m.average || 0,
                color: m.average >= 4 ? '#059669' : m.average >= 3 ? '#F59E0B' : '#EF4444'
              }))}
              maxValue={5}
            />
          </View>
        )}

        {/* Gráficos de Evolução Temporal por Métrica (Geral) */}
        {data.metricsComparison && data.metricsComparison.length > 0 && data.metricsComparison.some((m: any) => m.evolutionData && m.evolutionData.length > 0) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <TrendingUp size={24} color="#059669" />
              <Text style={styles.cardTitle}>Evolução Temporal (Geral)</Text>
            </View>
            
            {data.metricsComparison.map((metric: any, index: number) => {
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

        {/* Detalhes das Métricas (Geral) */}
        {data.metricsComparison && data.metricsComparison.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Award size={24} color="#D97706" />
              <Text style={styles.cardTitle}>Detalhes das Métricas (Geral)</Text>
            </View>
            
            {data.metricsComparison.map((metric: any, index: number) => (
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
                      label="Evolução Geral"
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

  const renderStudentClassroomComparisonReport = () => {
    return (
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BarChart3 size={24} color="#8B5CF6" />
            <Text style={styles.cardTitle}>Comparação do Aluno em Turmas</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Aluno:</Text>
            <Text style={styles.value}>{data.studentName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Período:</Text>
            <Text style={styles.value}>{formatDateBR(data.startDate)} até {formatDateBR(data.endDate)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Turmas Comparadas:</Text>
            <Text style={styles.value}>{data.classroomPerformances?.length || 0}</Text>
          </View>
        </View>

        {/* Comparação das Turmas */}
        {data.classroomPerformances && data.classroomPerformances.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <TrendingUp size={24} color="#059669" />
              <Text style={styles.cardTitle}>Desempenho por Turma</Text>
            </View>
            
            {data.classroomPerformances.map((performance: any, index: number) => (
              <View key={index} style={styles.comparisonItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={[
                    styles.rankingPosition,
                    { backgroundColor: ['#8B5CF6', '#059669', '#F59E0B'][index % 3] }
                  ]}>
                    <Text style={[styles.rankingPositionText, { color: '#FFFFFF' }]}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.comparisonName, { flex: 1, marginLeft: 12, marginBottom: 0 }]}>
                    {performance.classroomName}
                  </Text>
                </View>
                <View style={styles.comparisonStats}>
                  <View style={styles.comparisonStatItem}>
                    <Text style={styles.comparisonStatLabel}>Média</Text>
                    <Text style={[styles.comparisonStatValue, { color: '#8B5CF6' }]}>
                      {performance.overallAverage?.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.comparisonStatItem}>
                    <Text style={styles.comparisonStatLabel}>Avaliações</Text>
                    <Text style={styles.comparisonStatValue}>{performance.totalAssessments}</Text>
                  </View>
                  <View style={styles.comparisonStatItem}>
                    <Text style={styles.comparisonStatLabel}>Progresso</Text>
                    <Text style={[
                      styles.comparisonStatValue,
                      { color: (performance.overallProgress || 0) >= 0 ? '#059669' : '#DC2626' }
                    ]}>
                      {performance.overallProgress >= 0 ? '+' : ''}{performance.overallProgress?.toFixed(1) || '0'}%
                    </Text>
                  </View>
                </View>
                
                {/* Gráfico de Barras - Métricas da Turma */}
                {performance.metrics && performance.metrics.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
                      Desempenho por Métrica
                    </Text>
                    <HorizontalBarChart 
                      data={performance.metrics.map((m: any) => ({
                        label: m.metricLabel,
                        value: m.average || 0,
                        color: m.average >= 4 ? '#059669' : m.average >= 3 ? '#F59E0B' : '#EF4444'
                      }))}
                      maxValue={5}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Comparação de Métricas Entre Turmas */}
        {data.classroomPerformances && data.classroomPerformances.length > 0 && 
         data.classroomPerformances[0].metrics && data.classroomPerformances[0].metrics.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <BarChart3 size={24} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Comparação por Métrica</Text>
            </View>
            
            {data.classroomPerformances[0].metrics.map((metric: any, metricIndex: number) => (
              <View key={metricIndex} style={styles.metricCard}>
                <Text style={styles.metricName}>{metric.metricLabel}</Text>
                <View style={{ marginTop: 12 }}>
                  {data.classroomPerformances.map((performance: any, perfIndex: number) => {
                    const perfMetric = performance.metrics[metricIndex];
                    if (!perfMetric) return null;
                    
                    return (
                      <View key={perfIndex} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280' }}>
                            {performance.classroomName}
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B5CF6' }}>
                            Média: {perfMetric.average?.toFixed(2)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <View style={{ flex: 1, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, color: '#6B7280' }}>Mín</Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937' }}>
                              {perfMetric.minimum}
                            </Text>
                          </View>
                          <View style={{ flex: 1, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, color: '#6B7280' }}>Máx</Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937' }}>
                              {perfMetric.maximum}
                            </Text>
                          </View>
                          <View style={{ flex: 1, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, color: '#6B7280' }}>Progresso</Text>
                            <Text style={{ 
                              fontSize: 12, 
                              fontWeight: '600', 
                              color: (perfMetric.progressPercentage || 0) >= 0 ? '#059669' : '#DC2626'
                            }}>
                              {perfMetric.progressPercentage >= 0 ? '+' : ''}{perfMetric.progressPercentage?.toFixed(1) || '0'}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
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
      
      {/* Botão para gerar PDF */}
      <View style={styles.pdfButtonContainer}>
        <TouchableOpacity style={styles.pdfButton} onPress={generatePDF}>
          <Download size={20} color="#FFFFFF" />
          <Text style={styles.pdfButtonText}>Exportar PDF</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {type === 'STUDENT' && renderStudentReport()}
        {type === 'CLASSROOM' && renderClassroomReport()}
        {type === 'CLASSROOM_COMPARISON' && renderComparisonReport()}
        {type === 'STUDENT_CLASSROOM_COMPARISON' && renderStudentClassroomComparisonReport()}
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
    justifyContent: 'center',
    minHeight: 90,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
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
  pdfButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  pdfButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
