import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import CodeIcon from "@mui/icons-material/Code";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";

const emptyForm = {
  name: "",
  allowedOrigins: "",
  defaultPath: "/tickets",
  userId: "",
  enabled: true
};

const pathOptions = [
  "/tickets",
  "/connections",
  "/contacts",
  "/users",
  "/quickAnswers",
  "/settings",
  "/queues",
  "/tags",
  "/queue-integrations"
];

const EmbedSettings = () => {
  const [integrations, setIntegrations] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [integrationsResponse, usersResponse] = await Promise.all([
        api.get("/embed-integrations"),
        api.get("/embed-integrations/users")
      ]);
      setIntegrations(integrationsResponse.data);
      setUsers(usersResponse.data || []);
      setForm(current => ({
        ...current,
        userId: current.userId || String(usersResponse.data?.[0]?.id || "")
      }));
    } catch (error) {
      toastError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm, userId: String(users[0]?.id || "") });
  };

  const editIntegration = integration => {
    setEditingId(integration.id);
    setForm({
      name: integration.name,
      allowedOrigins: (integration.allowedOrigins || []).join("\n"),
      defaultPath: integration.defaultPath,
      userId: String(integration.userId),
      enabled: integration.enabled
    });
  };

  const save = async event => {
    event.preventDefault();
    const allowedOrigins = form.allowedOrigins
      .split(/[\n,]/)
      .map(value => value.trim())
      .filter(Boolean);
    if (!form.name.trim() || !form.userId || allowedOrigins.length === 0) {
      toast.error(i18n.t("settings.settings.embed.required"));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        userId: Number(form.userId),
        allowedOrigins
      };
      if (editingId) {
        await api.put(`/embed-integrations/${editingId}`, payload);
      } else {
        await api.post("/embed-integrations", payload);
      }
      toast.success(i18n.t("settings.settings.embed.saved"));
      resetForm();
      await loadData();
    } catch (error) {
      toastError(error);
    } finally {
      setSaving(false);
    }
  };

  const rotate = async id => {
    if (!window.confirm(i18n.t("settings.settings.embed.rotateConfirm"))) return;
    try {
      await api.post(`/embed-integrations/${id}/rotate`);
      toast.success(i18n.t("settings.settings.embed.rotated"));
      await loadData();
    } catch (error) {
      toastError(error);
    }
  };

  const remove = async id => {
    if (!window.confirm(i18n.t("settings.settings.embed.deleteConfirm"))) return;
    try {
      await api.delete(`/embed-integrations/${id}`);
      toast.success(i18n.t("settings.settings.embed.deleted"));
      if (editingId === id) resetForm();
      await loadData();
    } catch (error) {
      toastError(error);
    }
  };

  const copy = async value => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(i18n.t("settings.settings.embed.copied"));
    } catch (_error) {
      toast.error(i18n.t("settings.settings.embed.copyError"));
    }
  };

  return (
    <Box mt={3}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2.5 }}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <CodeIcon color="primary" />
          <Typography variant="h6">{i18n.t("settings.settings.embed.title")}</Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" mb={2}>
          {i18n.t("settings.settings.embed.description")}
        </Typography>

        <Box
          display="grid"
          gridTemplateColumns={{ xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) minmax(0, 1fr)" }}
          gap={{ xs: 3, lg: 4 }}
          alignItems="start"
          mt={3}
        >
          <Box component="form" onSubmit={save} display="grid" gap={2} minWidth={0}>
            <Typography variant="subtitle1" fontWeight={600}>
              {i18n.t(editingId ? "settings.settings.embed.editTitle" : "settings.settings.embed.createTitle")}
            </Typography>
            <TextField
              size="small"
              label={i18n.t("settings.settings.embed.name")}
              value={form.name}
              onChange={event => setForm({ ...form, name: event.target.value })}
              inputProps={{ maxLength: 120 }}
            />
            <TextField
              size="small"
              multiline
              minRows={3}
              label={i18n.t("settings.settings.embed.origins")}
              helperText={i18n.t("settings.settings.embed.originsHelp")}
              value={form.allowedOrigins}
              onChange={event => setForm({ ...form, allowedOrigins: event.target.value })}
            />
            <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={2}>
              <TextField
                select
                size="small"
                label={i18n.t("settings.settings.embed.user")}
                value={form.userId}
                onChange={event => setForm({ ...form, userId: event.target.value })}
              >
                {users.map(user => (
                  <MenuItem key={user.id} value={String(user.id)}>{user.name} ({user.email})</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label={i18n.t("settings.settings.embed.defaultPath")}
                value={form.defaultPath}
                onChange={event => setForm({ ...form, defaultPath: event.target.value })}
              >
                {pathOptions.map(path => <MenuItem key={path} value={path}>{path}</MenuItem>)}
              </TextField>
            </Box>
            <FormControlLabel
              control={(
                <Switch
                  checked={form.enabled}
                  onChange={event => setForm({ ...form, enabled: event.target.checked })}
                />
              )}
              label={i18n.t("settings.settings.embed.enabled")}
            />
            <Box display="flex" flexWrap="wrap" gap={1}>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? <CircularProgress size={20} /> : i18n.t(editingId ? "settings.settings.embed.update" : "settings.settings.embed.create")}
              </Button>
              {editingId && <Button onClick={resetForm}>{i18n.t("settings.settings.embed.cancel")}</Button>}
            </Box>
          </Box>

          <Box display="grid" gap={2} minWidth={0}>
            <Typography variant="subtitle1" fontWeight={600}>
              {i18n.t("settings.settings.embed.listTitle")}
            </Typography>
            {loading && <Box textAlign="center" py={4}><CircularProgress size={28} /></Box>}
            {!loading && integrations.length === 0 && (
              <Typography variant="body2" color="textSecondary">{i18n.t("settings.settings.embed.empty")}</Typography>
            )}
            {integrations.map(integration => {
              const iframeCode = `<iframe src="${integration.embedUrl}" width="100%" height="800" allow="clipboard-write" referrerpolicy="origin"></iframe>`;
              return (
                <Paper key={integration.id} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1}>
                    <Box minWidth={0}>
                      <Typography fontWeight={600} sx={{ overflowWrap: "anywhere" }}>{integration.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {integration.user?.name} · {integration.defaultPath}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      color={integration.enabled ? "success" : "default"}
                      label={i18n.t(integration.enabled ? "settings.settings.embed.active" : "settings.settings.embed.inactive")}
                    />
                  </Box>
                  <Box display="flex" flexWrap="wrap" gap={0.75} mb={1.5}>
                    {(integration.allowedOrigins || []).map(origin => (
                      <Chip
                        key={origin}
                        size="small"
                        label={origin}
                        sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }}
                      />
                    ))}
                  </Box>
                  <TextField fullWidth size="small" value={integration.embedUrl} InputProps={{ readOnly: true }} />
                  <Typography variant="caption" color="textSecondary" display="block" mt={0.75}>
                    {i18n.t("settings.settings.embed.dynamicHelp")}
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1} mt={1.5}>
                    <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => copy(integration.embedUrl)}>
                      {i18n.t("settings.settings.embed.copyUrl")}
                    </Button>
                    <Button size="small" startIcon={<CodeIcon />} onClick={() => copy(iframeCode)}>
                      {i18n.t("settings.settings.embed.copyCode")}
                    </Button>
                    <Button size="small" onClick={() => editIntegration(integration)}>
                      {i18n.t("settings.settings.embed.edit")}
                    </Button>
                    <Button size="small" startIcon={<RefreshIcon />} onClick={() => rotate(integration.id)}>
                      {i18n.t("settings.settings.embed.rotate")}
                    </Button>
                    <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => remove(integration.id)}>
                      {i18n.t("settings.settings.embed.delete")}
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default EmbedSettings;
