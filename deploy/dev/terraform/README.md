# Ebrain Dev Terraform Templates

These files are Stage A5 templates for PM/DevOps. Codex does not run
`terraform apply`; the Alibaba Cloud account owner must review variables,
quotas, regions, billing, and network policy before applying.

## Suggested Flow

```bash
cd deploy/dev/terraform
terraform init
terraform plan -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
```

Create `dev.tfvars` from company-approved values. Keep it out of git because it
may include account-specific VPC, zone, and billing settings.

## Outputs

`outputs.tf` exposes ACK, RDS, NAS, SLB, and KMS handles that are copied into
`deploy/dev/helm/values.dev.yaml` or KMS remote secret records.
