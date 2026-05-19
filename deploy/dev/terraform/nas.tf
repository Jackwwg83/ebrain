# Purpose: declares the NAS NFS mount used by the brain repository PVC.

resource "alicloud_nas_file_system" "brain_repo" {
  protocol_type = "NFS"
  storage_type  = "Performance"
  description   = "ebrain-dev-brain-repo"
}

resource "alicloud_nas_mount_target" "brain_repo" {
  file_system_id    = alicloud_nas_file_system.brain_repo.id
  vswitch_id        = alicloud_vswitch.dev.id
  network_type      = "Vpc"
  access_group_name = "DEFAULT_VPC_GROUP_NAME"
}
