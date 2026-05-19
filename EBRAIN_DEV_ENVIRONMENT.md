# Ebrain Dev 环境运维手册

> **公司阿里云账户上的 dev 环境** · 钉钉作为内部测试入口
>
> 版本：v1.0 · 2026-05-18 · 配套 [EBRAIN_IMPLEMENTATION_PIPELINE.md](./EBRAIN_IMPLEMENTATION_PIPELINE.md) Stage A5

---

## 0. 文档使用

| 读者 | 用途 |
|---|---|
| **Codex（Stage A5）** | 按本文档作为部署目标的"规约"实现 |
| **PM / DevOps** | 部署后日常维护、看日志、查 Pod 状态 |
| **工程团队** | 怎么访问 dev 测试自己的改动 |

---

## 1. 环境总览

### 1.0 Stage A5 五步上线清单

1. PM/DevOps 在阿里云创建 ACR、ACK、RDS PG、NAS、NAT、SLB、KMS；可参考 `deploy/dev/terraform/`，但 Codex 不执行 `terraform apply`。
2. 在 ACK 安装 cert-manager、AliDNS DNS-01 solver、External Secrets Operator，并创建 KMS/ACR/DNS provider access secret。
3. 在阿里云 KMS 写入 `deploy/dev/helm/values.dev.yaml` 引用的 remote keys：RDS `DATABASE_URL`、`EBRAIN_SECRETS_KEY`、admin bootstrap token、provider API keys、ACR `.dockerconfigjson`。
4. 在 GitHub UI 配置 Actions secrets，push `ebrain-mvp` 触发 `.github/workflows/dev-deploy.yml`，或本地运行 `./scripts/ebrain-dev-deploy.sh`。
5. 验收：`kubectl get pods -n ebrain-dev` 全 Running，`curl https://ebrain-dev.<your-company>.com/health` 返回 200，浏览器打开 `/admin`，钉钉事件订阅测试到达 webhook。

```
公司阿里云账户
  └── Region: 华东 2 (上海) 或 华北 2 (北京) — 看公司地理位置
      │
      ├── VPC: ebrain-vpc
      │   └── Subnet: ebrain-dev-subnet (10.0.1.0/24)
      │
      ├── ACK 集群: ebrain-dev
      │   └── 1 个 worker 节点 (4C8G, ecs.g7.xlarge)
      │       └── Namespace: ebrain-dev
      │           ├── mcp-api (Deployment, 1 副本)
      │           ├── minion-worker (Deployment, 1 副本)
      │           ├── supervisor (Deployment, 1 副本)
      │           ├── External Secrets Operator
      │           └── cert-manager
      │
      ├── RDS PostgreSQL: ebrain-dev-pg
      │   └── 规格: pg.x4.large.2 (4C16G) — 阿里云 RDS PG 16
      │       SSL 强制 + VPC 内网访问
      │       PITR 自动备份保留 7 天
      │
      ├── NAS: ebrain-dev-brain-repo
      │   └── 100GB, RWX, NFS 协议
      │       挂载到 mcp-api 和 worker 的 brain-repo PVC
      │
      ├── OSS Bucket: ebrain-dev
      │   └── 用途：brain-repo 备份 + Git LFS 对象
      │
      ├── NAT Gateway: ebrain-nat
      │   └── 出公网：调钉钉 / Anthropic / 阿里云 KMS
      │
      ├── SLB: ebrain-dev-lb
      │   └── 80→Ingress 80, 443→Ingress 443
      │
      └── KMS:
          └── ebrain-master-key（用于加密 enterprise_apps.credentials）

域名：ebrain-dev.<your-company>.com
TLS：cert-manager + Let's Encrypt（DNS-01 challenge，避免公网验证）
```

### 1.1 月度成本预算（约 ¥1630）

| 资源 | 规格 | 月成本 |
|---|---|---|
| ACK 集群 | 含 1 worker 4C8G | ¥600 |
| RDS PG | 4C16G + 100GB SSD + PITR 7 天 | ¥800 |
| NAS | 100GB 通用型 | ¥30 |
| OSS | 100GB 标准存储 + 流量 | ¥10 |
| NAT Gateway | 增强型 + 流量预估 50GB | ¥150 |
| SLB | 性能保障型小型 | ¥40 |
| KMS | 软件密钥 | 几乎 0 |
| **小计** | | **~¥1630/月** |

---

## 2. 首次初始化（Stage A5 时跑）

