# Purpose: declares NAT Gateway + EIP so ACK pods can reach DingTalk and model APIs.

resource "alicloud_eip_address" "nat" {
  address_name         = "ebrain-dev-nat-eip"
  internet_charge_type = "PayByTraffic"
}

resource "alicloud_nat_gateway" "dev" {
  vpc_id           = alicloud_vpc.ebrain.id
  nat_gateway_name = "ebrain-nat"
  payment_type     = "PayAsYouGo"
  vswitch_id       = alicloud_vswitch.dev.id
  nat_type         = "Enhanced"
}

resource "alicloud_eip_association" "nat" {
  allocation_id = alicloud_eip_address.nat.id
  instance_id   = alicloud_nat_gateway.dev.id
}

resource "alicloud_snat_entry" "dev" {
  snat_table_id     = alicloud_nat_gateway.dev.snat_table_ids
  source_vswitch_id = alicloud_vswitch.dev.id
  snat_ip           = alicloud_eip_address.nat.ip_address
}
