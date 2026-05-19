# Purpose: declares a public SLB placeholder for ingress exposure.

resource "alicloud_slb_load_balancer" "ingress" {
  load_balancer_name   = "ebrain-dev-lb"
  address_type         = "internet"
  load_balancer_spec   = "slb.s1.small"
  internet_charge_type = "PayByTraffic"
}