### 2.1 前置准备（由同事完成）

**钉钉 admin 同事的任务**（A5 启动前 3 天完成）：

```
1. 登录 https://oa.dingtalk.com（钉钉管理后台）
2. 应用开发 → 创建自建应用 → "企业内部应用"
3. 应用名：Ebrain Dev
4. 应用 logo: 用 Ebrain logo
5. 应用主页地址：https://ebrain-dev.<your-company>.com/admin
6. 等待管理员审批通过（通常 1-2 天）

7. 拿到凭证：
   - AppKey: dingxxxxxxxxxxx
   - AppSecret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   把凭证安全发给 PM（不要走聊天工具明文）

8. 权限申请（用应用 admin 后台勾选）：
   ✅ 通讯录只读
   ✅ 消息通知（工作通知）
   ✅ 群消息读取
   ✅ 文档读权限
   ✅ 钉盘读权限
   ✅ 会议读权限（含转录）
   提交后管理员审批（通常 1 天）

9. 测试范围：
   勾选"仅可见人员"→ 添加工程团队（含你）
   暂时不向全员开放

10. 事件订阅（待 Stage A5 部署完后再回来配）：
    回调 URL：https://ebrain-dev.<your-company>.com/webhook/dingtalk/event
    Token: 自动生成（记下来）
    AESKey: 自动生成（记下来）
    订阅事件：消息发送 / 文档变更 / 会议结束
```

### 2.2 阿里云资源初始化（由 PM/DevOps 完成）

**方式 A（推荐）：用 Terraform 声明**

```bash
cd deploy/dev/terraform
terraform init
terraform plan -var-file=dev.tfvars
terraform apply
```

**方式 B：阿里云控制台手动建**（A 不熟悉 Terraform 时）

```
1. 创建 VPC ebrain-vpc (10.0.0.0/16)
2. 创建 vSwitch ebrain-dev-subnet (10.0.1.0/24)
3. 创建 ACK 集群 ebrain-dev
   - K8s 版本：1.30+
   - 1 worker (ecs.g7.xlarge, 100GB ESSD)
   - 容器运行时：containerd
4. 创建 RDS PG ebrain-dev-pg
   - 引擎：PostgreSQL 16
   - 规格：pg.x4.large.2 (4C16G)
   - 存储：100GB 通用 SSD
   - 网络：和 ACK 同一 VPC，安全组放通 5432
   - 安装 extension：vector / pg_trgm / pgcrypto
5. 创建 NAS ebrain-dev-brain-repo
   - 通用型，100GB
   - 协议：NFSv4
   - 挂载点：和 ACK 同一 VPC
6. 创建 OSS Bucket ebrain-dev
   - 存储类型：标准
   - 访问权限：私有
   - 版本控制：开启
7. 创建 NAT Gateway ebrain-nat
   - 公网 IP：1 个 EIP
   - SNAT：配 dev-subnet 全部走 NAT
8. 创建 SLB ebrain-dev-lb
   - 性能保障型小型
   - 公网 IP
9. 创建 KMS 密钥 ebrain-master-key
   - 软件密钥 + 用户主密钥
   - 用途：encrypt enterprise_apps.credentials
10. 域名解析（云解析 DNS）
    - ebrain-dev.<your-company>.com → SLB 公网 IP
```

### 2.3 部署 Ebrain（Stage A5）

