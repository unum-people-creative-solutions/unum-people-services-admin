'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { tenantService } from '@/services/tenantService';
import { jornadaService } from '@/services/jornadaService';
import { FunilVitrine } from '@/components/jornada/FunilVitrine';
import { calcularFunil, periodoUtc } from '@/lib/jornada';
import type { AuditRecord, SystemErrorLog } from '@/types/dashboard';
import { Users, Ban, Activity, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { formatarHorarioDoLog, instanteDoLog } from '@/lib/horarioDosLogs';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: tenantService.getStats,
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => tenantService.getLogs({ type: 'audit' }),
    refetchInterval: 30000,
  });

  const { data: systemErrors, isLoading: errorsLoading } = useQuery({
    queryKey: ['admin-system-errors'],
    queryFn: () => tenantService.getSystemErrors({ start: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() }),
    refetchInterval: 30000,
  });

  // Funil da vitrine (spec-2-painel RF-2-06): hoje e os 6 dias anteriores, em UTC.
  const [periodoFunil] = useState(() => periodoUtc(7, new Date()));
  const funilQuery = useQuery({
    queryKey: ['jornada-funil', periodoFunil.de, periodoFunil.ate],
    queryFn: () => jornadaService.funil(periodoFunil.de, periodoFunil.ate),
  });
  const valoresFunil = useMemo(
    () => (funilQuery.data ? calcularFunil(funilQuery.data, { origem: 'todas', aparelho: 'todos' }) : undefined),
    [funilQuery.data],
  );

  const logsLoading = auditLoading || errorsLoading;

  const unifiedLogs = useMemo(() => {
    // As duas rotas devolvem uma lista, ou null quando ela está vazia
    // (contratos em src/types/dashboard.ts).
    const rawAudit: AuditRecord[] = auditLogs ?? [];
    const rawErrors: SystemErrorLog[] = systemErrors ?? [];

    const normalizedAudit = rawAudit.map((log, index) => {
      const ts = log.created_at;
      return {
        id: log.sk || `audit-${index}-${ts}`,
        timestamp: ts,
        type: 'audit' as const,
        level: log.action || 'ACTIVITY',
        actor: log.actor || 'System',
        target_id: log.target_id,
        details: log.new_state,
        request_id: log.request_id,
        raw: log
      };
    });

    const normalizedErrors = rawErrors.map((err, index) => {
      // O @timestamp do CloudWatch vem em UTC sem fuso: instanteDoLog o lê como UTC.
      const ts = err.timestamp || new Date().toISOString();

      return {
        id: `error-${index}-${ts}`,
        timestamp: ts,
        type: 'error' as const,
        level: err.level || 'ERROR',
        message: err.message || 'Error occurred',
        service: err.service || 'System',
        request_id: err.request_id,
        raw: err
      };
    });

    return [...normalizedAudit, ...normalizedErrors]
      .filter(log => log.timestamp)
      .sort((a, b) => (instanteDoLog(b.timestamp) ?? 0) - (instanteDoLog(a.timestamp) ?? 0))
      .slice(0, 50);
  }, [auditLogs, systemErrors]);

  const cards = [
    { title: 'Total Tenants', value: stats?.total_tenants || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Ativos (pagos)', value: stats?.active_tenants || 0, icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Bloqueados', value: stats?.blocked_tenants || 0, icon: Ban, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Est. MRR', value: `R$ ${(stats?.estimated_mrr || 0).toLocaleString('pt-BR')}`, icon: TrendingUp, color: 'text-primary-600', bg: 'bg-primary-50' },
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard de Administração</h1>
            <p className="text-slate-500">Visão geral do sistema e monitoramento de saúde.</p>
          </div>
          <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg font-medium text-sm border border-primary-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
            Admin Central
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${card.bg} ${card.color}`}>
                <card.icon size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <p className="text-2xl font-bold text-slate-900">{statsLoading ? '...' : card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <FunilVitrine
          idTitulo="titulo-funil-vitrine"
          titulo="Funil da vitrine · últimos 7 dias"
          valores={valoresFunil}
          carregando={funilQuery.isPending || (funilQuery.isError && funilQuery.isFetching)}
          erro={funilQuery.isError}
          onTentar={() => void funilQuery.refetch()}
          textoVazio="Nenhuma visita registrada nos últimos 7 dias."
          acao={
            <Link href="/dashboard/jornada" className="text-sm font-medium text-primary-600 hover:text-primary-800">
              Ver a jornada →
            </Link>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Logs de Atividade / Erros */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <Clock size={18} className="text-slate-500" />
                  Atividades e Logs Recentes
                </h2>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Live</span>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {logsLoading ? (
                  [...Array(5)].map((_, i) => <div key={i} className="p-4 animate-pulse h-16 bg-slate-50/50"></div>)
                ) : unifiedLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">Nenhum log registrado recentemente.</div>
                ) : unifiedLogs.map((log) => {
                  // Só erro em vermelho; WARN em amarelo, como no Monitoramento (06/11/2026).
                  const severidade =
                    log.level?.includes('ERROR') ? 'erro' : log.type === 'error' && log.level === 'WARN' ? 'aviso' : 'normal';
                  return (
                  <div
                    key={log.id}
                    data-severidade={severidade}
                    className={`p-4 hover:bg-slate-50 transition-colors ${
                      severidade === 'erro' ? 'bg-red-50/30' : severidade === 'aviso' ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        {log.type === 'error' && severidade === 'erro' && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="System Error"></span>
                        )}
                        {severidade === 'aviso' && (
                          <span className="w-2 h-2 rounded-full bg-amber-400" title="Aviso do sistema"></span>
                        )}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                          severidade === 'erro'
                            ? 'bg-red-100 text-red-700'
                            : severidade === 'aviso'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                        }`}>
                          {log.type === 'error' && <AlertCircle size={10} />}
                          {log.level}
                        </span>
                        {log.type === 'error' && log.service && (
                          <span className="text-[10px] bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded font-mono uppercase">
                            {log.service}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{formatarHorarioDoLog(log.timestamp)}</span>
                    </div>
                    
                    {log.type === 'audit' ? (
                      <p className="text-sm text-slate-700">
                        <span className="font-medium text-slate-900">{log.actor || 'SYSTEM'}</span>{' '}
                        {log.level === 'TENANT_CREATED' && `criou o tenant ${log.target_id}`}
                        {log.level === 'TENANT_UPDATED' && `atualizou o tenant ${log.target_id}`}
                        {log.level === 'INTEGRATION_ERROR' && `detectou erro na integração ${log.target_id}`}
                        {!['TENANT_CREATED', 'TENANT_UPDATED', 'INTEGRATION_ERROR'].includes(log.level) && (log.level || 'executou uma ação')}
                      </p>
                    ) : (
                      <p className={`text-sm font-medium ${severidade === 'aviso' ? 'text-amber-800' : 'text-red-800'}`}>
                        {log.message}
                      </p>
                    )}
                    
                    {log.type === 'audit' && log.details && (
                      <div className="mt-2 text-xs bg-white/50 p-2 rounded border border-slate-100 text-slate-600 font-mono overflow-x-auto">
                        {log.details}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
