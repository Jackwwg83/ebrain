# Purpose: declares the RDS PostgreSQL 16 dev instance and database shell.

resource "alicloud_db_instance" "postgres" {
  engine               = "PostgreSQL"
  engine_version       = "16.0"
  instance_type        = var.rds_instance_type
  instance_storage     = 100
  instance_name        = "ebrain-dev-pg"
  vswitch_id           = alicloud_vswitch.dev.id
  security_ips         = [var.vswitch_cidr]
  storage_type         = "cloud_essd"
  category             = "Basic"
  deletion_protection  = true
}

resource "alicloud_rds_account" "ebrain" {
  db_instance_id   = alicloud_db_instance.postgres.id
  account_name     = "ebrain"
  account_password = var.rds_admin_password
  account_type     = "Normal"
}

resource "alicloud_rds_database" "ebrain_dev" {
  instance_id   = alicloud_db_instance.postgres.id
  name          = "ebrain_dev"
  character_set = "UTF8"
}
