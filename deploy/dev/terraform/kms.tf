# Purpose: declares the KMS key used to envelope Ebrain runtime and app secrets.

resource "alicloud_kms_key" "ebrain" {
  description            = "Ebrain dev master key"
  deletion_window_in_days = 7
  protection_level       = "SOFTWARE"
}

resource "alicloud_kms_alias" "ebrain" {
  alias_name = "alias/ebrain-dev"
  key_id     = alicloud_kms_key.ebrain.id
}