```bash
# 1. 配置 kubectl
aliyun cs DescribeClusterUserKubeconfig --ClusterId <ebrain-dev-cluster-id> > ~/.kube/ebrain-dev.config
export KUBECONFIG=~/.kube/ebrain-dev.config

# 2. 创建 namespace
kubectl create namespace ebrain-dev

# 3. 安装 cert-manager + External Secrets Operator
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true

helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets --create-namespace

# 4. 安装 AliDNS DNS-01 solver（示例，版本由 PM 按公司镜像源固定）
helm repo add cert-manager-alidns https://devmachine-fr.github.io/cert-manager-alidns-webhook
helm install cert-manager-alidns cert-manager-alidns/cert-manager-alidns-webhook \
  --namespace cert-manager

# 5. 创建 External Secrets / cert-manager 所需 provider secret
kubectl create secret generic alicloud-kms-access -n ebrain-dev \
  --from-literal=access-key-id=<RAM_ACCESS_KEY_ID> \
  --from-literal=access-key-secret=<RAM_ACCESS_KEY_SECRET>
kubectl create secret generic alicloud-dns01-access -n cert-manager \
  --from-literal=access-key-id=<RAM_ACCESS_KEY_ID> \
  --from-literal=access-key-secret=<RAM_ACCESS_KEY_SECRET>

# 6. 安装 Ebrain（推荐：脚本封装 terraform + helm）
EBRAIN_CONFIRM_APPLY=yes ./scripts/ebrain-dev-up.sh

# 或只执行 Helm deploy（资源已创建时）
helm upgrade --install ebrain-dev deploy/dev/helm \
  --values deploy/dev/helm/values.dev.yaml \
  --namespace ebrain-dev \
  --create-namespace \
  --wait \
  --atomic

# 7. 等 ingress 就绪
kubectl get ingress -n ebrain-dev -w

# 8. 跑 schema migration（Round 3 C-002）
# Pod 启动时 connectEngine() 会自动跑 initSchema() 把 v200 apply 上；
# 如未自动落地（lock 抢失败、binary 版本不一致等），手动恢复：
kubectl exec -n ebrain-dev deploy/mcp-api -- gbrain apply-migrations --force-schema --yes
# 注意：gbrain migrate 是 PGLite↔Postgres 引擎迁移命令，跟 schema 无关，不要混用

# 9. 验证
curl https://ebrain-dev.<your-company>.com/health
# 应返回 {"status":"ok", ...}
```

### 2.5 GitHub Actions secrets 清单

在 GitHub repo → Settings → Secrets and variables → Actions 配置：

| Secret | 用途 |
|---|---|
| `ACR_REGISTRY` | ACR registry host，例如 `registry.cn-shanghai.aliyuncs.com` |
| `ACR_REPOSITORY` | ACR repository，例如 `your-acr-namespace/ebrain` |
| `ACR_USER` / `ACR_PASS` | GitHub Actions 推送 ACR 私有镜像 |
| `KUBE_CONFIG_DATA` | `~/.kube/ebrain-dev.config` base64 后的内容 |
| `EBRAIN_DEV_HOST` | `ebrain-dev.<your-company>.com`，用于 smoke test |

以下值不进入 GitHub secrets，写入阿里云 KMS，由 External Secrets Operator 同步到 K8s Secret：

| KMS remote key | K8s secret key |
|---|---|
| `ebrain/dev/rds/database-url` | `DATABASE_URL`，必须含 `?sslmode=require` |
| `ebrain/dev/runtime/ebrain-secrets-key` | `EBRAIN_SECRETS_KEY`，32 bytes base64 |
| `ebrain/dev/runtime/admin-bootstrap-token` | `GBRAIN_ADMIN_BOOTSTRAP_TOKEN` |
| `ebrain/dev/providers/openai-api-key` | `OPENAI_API_KEY` |
| `ebrain/dev/providers/anthropic-api-key` | `ANTHROPIC_API_KEY` |
| `ebrain/dev/providers/dashscope-api-key` | `DASHSCOPE_API_KEY` |
| `ebrain/dev/acr/dockerconfigjson` | `.dockerconfigjson` image pull secret |

### 2.4 配置钉钉 webhook 回调

```
回到 钉钉 admin → 应用 Ebrain Dev → 事件订阅
1. 回调 URL: https://ebrain-dev.<your-company>.com/webhook/dingtalk/event
2. Token：从 Step 1 拿到
3. AESKey：从 Step 1 拿到
4. 订阅事件：勾选
   - 消息：群消息 / 单聊消息
   - 文档：文档变更
   - 会议：会议结束
5. 测试连通性 → 钉钉会发一个测试事件到 webhook → 看 dev 日志确认收到

# 看 dev 日志
kubectl logs -n ebrain-dev deploy/mcp-api -f | grep webhook
```

---

## 3. 日常运维 SOP

### 3.1 查看 Pod 状态

```bash
kubectl get pods -n ebrain-dev
kubectl get pods -n ebrain-dev -w   # 监听变化
```

### 3.2 看日志

```bash
# MCP API 日志
kubectl logs -n ebrain-dev deploy/mcp-api -f --tail=100

# Worker 日志
kubectl logs -n ebrain-dev deploy/minion-worker -f --tail=100

# Supervisor 日志
kubectl logs -n ebrain-dev deploy/supervisor -f --tail=100

# 看错误日志
kubectl logs -n ebrain-dev deploy/mcp-api | grep -i error | tail -50

# 多 pod 日志合并
kubectl logs -n ebrain-dev -l app=mcp-api --tail=100 -f
```

