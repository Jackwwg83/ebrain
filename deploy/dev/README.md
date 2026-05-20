# Ebrain Dev Deployment

This directory contains the Stage A5 dev-environment scaffold for Alibaba Cloud
ACK. It is intentionally deployable by PM/DevOps, not by Codex.

## Five-Step Dev Launch

1. Provision Alibaba Cloud resources with `deploy/dev/terraform/` or the ACK/RDS/NAS/KMS console.
2. Install cert-manager, the AliDNS DNS-01 solver, and External Secrets Operator in ACK.
3. Create KMS entries referenced by `deploy/dev/helm/values.dev.yaml`.
4. Set company-approved SaaS egress CIDRs; empty CIDRs make Helm fail fast.
5. Build and push the image to ACR, or let `.github/workflows/dev-deploy.yml` do it.
6. Run `scripts/ebrain-dev-up.sh`, then verify `/health` and `/admin`.

## Local Syntax Checks

```bash
helm lint deploy/dev/helm
helm template ebrain-dev deploy/dev/helm \
  --values deploy/dev/helm/values.dev.yaml \
  --set 'networkPolicy.httpsEgressCidrs[0]=203.0.113.0/24'
```

The chart does not contain real secrets. All credentials are sourced through
ExternalSecret objects backed by Alibaba Cloud KMS.
