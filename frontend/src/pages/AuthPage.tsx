// ─── src/pages/AuthPage.tsx ────────────────────────────────────────────────
"use client";

import { Form, Input, Button, Card, Typography, message } from "antd";
import { MailOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth";
import { useState } from "react";

const { Title, Text, Link } = Typography;

export default function AuthPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();

  const mode: "login" | "register" = pathname.includes("register")
    ? "register"
    : "login";

  const [loading, setLoading] = useState(false);

  async function onFinish(values: any) {
    setLoading(true);
    try {
      if (mode === "register") {
        await register(values.email, values.full_name, values.password);
        await login(values.email, values.password);
      } else {
        await login(values.email, values.password);
      }
      nav("/dashboard", { replace: true });
    } catch (err: any) {
      message.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex items-center justify-center min-h-[calc(100svh)] 
                 bg-gradient-to-br from-slate-900 via-gray-900 to-gray-950 p-4"
    >
      <Card
        style={{ width: 380, background: "rgba(31,31,31,.60)", border: "none" }}
        styles={{ body: { padding: 32 } }}
        className="backdrop-blur-md shadow-2xl ring-1 ring-white/10"
      >
        <Title
          level={3}
          style={{ textAlign: "center", color: "white", marginBottom: 24 }}
        >
          {mode === "login" ? "Sign in" : "Create account"}
        </Title>

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input
              size="large"
              prefix={<MailOutlined style={{ color: "#aaa" }} />}
              placeholder="Email"
            />
          </Form.Item>

          {mode === "register" && (
            <Form.Item
              name="full_name"
              rules={[{ required: true, message: "Full name is required" }]}
            >
              <Input
                size="large"
                prefix={<UserOutlined style={{ color: "#aaa" }} />}
                placeholder="Full name"
              />
            </Form.Item>
          )}

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined style={{ color: "#aaa" }} />}
              placeholder="Password"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
          >
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </Form>

        <Text style={{ display: "block", marginTop: 24, textAlign: "center" }}>
          {mode === "login" ? "No account yet? " : "Already have an account? "}
          <Link
            style={{ color: "#3b82f6" }}
            onClick={() =>
              nav(mode === "login" ? "/register" : "/login", { replace: true })
            }
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </Link>
        </Text>
      </Card>
    </div>
  );
}
