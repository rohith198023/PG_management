import { prisma } from './prisma';

/**
 * Smart Gateway Failover Evaluator:
 * If requested gateway is DOWN, DEGRADED, or UNHEALTHY (avg_latency > 1500ms or status === FAILED),
 * automatically fallback to the next available CONNECTED gateway for the workspace.
 */
export async function getBestAvailableGateway(workspaceId: string, preferredGateway: string) {
  const finSettings = await prisma.financialSettings.findUnique({
    where: { workspace_id: workspaceId },
  });

  const failoverEnabled = finSettings ? finSettings.failover_enabled : true;

  // Check health of requested gateway
  const targetHealth = await prisma.gatewayHealth.findUnique({
    where: {
      workspace_id_gateway_name: {
        workspace_id: workspaceId,
        gateway_name: preferredGateway.toLowerCase(),
      },
    },
  });

  const isHealthy =
    targetHealth &&
    targetHealth.status === 'CONNECTED' &&
    targetHealth.avg_latency_ms < 1500 &&
    targetHealth.success_rate >= 90.0;

  if (isHealthy || !failoverEnabled) {
    return {
      selectedGateway: preferredGateway,
      isFailover: false,
      reason: 'Requested gateway is healthy',
    };
  }

  // Gateway is degraded or unconfigured, find healthy alternative
  const backupGateways = await prisma.gatewayHealth.findMany({
    where: {
      workspace_id: workspaceId,
      status: 'CONNECTED',
      gateway_name: { not: preferredGateway.toLowerCase() },
    },
    orderBy: { avg_latency_ms: 'asc' },
  });

  if (backupGateways.length > 0) {
    const fallback = backupGateways[0].gateway_name;

    // Log failover event
    await prisma.gatewayFailoverLog.create({
      data: {
        workspace_id: workspaceId,
        primary_gateway: preferredGateway,
        fallback_gateway: fallback,
        reason: `Primary gateway ${preferredGateway} latency (${targetHealth?.avg_latency_ms || 'N/A'}ms) or status (${targetHealth?.status || 'UNCONFIGURED'}) degraded.`,
        latency_ms: targetHealth?.avg_latency_ms || 2000,
      },
    });

    return {
      selectedGateway: fallback,
      isFailover: true,
      reason: `Switched to ${fallback.toUpperCase()} due to high latency/error on ${preferredGateway.toUpperCase()}`,
    };
  }

  // Fallback to preferred gateway if no backup exists
  return {
    selectedGateway: preferredGateway,
    isFailover: false,
    reason: 'Primary gateway selected (no active backups configured)',
  };
}