### 3.3 kubectl exec 进 pod

```bash
# 进 mcp-api 容器
kubectl exec -n ebrain-dev -it deploy/mcp-api -- sh

# 跑 gbrain 命令
kubectl exec -n ebrain-dev deploy/mcp-api -- gbrain doctor
kubectl exec -n ebrain-dev deploy/mcp-api -- gbrain executives list

# 看环境变量
kubectl exec -n ebrain-dev deploy/mcp-api -- env | grep EBRAIN
```

### 3.4 连 RDS PG

```bash
# 通过 jumpbox（如果配了）
ssh ebrain-dev-jumpbox
psql -h ebrain-dev-pg.mysql.rds.aliyuncs.com -U ebrain -d ebrain_dev

# 或通过 kubectl port-forward
kubectl port-forward -n ebrain-dev svc/postgres-rds-service 5432:5432
psql -h localhost -p 5432 -U ebrain -d ebrain_dev
```

### 3.5 部署新版本

```bash
# 方式 1：自动（push to main）
# CI/CD 自动 build + push + deploy

# 方式 2：手动部署当前分支
./scripts/ebrain-dev-deploy.sh

# 方式 3：回滚到上个版本
helm rollback ebrain-dev -n ebrain-dev

# 看部署历史
helm history ebrain-dev -n ebrain-dev
```

### 3.6 测试钉钉 @brain（M-D3 后）

```
1. 在公司钉钉里建一个测试群"Ebrain 测试群"
2. 拉 Ebrain Dev 机器人入群
3. 在群里 @Ebrain Dev "今天有什么客户提到 ACME"
4. 等 brain 回复（应该 < 5s）

# 同时看 dev 日志
kubectl logs -n ebrain-dev deploy/mcp-api -f | grep "subagent"
```

### 3.7 手动触发 Dream Cycle（M-D4 后）

```bash
kubectl exec -n ebrain-dev deploy/mcp-api -- \
  gbrain jobs submit enterprise-compile-truth \
  --data '{"source_id":"enterprise","mode":"manual","shard_count":4}'

# 看进度
kubectl logs -n ebrain-dev deploy/minion-worker -f | grep dream

# 看生成的 brief
kubectl exec -n ebrain-dev deploy/mcp-api -- ls -la /data/ebrain-repo/briefs/daily/
```

---

## 4. 故障排查

### 4.1 Pod 起不来

```bash
kubectl describe pod -n ebrain-dev <pod-name>
# 看 Events 段

# 常见原因：
# 1. 镜像 pull 失败 → 检查 ExternalSecret 是否生成 acr-pull-secret
# 2. PVC 挂载失败 → 检查 NAS 服务可达性
# 3. ConfigMap 缺字段 → kubectl get configmap -n ebrain-dev -o yaml
# 4. RDS 连不上 → 检查安全组规则
```

ACR 私有镜像拉取排查：

```bash
kubectl get externalsecret -n ebrain-dev acr-pull-secret
kubectl get secret -n ebrain-dev acr-pull-secret -o jsonpath='{.type}'
# 期望 kubernetes.io/dockerconfigjson

kubectl describe pod -n ebrain-dev -l app.kubernetes.io/component=mcp-api | grep -A8 "Failed to pull"
```

### 4.2 钉钉 webhook 收不到

```bash
# 1. 看 dev Ingress 是否正常
curl -X POST https://ebrain-dev.../webhook/dingtalk/event \
  -H "Content-Type: application/json" \
  -d '{"test":1}'
# 应返回 401（验签失败，但路由通了）

# 2. 看 NAT 出网是否正常
kubectl exec -n ebrain-dev deploy/mcp-api -- \
  curl -I https://oapi.dingtalk.com/
# 应返回 200

# 如不通，检查 NAT + NetworkPolicy
kubectl get networkpolicy -n ebrain-dev
kubectl describe networkpolicy -n ebrain-dev mcp-api-restricted-egress

# 3. 看钉钉 admin → 应用 → 事件订阅 → 推送记录
# 看是否有重试 / 失败
```

### 4.3 Token 过期（Round 6 R6-M-001 修订）

