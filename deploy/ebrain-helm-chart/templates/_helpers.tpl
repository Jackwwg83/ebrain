{{- define "ebrain.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "ebrain.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "ebrain.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "ebrain.componentName" -}}
{{- $root := .root -}}
{{- $component := .component -}}
{{- printf "%s-%s" (include "ebrain.fullname" $root) $component | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "ebrain.labels" -}}
helm.sh/chart: {{ include "ebrain.chart" . }}
app.kubernetes.io/name: {{ include "ebrain.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: ebrain
{{- end -}}

{{- define "ebrain.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ebrain.name" .root }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{- define "ebrain.componentLabels" -}}
{{ include "ebrain.labels" .root }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{- define "ebrain.image" -}}
{{- $registry := trimSuffix "/" .Values.image.registry -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry .Values.image.name .Values.image.tag -}}
{{- else -}}
{{- printf "%s:%s" .Values.image.name .Values.image.tag -}}
{{- end -}}
{{- end -}}

{{- define "ebrain.adminSpaImage" -}}
{{- $registry := trimSuffix "/" .Values.image.registry -}}
{{- $name := default "ebrain-admin-spa" .Values.adminSpa.image.name -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry $name .Values.image.tag -}}
{{- else -}}
{{- printf "%s:%s" $name .Values.image.tag -}}
{{- end -}}
{{- end -}}

{{- define "ebrain.imagePullSecrets" -}}
{{- if .Values.image.pullSecret }}
imagePullSecrets:
  - name: {{ .Values.image.pullSecret }}
{{- end -}}
{{- end -}}

{{- define "ebrain.podSecurityContext" -}}
securityContext:
{{- toYaml .Values.podSecurityContext | nindent 2 }}
{{- end -}}

{{- define "ebrain.containerSecurityContext" -}}
securityContext:
{{- toYaml .Values.containerSecurityContext | nindent 2 }}
{{- end -}}

{{- define "ebrain.runtimeEnv" -}}
- name: EBRAIN_ENV
  value: {{ .Values.config.ebrainEnv | quote }}
- name: NODE_ENV
  value: {{ .Values.config.nodeEnv | quote }}
- name: LOG_LEVEL
  value: {{ .Values.config.logLevel | quote }}
- name: GBRAIN_HOME
  value: {{ .Values.config.gbrainHome | quote }}
- name: GBRAIN_SOURCE
  value: {{ .Values.config.sourceId | quote }}
- name: GBRAIN_POOL_SIZE
  value: {{ .Values.postgres.poolSize | quote }}
- name: POSTGRES_HOST
{{- if .Values.postgres.host }}
  value: {{ .Values.postgres.host | quote }}
{{- else }}
  valueFrom:
    secretKeyRef:
      name: {{ .Values.secrets.postgres.name }}
      key: {{ .Values.secrets.postgres.hostKey }}
{{- end }}
- name: DATABASE_URL
{{- if .Values.env.DATABASE_URL }}
  value: {{ .Values.env.DATABASE_URL | quote }}
{{- else }}
  valueFrom:
    secretKeyRef:
      name: {{ .Values.secrets.postgres.name }}
      key: {{ .Values.secrets.postgres.databaseUrlKey }}
{{- end }}
- name: GBRAIN_DATABASE_URL
{{- if .Values.env.DATABASE_URL }}
  value: {{ .Values.env.DATABASE_URL | quote }}
{{- else }}
  valueFrom:
    secretKeyRef:
      name: {{ .Values.secrets.postgres.name }}
      key: {{ .Values.secrets.postgres.databaseUrlKey }}
{{- end }}
- name: EBRAIN_MASTER_KEY
{{- if .Values.env.EBRAIN_MASTER_KEY }}
  value: {{ .Values.env.EBRAIN_MASTER_KEY | quote }}
{{- else }}
  valueFrom:
    secretKeyRef:
      name: {{ .Values.secrets.masterKey.name }}
      key: {{ .Values.secrets.masterKey.ebrainMasterKey }}
{{- end }}
- name: EBRAIN_SECRETS_KEY
{{- if .Values.env.EBRAIN_SECRETS_KEY }}
  value: {{ .Values.env.EBRAIN_SECRETS_KEY | quote }}
{{- else }}
  valueFrom:
    secretKeyRef:
      name: {{ .Values.secrets.masterKey.name }}
      key: {{ .Values.secrets.masterKey.ebrainSecretsKey }}
{{- end }}
- name: ANTHROPIC_API_KEY
{{- if .Values.env.ANTHROPIC_API_KEY }}
  value: {{ .Values.env.ANTHROPIC_API_KEY | quote }}
{{- else }}
  valueFrom:
    secretKeyRef:
      name: {{ .Values.secrets.llm.name }}
      key: {{ .Values.secrets.llm.anthropicApiKey }}
      optional: true
{{- end }}
{{- end -}}

{{- define "ebrain.brainRepoVolume" -}}
- name: brain-repo
  persistentVolumeClaim:
    claimName: {{ include "ebrain.componentName" (dict "root" . "component" "brain-repo") }}
{{- end -}}

{{- define "ebrain.brainRepoMount" -}}
- name: brain-repo
  mountPath: {{ .Values.storage.brainRepo.mountPath }}
{{- end -}}

{{- define "ebrain.backendServiceName" -}}
{{- $root := .root -}}
{{- $backend := .backend -}}
{{- if eq $backend "mcp-api" -}}
{{- include "ebrain.componentName" (dict "root" $root "component" "mcp-api") -}}
{{- else if eq $backend "webhook-receiver" -}}
{{- include "ebrain.componentName" (dict "root" $root "component" "webhook-receiver") -}}
{{- else if eq $backend "admin-spa" -}}
{{- include "ebrain.componentName" (dict "root" $root "component" "admin-spa") -}}
{{- else -}}
{{- $backend -}}
{{- end -}}
{{- end -}}
