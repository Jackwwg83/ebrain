# Purpose: declares the ACK dev cluster and one 4C8G worker node.

resource "alicloud_vpc" "ebrain" {
  vpc_name   = "ebrain-vpc"
  cidr_block = var.vpc_cidr
}

resource "alicloud_vswitch" "dev" {
  vpc_id       = alicloud_vpc.ebrain.id
  cidr_block   = var.vswitch_cidr
  zone_id      = var.zone_id
  vswitch_name = "ebrain-dev-subnet"
}

resource "alicloud_cs_managed_kubernetes" "dev" {
  name_prefix          = "ebrain-dev"
  cluster_spec         = "ack.pro.small"
  version              = "1.30.1-aliyun.1"
  worker_vswitch_ids   = [alicloud_vswitch.dev.id]
  new_nat_gateway      = false
  pod_cidr             = "172.20.0.0/16"
  service_cidr         = "172.21.0.0/20"
  slb_internet_enabled = true
}

resource "alicloud_cs_kubernetes_node_pool" "dev" {
  cluster_id            = alicloud_cs_managed_kubernetes.dev.id
  name                  = "ebrain-dev-workers"
  vswitch_ids           = [alicloud_vswitch.dev.id]
  instance_types        = [var.ack_worker_instance_type]
  desired_size          = 1
  system_disk_category  = "cloud_essd"
  system_disk_size      = 100
  internet_charge_type  = "PayByTraffic"
  key_name              = null
}