```bash
# 1. 列出 executive 绑定（E1 已规划：list / validate / update / create）
kubectl exec -n ebrain-dev deploy/mcp-api -- gbrain executives list

# 2. 校验单个 executive 的绑定 + 关联 token 状态
kubectl exec -n ebrain-dev deploy/mcp-api -- gbrain executives validate <executive_id>

# 3. 看通用健康面（含 oauth_tokens expiry 提醒，gbrain 内建）
kubectl exec -n ebrain-dev deploy/mcp-api -- gbrain doctor

# 4. 手动触发 token refresh（cron worker 是异步，急用时可直接 enqueue）
kubectl exec -n ebrain-dev deploy/mcp-api -- \
  gbrain jobs submit token-refresh --data '{}'
```

注：E1 CLI 子命令清单：`create / list / validate / update`。如果未来要专门加 `executives doctor`，需要在 E1 deliverable 增项并配验收测试，不要在 runbook 引用未注册命令。

### 4.4 RDS 连接数满

```bash
# 看连接数
psql -h ebrain-dev-pg... -c "SELECT count(*) FROM pg_stat_activity"

# 临时增加 max_connections
# 阿里云控制台 → RDS → 参数 → max_connections 调高
```

### 4.5 RDS SSL / schema migration 失败

```bash
# DATABASE_URL 必须在 KMS 中写完整 URL，并带 sslmode=require
kubectl get secret -n ebrain-dev ebrain-rds -o jsonpath='{.data.DATABASE_URL}' | base64 -d

# schema migration 自动跑在 connectEngine() -> initSchema()；手动恢复只用 force-schema
kubectl exec -n ebrain-dev deploy/mcp-api -- gbrain apply-migrations --force-schema --yes

# 不要用 gbrain migrate 处理 schema；它是 PGLite <-> Postgres engine migration
```

---

## 5. 安全注意事项

| 项 | 实践 |
|---|---|
| **凭证** | 永远走 KMS + External Secrets，不要写 values.yaml 里 |
| **网络** | RDS / NAS 都在 VPC 内，公网不可达 |
| **SLB** | 仅暴露 ebrain-dev 域名，不暴露 IP 直访 |
| **TLS** | 全 HTTPS，cert-manager 自动续期 |
| **钉钉 admin** | 应用"测试范围"模式，正式上线前不向全员开放 |
| **kubectl 访问** | 用 RAM 子账号，不用主账号 |
| **审计** | 阿里云 ActionTrail 全开 |

---

## 6. 销毁 / 重建 dev 环境

```bash
# 完全销毁（释放所有资源停止计费）
helm uninstall ebrain-dev -n ebrain-dev
kubectl delete namespace ebrain-dev

cd deploy/dev/terraform
terraform destroy

# 注意：销毁前先备份重要数据
kubectl exec deploy/mcp-api -- \
  pg_dump -h ebrain-dev-pg... -U ebrain ebrain_dev | gzip > /tmp/dev-backup.sql.gz

# 重建：从 § 2.2 重新跑
```

---

## 7. 配套 Codex 上下文

Stage A5 之后，每个 Stage 完成都按 § 2.3 部署到 dev：

```bash
# .github/workflows/dev-deploy.yml
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: docker build -t crpi-xxx.cn-shanghai.personal.cr.aliyuncs.com/ebrain/ebrain:${{ github.sha }} .
      - name: Push to ACR
        run: docker push crpi-xxx.cn-shanghai.personal.cr.aliyuncs.com/ebrain/ebrain:${{ github.sha }}
      - name: Deploy via Helm
        run: |
          helm upgrade ebrain-dev ./deploy/dev/helm \
            -f deploy/dev/helm/values.dev.yaml \
            --namespace ebrain-dev \
            --set image.tag=${{ github.sha }} \
            --wait
      - name: Smoke test
        run: |
          sleep 30
          curl -f https://ebrain-dev.<your-company>.com/health
```

PM 每个 Stage 完成后跑：

```bash
./scripts/ebrain-dev-smoke.sh
# 内含：
# - curl /health
# - curl /admin (期望 200)
# - kubectl rollout status deploy/mcp-api
# - gbrain doctor （via kubectl exec）
```

通过 → 进下一个 Stage。

---

**文档结束 · v1.0**

下一步阅读：
- [`EBRAIN_IMPLEMENTATION_PIPELINE.md`](./EBRAIN_IMPLEMENTATION_PIPELINE.md) Stage A5 spec
- [`EBRAIN_MVP_V1.md`](./EBRAIN_MVP_V1.md) § 10 部署与运维
