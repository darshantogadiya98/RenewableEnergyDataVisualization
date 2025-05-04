import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/users/login", { email, password });
      localStorage.setItem("access_token", res.data.access_token);
      nav("/");
    } catch {
      alert("Invalid creds");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={submit} className="p-8 bg-white shadow rounded w-96">
        <h1 className="text-2xl mb-4 font-semibold text-center">Login</h1>
        <input
          className="border p-2 w-full mb-3"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border p-2 w-full mb-3"
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2 rounded">
          Sign In
        </button>
      </form>
    </div>
  );
}
