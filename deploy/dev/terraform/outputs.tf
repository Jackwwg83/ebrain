# Purpose: exposes values PM copies into Helm values, DNS, and KMS records.

output "ack_cluster_id" {
  value = alicloud_cs_managed_kubernetes.dev.id
}

output "rds_internal_connection_string" {
  value = alicloud_db_instance.postgres.connection_string
}

output "nas_mount_target_domain" {
  value = alicloud_nas_mount_target.brain_repo.mount_target_domain
}

output "slb_address" {
  value = alicloud_slb_load_balancer.ingress.address
}

output "kms_key_id" {
  value = alicloud_kms_key.ebrain.id
}
