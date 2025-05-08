("use client");

import { useMemo, useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Button,
  Stack,
  alpha,
  Avatar,
  Divider,
  Menu,
  MenuItem,
  LinearProgress,
  Drawer,
  CssBaseline,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  useMediaQuery,
  CircularProgress,
} from "@mui/material";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import StarIcon from "@mui/icons-material/Star";
import BoltIcon from "@mui/icons-material/Bolt";
import AddIcon from "@mui/icons-material/Add";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import DeleteIcon from "@mui/icons-material/Delete";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import {
  DatePicker,
  Modal as AntModal,
  Form,
  Select,
  InputNumber,
  Segmented,
  message,
  notification,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { Line } from "@ant-design/plots";
import { motion } from "framer-motion";

import { useAuth } from "../context/auth";
import { useEnergyData } from "../context/data";
import { useFavourites } from "../hooks/useFavourites";
import { useAlerts } from "../hooks/useAlerts";
import { useForecast } from "../hooks/useForecast";

/* day‑js helpers */
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

/* ---------- helpers ---------- */
interface Row {
  timestamp: string;
  metric: string;
  value: number;
}

const SERIES = [
  { n: "Solar", c: "#eab308", f: (r: any) => +r.solar_kwh },
  { n: "Wind", c: "#1d4ed8", f: (r: any) => +r.wind_kwh },
  { n: "Geothermal", c: "#7c2d12", f: (r: any) => +r.nuclear_kwh },
  { n: "Biomass", c: "#15803d", f: (r: any) => +r.biomass_kwh },
  { n: "Biogas", c: "#a16207", f: (r: any) => +r.oil_and_gas_kwh },
  { n: "Small hydro", c: "#0284c7", f: (r: any) => +r.hydroelectric_kwh },
  { n: "Demand", c: "#0f766e", f: (r: any) => +r.consumption_kwh, thick: true },
] as const;

export const METRICS = [
  { label: "Total Consumption", value: "consumption_kwh" },
  { label: "Total Production", value: "production_kwh" },
  { label: "Solar", value: "solar_kwh" },
  { label: "Wind", value: "wind_kwh" },
  { label: "Hydroelectric", value: "hydroelectric_kwh" },
  { label: "Nuclear", value: "nuclear_kwh" },
  { label: "Oil & Gas", value: "oil_and_gas_kwh" },
  { label: "Coal", value: "coal_kwh" },
  { label: "Biomass", value: "biomass_kwh" },
];

export default function DashboardPage() {
  /* hooks ------------------------------------------------------------- */
  const downSm = useMediaQuery("(max-width:600px)");
  const { user, logout } = useAuth();
  const { data: raw = [], isLoading } = useEnergyData();
  const {
    list: favList,
    isListLoading,
    isAdding,
    isRemoving,
    add: favAdd,
    del: favDel,
  } = useFavourites();
  const alert = useAlerts();

  /* date state -------------------------------------------------------- */
  const first = useMemo(() => dayjs(raw[0]?.timestamp) || dayjs(), [raw]);
  const last = useMemo(() => dayjs(raw.at(-1)?.timestamp) || dayjs(), [raw]);
  const [day, setDay] = useState<Dayjs>(last);

  /* hidden series + forecast metric ----------------------------------- */
  const [hidden, setHidden] = useState(new Set<string>());
  const fcMetric = "Total Consumption";

  /* UI drawers / modals ------------------------------------------------ */
  const [favOpen, setFavOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMode, setAlertMode] = useState<"create" | "view">("create");
  const [trigOpen, setTrigOpen] = useState(false);
  const [form] = Form.useForm();

  /* triggered‑alert state ------------------------------------------------ */
  const [trigIds, setTrigIds] = useState<Set<string>>(new Set());
  const [triggered, setTriggered] = useState<typeof alert.list.data>([]);

  /* rows for selected day ------------------------------------------------ */
  const rows: Row[] = useMemo(() => {
    if (!raw.length) return [];
    const [from, to] = [day.startOf("day"), day.endOf("day")];
    const out: Row[] = [];
    raw
      .filter((r) => {
        const t = dayjs(r.timestamp);
        return t.isSameOrAfter(from) && t.isSameOrBefore(to);
      })
      .forEach((r) => {
        const h = dayjs(r.timestamp).hour().toString();
        SERIES.forEach((s) =>
          out.push({ timestamp: h, metric: s.n, value: s.f(r) / 1000 })
        );
      });
    return out;
  }, [raw, day]);

  /* forecast rows --------------------------------------------------------- */
  const { data: fc = [] } = useForecast("Demand", 48, "prophet", !!rows.length);
  const fcRows: Row[] = fc.map(([t, v]) => ({
    timestamp: dayjs(t).hour().toString(),
    metric: `${fcMetric}-forecast`,
    value: Math.max(v / 1000, 0),
  }));

  /* ---------- favourites helpers ----------------------------------------- */
  const favSig = {
    day: day.format("YYYY-MM-DD"),
    hidden: [...hidden].sort(),
    fcMetric,
  };
  const currentFav = favList.find(
    (f) => JSON.stringify(f.config_json) === JSON.stringify(favSig)
  );

  const toggleFav = async () => {
    if (currentFav) {
      await favDel.mutateAsync(currentFav.id);
      notification.warning({
        message: "Favourite Removed",
        description: `Removed favourite for ${day.format("MM/DD/YYYY")}`,
      });
    } else {
      await favAdd.mutateAsync({
        name: `View ${day.format("MM/DD")}`,
        config_json: favSig,
      });
      notification.success({
        message: "Favourite Saved",
        description: `Saved favourite for ${day.format("MM/DD/YYYY")}`,
      });
    }
  };

  // show a “Favourites Updated” toast when the list changes ------------------
  useEffect(() => {
    if (!isListLoading) {
      notification.info({
        message: "Favourites Updated",
        description: `You now have ${favList.length} favourite${
          favList.length !== 1 ? "s" : ""
        }.`,
      });
    }
  }, [favList, isListLoading]);

  /* ---------- alert helpers ---------------------------------------------- */
  const submitAlert = async (values: {
    metric: string;
    direction: "above" | "below";
    threshold: number;
  }) => {
    await alert.add.mutateAsync(values);
    message.success("Alert saved");
    setAlertOpen(false);
  };

  const removeAlert = async (id: string) => {
    await alert.del.mutateAsync(id);
  };

  useEffect(() => {
    if (!alert.list.data || !raw.length) return;
    const latest = raw.at(-1)!;
    alert.list.data.forEach((a) => {
      if (trigIds.has(a.id)) return;
      const curr = Number((latest as any)[a.metric]);
      const hit =
        (a.direction === "above" && curr > a.threshold) ||
        (a.direction === "below" && curr < a.threshold);
      if (hit) {
        notification.warning({
          message: `⚡ ${a.metric}`,
          description: `${curr.toFixed(0)} kWh (${a.direction} ${a.threshold})`,
        });
        setTrigIds((s) => new Set(s).add(a.id));
        setTriggered((t) => [...t, a]);
      }
    });
  }, [raw, alert.list.data, trigIds]);

  /* load favourite --------------------------------------------------------- */
  const loadFavourite = (f: any) => {
    setDay(dayjs(f.config_json.day));
    setHidden(new Set(f.config_json.hidden));
    setFavOpen(false);
    message.success(`Loaded “${f.name}”`);
  };

  /* chart configuration --------------------------------------------------- */
  const cfg = {
    data: [...rows.filter((r) => !hidden.has(r.metric)), ...fcRows],
    xField: "timestamp",
    yField: "value",
    tooltip: {
      shared: true,
      showCrosshairs: true,
      title: (hour: string) => {
        const h = parseInt(hour, 10);
        const hh = h % 12 === 0 ? 12 : h % 12;
        const ampm = h < 12 ? "AM" : "PM";
        return `${day.format("MMM D, YYYY")} ${hh}:00 ${ampm}`;
      },
      formatter: (datum: any) => ({
        name: datum.metric,
        value: `${datum.value} MW`,
      }),
    },
    seriesField: "metric",
    smooth: (d: Row) => !d.metric.endsWith("forecast"),
    height: downSm ? 260 : 420,
    color: (r: Row) =>
      r.metric.endsWith("forecast")
        ? "#9ca3af"
        : SERIES.find((s) => s.n === r.metric)!.c,
    lineStyle: (r: Row) =>
      r.metric.endsWith("forecast")
        ? { lineDash: [6, 4] }
        : { lineWidth: SERIES.find((s) => s.n === r.metric)?.thick ? 3 : 1.2 },
    xAxis: {
      tickCount: 24,
      title: { text: "Hours", style: { fill: "#fff" } },
      grid: { line: { style: { stroke: "#555", lineWidth: 0.4 } } },
    },
    yAxis: {
      title: { text: "MW", style: { fill: "#fff" } },
      grid: { line: { style: { stroke: "#555", lineWidth: 0.4 } } },
    },
    legend: false,
    padding: [10, 40, 50, 50],
    theme: { styleSheet: { fontFamily: "Inter" } },
  } as const;

  return (
    <Box
      sx={{
        height: "100svh",
        bgcolor: "#0d0d0d",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CssBaseline />
      <AppBar
        elevation={0}
        sx={{ bgcolor: "rgba(20,20,20,.65)", backdropFilter: "blur(6px)" }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            Renewable Energy Dashboard
          </Typography>

          {/* Date picker */}
          <Button
            variant="contained"
            size="small"
            sx={{ borderRadius: 8, textTransform: "none" }}
          >
            <DatePicker
              value={day}
              format="YYYY/MM/DD"
              inputReadOnly
              allowClear={false}
              disabledDate={(d) => d.isBefore(first) || d.isAfter(last)}
              onChange={(d) => d && setDay(d.startOf("day"))}
              popupClassName="dark-datepicker-dropdown"
              suffixIcon={
                <CalendarTodayIcon sx={{ color: "black", fontSize: 16 }} />
              }
              style={{ background: "transparent", border: 0 }}
            />
          </Button>

          {/* Favourite toggle */}
          <Tooltip title={currentFav ? "Remove favourite" : "Save favourite"}>
            <Button
              size="small"
              startIcon={
                currentFav ? <StarIcon color="warning" /> : <StarOutlineIcon />
              }
              onClick={toggleFav}
              disabled={isAdding || isRemoving}
              sx={{ color: "#fff", textTransform: "none" }}
            >
              {currentFav ? "Unfavourite" : "Favourite"}
            </Button>
          </Tooltip>

          {/* Favourites drawer button */}
          <Tooltip title="Your favourites">
            <span>
              <Button
                size="small"
                startIcon={<AddIcon />}
                disabled={!favList.length}
                onClick={() => setFavOpen(true)}
                sx={{ ml: 1, color: "#fff", textTransform: "none" }}
              >{`Favourites (${favList.length})`}</Button>
            </span>
          </Tooltip>

          {/* Alerts */}
          <Tooltip title="Create alert">
            <Button
              size="small"
              startIcon={<BoltIcon color="warning" />}
              onClick={() => {
                setAlertMode("create");
                setAlertOpen(true);
              }}
              sx={{ ml: 1, color: "#fff", textTransform: "none" }}
            >
              New Alert
            </Button>
          </Tooltip>

          <Tooltip title="Triggered alerts">
            <Button
              size="small"
              startIcon={
                <BoltIcon color={triggered.length ? "error" : "inherit"} />
              }
              onClick={() => setTrigOpen(true)}
              sx={{
                ml: 1,
                color: triggered.length ? "error.main" : "#fff",
                textTransform: "none",
              }}
            >
              {triggered.length ? `${triggered.length} Alerts` : "Alerts"}
            </Button>
          </Tooltip>

          <Box flexGrow={1} />
          <UserMenu user={user!} onLogout={logout} />
        </Toolbar>
      </AppBar>

      {/* Favourites drawer */}
      <Drawer
        anchor="left"
        open={favOpen}
        onClose={() => setFavOpen(false)}
        PaperProps={{ sx: { width: 340, bgcolor: "#1a1a1a" } }}
      >
        <Box sx={{ p: 2, borderBottom: "1px solid #333" }}>
          <Typography variant="h6">Your Favourites</Typography>
        </Box>
        {(isListLoading || isAdding || isRemoving) && <LinearProgress />}
        <List dense>
          {favList.map((f) => (
            <ListItem
              key={f.id}
              button
              sx={{ "&:hover": { bgcolor: "#252525" } }}
              onClick={() => loadFavourite(f)}
            >
              <ListItemText
                primary={f.name}
                secondary={dayjs(f.config_json.day).format("MMM D, YYYY")}
                primaryTypographyProps={{ sx: { color: "#fff" } }}
                secondaryTypographyProps={{ sx: { color: "#bbb" } }}
              />
              <ListItemSecondaryAction>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    favDel.mutateAsync(f.id);
                  }}
                >
                  <DeleteIcon sx={{ color: "#f44336" }} />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Triggered alerts drawer */}
      <Drawer
        anchor="right"
        open={trigOpen}
        onClose={() => setTrigOpen(false)}
        PaperProps={{ sx: { width: 320, bgcolor: "#1a1a1a" } }}
      >
        <Box sx={{ p: 2, borderBottom: "1px solid #333" }}>
          <Typography variant="h6">Triggered Alerts</Typography>
        </Box>
        <List dense>
          {triggered.map((a) => (
            <ListItem key={a.id}>
              <ListItemText
                primary={a.metric}
                secondary={`${a.direction.toUpperCase()} ${a.threshold} MW`}
                primaryTypographyProps={{ sx: { color: "#fff" } }}
                secondaryTypographyProps={{ sx: { color: "#bbb" } }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Chart area */}
      <Box
        sx={{ flex: 1, mt: 9, p: { xs: 1, sm: 2, md: 3 }, overflow: "auto" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Paper
            elevation={4}
            sx={{
              bgcolor: "rgba(30,30,30,.6)",
              backdropFilter: "blur(4px)",
              borderRadius: 4,
              p: { xs: 2, sm: 3 },
            }}
          >
            {isLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
                <Button
                  size="small"
                  variant="contained"
                  disabled
                  startIcon={<CircularProgress size={16} color="inherit" />}
                >
                  Loading Renewable Energy Data…
                </Button>
              </Box>
            ) : rows.length ? (
              <Line {...cfg} />
            ) : (
              <Box textAlign="center" mt={8}>
                <CalendarTodayIcon
                  fontSize="large"
                  color="disabled"
                  sx={{ mb: 1 }}
                />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Data Available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please select a date between{" "}
                  <strong>{first.format("MM/DD/YYYY")}</strong> and{" "}
                  <strong>{last.format("MM/DD/YYYY")}</strong>.
                </Typography>
              </Box>
            )}
            <Stack
              direction="row"
              justifyContent="center"
              flexWrap="wrap"
              spacing={1.5}
              mt={3}
            >
              {SERIES.map((s) => (
                <Button
                  key={s.n}
                  size="small"
                  onClick={() =>
                    setHidden((h) => {
                      const n = new Set(h);
                      n.has(s.n) ? n.delete(s.n) : n.add(s.n);
                      return n;
                    })
                  }
                  sx={{
                    color: hidden.has(s.n) ? alpha(s.c, 0.3) : s.c,
                    textTransform: "none",
                  }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: s.c,
                      mr: 1,
                    }}
                  />
                  {s.n}
                </Button>
              ))}
            </Stack>
          </Paper>
        </motion.div>
      </Box>

      {/* Alerts modal */}
      <AlertModal
        open={alertOpen}
        mode={alertMode}
        onClose={() => setAlertOpen(false)}
        setMode={setAlertMode}
        form={form}
        hooks={alert}
        onCreate={submitAlert}
        onDelete={removeAlert}
      />
    </Box>
  );
}

/* ---------- Alerts modal component ---------------------------------- */
function AlertModal({
  open,
  mode,
  setMode,
  onClose,
  form,
  hooks,
  onCreate,
  onDelete,
}) {
  const downSm = useMediaQuery("(max-width:600px)");
  return (
    <AntModal
      open={open}
      centered
      closable={false}
      width={downSm ? 340 : 420}
      bodyStyle={{ padding: 0, background: "#1f1f1f" }}
      style={{ borderRadius: 12, overflow: "hidden" }}
      okText="Save"
      cancelText="Close"
      onCancel={onClose}
      onOk={() => mode === "create" && form.submit()}
      confirmLoading={hooks.add.isLoading}
      footer={mode === "create" ? undefined : null}
    >
      <Box sx={{ p: 2, bgcolor: "#141414" }}>
        <Segmented
          block
          options={[
            { label: "Create", value: "create" },
            { label: "View", value: "view" },
          ]}
          value={mode}
          onChange={(v) => setMode(v as any)}
        />
      </Box>
      {mode === "create" ? (
        <Box sx={{ p: 3 }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onCreate}
            initialValues={{ direction: "above", threshold: 0 }}
          >
            <Form.Item
              name="metric"
              label={<span style={{ color: "#ccc" }}>Metric</span>}
              rules={[{ required: true }]}
            >
              <Select
                options={METRICS}
                dropdownStyle={{ background: "#1f1f1f" }}
              />
            </Form.Item>
            <Form.Item
              name="direction"
              label={<span style={{ color: "#ccc" }}>When value is</span>}
              rules={[{ required: true }]}
            >
              <Select
                dropdownStyle={{ background: "#1f1f1f" }}
                options={[
                  { value: "above", label: "Above" },
                  { value: "below", label: "Below" },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="threshold"
              label={<span style={{ color: "#ccc" }}>Threshold (MW)</span>}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} step={10} style={{ width: "100%" }} />
            </Form.Item>
          </Form>
        </Box>
      ) : (
        <Box
          sx={{ position: "relative", maxHeight: "60vh", overflowY: "auto" }}
        >
          {(hooks.list.isLoading || hooks.del.isLoading) && (
            <LinearProgress
              sx={{ position: "absolute", top: 0, left: 0, width: "100%" }}
            />
          )}
          <List dense>
            {hooks.list.data?.map((a) => (
              <ListItem
                key={a.id}
                sx={{ bgcolor: "#2a2a2a", borderRadius: 1, my: 1, px: 2 }}
                secondaryAction={
                  <IconButton edge="end" onClick={() => onDelete(a.id)}>
                    <DeleteIcon sx={{ color: "#f44336" }} />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={a.metric}
                  secondary={`${a.direction.toUpperCase()} ${a.threshold} MW`}
                  primaryTypographyProps={{ sx: { color: "#fff" } }}
                  secondaryTypographyProps={{ sx: { color: "#bbb" } }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </AntModal>
  );
}

/* ---------- User menu ----------------------------------------------- */
function UserMenu({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [anc, setAnc] = useState<null | HTMLElement>(null);
  return (
    <>
      <IconButton onClick={(e) => setAnc(e.currentTarget)} size="small">
        <Avatar sx={{ width: 28, height: 28, bgcolor: alpha("#fff", 0.15) }}>
          <PersonIcon fontSize="small" />
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anc}
        open={!!anc}
        onClose={() => setAnc(null)}
        PaperProps={{
          sx: { bgcolor: "#1f1f1f", color: "#fff", p: 2, borderRadius: 2 },
        }}
      >
        <Typography fontWeight={600}>{user.full_name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {user.email}
        </Typography>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={onLogout}>
          <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Logout
        </MenuItem>
      </Menu>
    </>
  );
}
