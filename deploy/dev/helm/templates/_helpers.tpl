{{- define "ebrain.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "ebrain.labels" -}}
app.kubernetes.io/name: {{ include "ebrain.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "ebrain.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ebrain.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: mcp-api
{{- end -}}
